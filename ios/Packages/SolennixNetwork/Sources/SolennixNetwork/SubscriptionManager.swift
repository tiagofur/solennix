import Foundation
import Observation
import RevenueCat
import SolennixCore
import StoreKit
import UIKit

// MARK: - Subscription Error

/// Errores que pueden ocurrir durante operaciones de suscripcion.
public enum SubscriptionError: LocalizedError, Sendable {
    case productsNotFound
    case purchaseFailed(String)
    case verificationFailed
    case userCancelled
    case pending
    case unknown

    public var errorDescription: String? {
        switch self {
        case .productsNotFound:
            return "No se pudieron cargar los productos. Intenta de nuevo mas tarde."
        case .purchaseFailed(let message):
            return "Error al procesar la compra: \(message)"
        case .verificationFailed:
            return "No se pudo verificar la transaccion. Contacta soporte si el problema persiste."
        case .userCancelled:
            return "La compra fue cancelada."
        case .pending:
            return "La compra esta pendiente de aprobacion."
        case .unknown:
            return "Ocurrio un error desconocido con la suscripcion."
        }
    }
}

// MARK: - Subscription Manager

/// Administra las suscripciones de la app usando RevenueCat.
///
/// RevenueCat unifica Apple/Google purchases y se sincroniza con el backend
/// via webhooks. El backend es la fuente de verdad del plan del usuario.
/// Inyectar via `@Environment(SubscriptionManager.self)`.
@Observable
public final class SubscriptionManager {

    // MARK: - Constants

    /// RevenueCat entitlement identifier for pro access.
    private static let proEntitlementID = "pro_access"

    // MARK: - Properties

    /// Indica si el usuario tiene una suscripcion premium activa
    /// (via RevenueCat entitlement o plan del backend).
    public private(set) var isPremium: Bool = false

    /// Offerings actuales de RevenueCat (contiene packages con precios).
    public private(set) var currentOffering: RevenueCat.Offering?

    /// Customer info de RevenueCat.
    public private(set) var customerInfo: RevenueCat.CustomerInfo?

    /// Indica si se estan cargando los offerings.
    public private(set) var isLoading: Bool = false

    /// Indica si se esta procesando una compra.
    public private(set) var isPurchasing: Bool = false

    /// Backend subscription status (includes provider info).
    public private(set) var subscriptionStatus: SubscriptionStatusResponse?

    /// Error mas reciente para mostrar al usuario.
    public var errorMessage: String?
    public private(set) var isConfigured: Bool = false

    // MARK: - Computed Properties

    /// Obtiene el package mensual del offering actual.
    public var monthlyPackage: RevenueCat.Package? {
        currentOffering?.monthly
    }

    /// Obtiene el package anual del offering actual.
    public var yearlyPackage: RevenueCat.Package? {
        currentOffering?.annual
    }

    // MARK: - Init

    public init() {}

    // MARK: - Configure

    /// Configura RevenueCat SDK. Debe llamarse una vez al inicio de la app.
    public func configure(apiKey: String) {
        let normalizedKey = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedKey.isEmpty else {
            isConfigured = false
            errorMessage = "Suscripciones no disponibles: falta la configuración de RevenueCat."
            return
        }

        Purchases.logLevel = .warn
        Purchases.configure(withAPIKey: normalizedKey)
        isConfigured = true
        errorMessage = nil
    }

    // MARK: - Login / Logout

    /// Identifica al usuario en RevenueCat usando su UUID del backend.
    /// Esto sincroniza cualquier receipt existente con el usuario correcto.
    @MainActor
    public func login(userID: String) async {
        guard isConfigured else { return }
        do {
            let (customerInfo, _) = try await Purchases.shared.logIn(userID)
            self.customerInfo = customerInfo
            updatePremiumStatus(from: customerInfo)

            // Sync existing purchases from StoreKit (migration from direct StoreKit 2)
            try? await Purchases.shared.syncPurchases()
        } catch {
            // Non-fatal: user can still use the app, premium status from backend
        }
    }

    /// Desloguea al usuario de RevenueCat.
    @MainActor
    public func logout() async {
        guard isConfigured else { return }
        do {
            let customerInfo = try await Purchases.shared.logOut()
            self.customerInfo = customerInfo
            isPremium = false
        } catch {
            // Non-fatal
        }
    }

    // MARK: - Load Offerings

    /// Carga los offerings (productos con precios) desde RevenueCat.
    @MainActor
    public func loadOfferings() async {
        guard isConfigured else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let offerings = try await Purchases.shared.offerings()
            currentOffering = offerings.current
        } catch {
            errorMessage = "No se pudieron cargar los planes. Verifica tu conexion e intenta de nuevo."
        }
    }

    // MARK: - Purchase

    /// Inicia la compra de un package de RevenueCat.
    /// - Parameter package: El package a comprar (monthly o annual).
    /// - Throws: `SubscriptionError` si la compra falla.
    @MainActor
    public func purchase(_ package: RevenueCat.Package) async throws {
        guard isConfigured else {
            throw SubscriptionError.purchaseFailed("RevenueCat no esta configurado.")
        }
        isPurchasing = true
        defer { isPurchasing = false }

        do {
            let result = try await Purchases.shared.purchase(package: package)

            if result.userCancelled {
                throw SubscriptionError.userCancelled
            }

            customerInfo = result.customerInfo
            updatePremiumStatus(from: result.customerInfo)

        } catch let error as SubscriptionError {
            if case .userCancelled = error {
                throw error
            }
            errorMessage = error.localizedDescription
            throw error
        } catch {
            if (error as NSError).code == 1 { // User cancelled in RevenueCat
                throw SubscriptionError.userCancelled
            }
            let subError = SubscriptionError.purchaseFailed(error.localizedDescription)
            errorMessage = subError.localizedDescription
            throw subError
        }
    }

    // MARK: - Restore Purchases

    /// Restaura compras anteriores del usuario via RevenueCat.
    @MainActor
    public func restorePurchases() async {
        guard isConfigured else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let customerInfo = try await Purchases.shared.restorePurchases()
            self.customerInfo = customerInfo
            updatePremiumStatus(from: customerInfo)
        } catch {
            errorMessage = "No se pudieron restaurar las compras. Intenta de nuevo."
        }
    }

    // MARK: - Check Entitlement Status

    /// Actualiza el estado de suscripcion consultando RevenueCat.
    @MainActor
    public func checkEntitlementStatus() async {
        guard isConfigured else { return }
        do {
            let customerInfo = try await Purchases.shared.customerInfo()
            self.customerInfo = customerInfo
            updatePremiumStatus(from: customerInfo)
        } catch {
            // Non-fatal: rely on backend plan status
        }
    }

    // MARK: - Manage Subscription

    /// Abre la pagina de administracion de suscripciones del App Store.
    @MainActor
    public func openSubscriptionManagement() async {
        guard let windowScene = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .first else { return }

        do {
            try await AppStore.showManageSubscriptions(in: windowScene)
        } catch {
            errorMessage = "No se pudo abrir la administracion de suscripciones."
        }
    }

    // MARK: - Backend Subscription Status

    /// Fetches subscription status from backend to get provider info.
    @MainActor
    public func fetchBackendStatus(apiClient: APIClient) async {
        do {
            let response: SubscriptionStatusResponse = try await apiClient.get(Endpoint.subscriptionStatus)
            subscriptionStatus = response
        } catch {
            // Non-fatal: provider info is informational
        }
    }

    // MARK: - Helpers

    /// Actualiza `isPremium` basado en el CustomerInfo de RevenueCat.
    private func updatePremiumStatus(from customerInfo: RevenueCat.CustomerInfo) {
        isPremium = customerInfo.entitlements[Self.proEntitlementID]?.isActive == true
    }

    /// Permite al parent (que conoce user.plan del backend) forzar premium status.
    /// Usado cuando el backend confirma pro pero RevenueCat aun no lo refleja
    /// (ej. compra via Stripe web).
    @MainActor
    public func setBackendPremiumStatus(_ isPro: Bool) {
        if isPro && !isPremium {
            isPremium = true
        }
    }
}
