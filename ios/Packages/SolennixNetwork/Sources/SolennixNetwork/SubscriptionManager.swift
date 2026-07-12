import Foundation
import Observation
import RevenueCat
import SolennixCore
import StoreKit
// UIKit is imported only for `UIApplication.shared.connectedScenes` →
// `UIWindowScene`, which `AppStore.showManageSubscriptions(in:)` (StoreKit)
// mandates as its presentation anchor. This is an unavoidable framework
// frontier for the manage-subscription flow, not UI logic leaking into the
// network layer. (#757)
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
            return NetL10n.text("subscription.error.products_not_found", "Couldn't load the products. Try again later.")
        case .purchaseFailed(let message):
            return NetL10n.format("subscription.error.purchase_failed_fmt", "Error processing the purchase: %@", message)
        case .verificationFailed:
            return NetL10n.text("subscription.error.verification_failed", "Couldn't verify the transaction. Contact support if the problem persists.")
        case .userCancelled:
            return NetL10n.text("subscription.error.user_cancelled", "The purchase was cancelled.")
        case .pending:
            return NetL10n.text("subscription.error.pending", "The purchase is pending approval.")
        case .unknown:
            return NetL10n.text("subscription.error.unknown", "An unknown error occurred with the subscription.")
        }
    }
}

// MARK: - Subscription Delegate

/// Delegate to report subscription-related events and errors to the app layer.
public protocol SubscriptionDelegate: AnyObject, Sendable {
    func subscriptionManager(_ manager: SubscriptionManager, didFailVerificationFor productId: String, transactionId: UInt64)
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

    /// Delegate to report subscription-related errors/verification failures to Sentry/logs.
    public weak var delegate: SubscriptionDelegate?

    /// Task listening to background transaction updates.
    private var updatesTask: Task<Void, Never>?

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

    public init() {
        updatesTask = Task { [weak self] in
            for await verificationResult in Transaction.updates {
                guard let self = self else { break }
                await self.handleTransactionUpdate(verificationResult)
            }
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    // MARK: - Configure

    /// Configura RevenueCat SDK. Debe llamarse una vez al inicio de la app.
    public func configure(apiKey: String) {
        let normalizedKey = apiKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !normalizedKey.isEmpty else {
            isConfigured = false
            errorMessage = NetL10n.text("subscription.error.not_configured", "Subscriptions unavailable: RevenueCat configuration is missing.")
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
            _ = try? await Purchases.shared.syncPurchases()
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

    /// StoreKit products loaded directly as fallback.
    public private(set) var storeProducts: [StoreKit.Product] = []

    /// Product IDs for direct StoreKit fallback.
    private static let productIDs: Set<String> = [
        "solennix_premium_monthly",
        "solennix_premium_yearly"
    ]

    /// Fallback monthly StoreKit product when RevenueCat offerings unavailable.
    public var fallbackMonthlyProduct: StoreKit.Product? {
        storeProducts.first { $0.id == "solennix_premium_monthly" }
    }

    /// Fallback yearly StoreKit product when RevenueCat offerings unavailable.
    public var fallbackYearlyProduct: StoreKit.Product? {
        storeProducts.first { $0.id == "solennix_premium_yearly" }
    }

    /// Whether subscription products are available (from RevenueCat or StoreKit).
    public var hasProducts: Bool {
        currentOffering != nil || !storeProducts.isEmpty
    }

    // MARK: - Load Offerings

    /// Carga los offerings (productos con precios) desde RevenueCat.
    /// Si RevenueCat falla, intenta cargar productos directamente via StoreKit.
    @MainActor
    public func loadOfferings() async {
        guard isConfigured else {
            // Even without RevenueCat, try StoreKit directly
            await loadStoreKitProducts()
            return
        }
        isLoading = true
        defer { isLoading = false }

        // Retry up to 3 times for RevenueCat
        for attempt in 1...3 {
            do {
                let offerings = try await Purchases.shared.offerings()
                if let current = offerings.current {
                    currentOffering = current
                    errorMessage = nil
                    return
                }
            } catch {
                if attempt == 3 {
                    errorMessage = NetL10n.text("subscription.error.load_offerings", "Couldn't load plans from RevenueCat.")
                }
            }
            // Brief delay before retry
            _ = try? await Task.sleep(nanoseconds: UInt64(attempt) * 500_000_000)
        }

        // Fallback: load products directly from StoreKit
        await loadStoreKitProducts()
    }

    /// Loads products directly from StoreKit as a fallback when RevenueCat offerings fail.
    @MainActor
    private func loadStoreKitProducts() async {
        do {
            let products = try await StoreKit.Product.products(for: Self.productIDs)
            storeProducts = products.sorted { $0.price < $1.price }
            if !products.isEmpty {
                errorMessage = nil
            }
        } catch {
            // StoreKit also failed - this is a real connectivity/config issue
            if currentOffering == nil && storeProducts.isEmpty {
                errorMessage = NetL10n.text("subscription.error.load_plans", "Couldn't load the plans. Check your connection and try again.")
            }
        }
    }

    // MARK: - Purchase

    /// Inicia la compra de un package de RevenueCat.
    /// - Parameter package: El package a comprar (monthly o annual).
    /// - Throws: `SubscriptionError` si la compra falla.
    @MainActor
    public func purchase(_ package: RevenueCat.Package) async throws {
        guard isConfigured else {
            throw SubscriptionError.purchaseFailed(NetL10n.text("subscription.error.not_configured", "Subscriptions unavailable: RevenueCat configuration is missing."))
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

    // MARK: - Purchase StoreKit Product (Fallback)

    /// Purchases a StoreKit product directly when RevenueCat offerings are unavailable.
    /// After purchase, syncs with RevenueCat so the backend is notified via webhook.
    @MainActor
    public func purchaseStoreKitProduct(_ product: StoreKit.Product) async throws {
        isPurchasing = true
        defer { isPurchasing = false }

        do {
            let result = try await product.purchase()

            switch result {
            case .success(let verification):
                switch verification {
                case .verified(let transaction):
                    await transaction.finish()
                    // Sync purchase with RevenueCat so backend gets notified
                    if isConfigured {
                        _ = try? await Purchases.shared.syncPurchases()
                        await checkEntitlementStatus()
                    } else {
                        await refreshLocalStoreKitEntitlements()
                    }
                case .unverified(let transaction, _):
                    delegate?.subscriptionManager(
                        self,
                        didFailVerificationFor: transaction.productID,
                        transactionId: transaction.id
                    )
                    throw SubscriptionError.verificationFailed
                }
            case .userCancelled:
                throw SubscriptionError.userCancelled
            case .pending:
                throw SubscriptionError.pending
            @unknown default:
                throw SubscriptionError.unknown
            }
        } catch let error as SubscriptionError {
            throw error
        } catch {
            throw SubscriptionError.purchaseFailed(error.localizedDescription)
        }
    }

    // MARK: - Restore Purchases

    /// Restaura compras anteriores del usuario via RevenueCat o StoreKit directamente.
    @MainActor
    public func restorePurchases() async {
        isLoading = true
        defer { isLoading = false }

        guard isConfigured else {
            do {
                try await AppStore.sync()
                await refreshLocalStoreKitEntitlements()
            } catch {
                errorMessage = NetL10n.text("subscription.error.restore_failed", "Couldn't restore purchases. Try again.")
            }
            return
        }

        do {
            let customerInfo = try await Purchases.shared.restorePurchases()
            self.customerInfo = customerInfo
            updatePremiumStatus(from: customerInfo)
        } catch {
            errorMessage = "No se pudieron restaurar las compras. Intenta de nuevo."
        }
    }

    // MARK: - Check Entitlement Status

    /// Actualiza el estado de suscripcion consultando RevenueCat o StoreKit directamente.
    @MainActor
    public func checkEntitlementStatus() async {
        guard isConfigured else {
            await refreshLocalStoreKitEntitlements()
            return
        }
        do {
            let customerInfo = try await Purchases.shared.customerInfo()
            self.customerInfo = customerInfo
            updatePremiumStatus(from: customerInfo)
        } catch {
            // Non-fatal: rely on backend plan status
        }
    }

    // MARK: - StoreKit 2 Direct Verification & Entitlements

    @MainActor
    private func handleTransactionUpdate(_ verificationResult: StoreKit.VerificationResult<Transaction>) async {
        switch verificationResult {
        case .verified(let transaction):
            await transaction.finish()
            if isConfigured {
                _ = try? await Purchases.shared.syncPurchases()
                await checkEntitlementStatus()
            } else {
                await refreshLocalStoreKitEntitlements()
            }
        case .unverified(let transaction, _):
            // StoreKit verification failed (cryptographic verification failure)
            delegate?.subscriptionManager(
                self,
                didFailVerificationFor: transaction.productID,
                transactionId: transaction.id
            )
        }
    }

    @MainActor
    private func refreshLocalStoreKitEntitlements() async {
        var hasActivePremium = false
        for await verificationResult in Transaction.currentEntitlements {
            switch verificationResult {
            case .verified(let transaction):
                if Self.productIDs.contains(transaction.productID) {
                    if let expirationDate = transaction.expirationDate {
                        if expirationDate > Date() {
                            hasActivePremium = true
                        }
                    } else {
                        hasActivePremium = true
                    }
                }
            case .unverified(let transaction, _):
                delegate?.subscriptionManager(
                    self,
                    didFailVerificationFor: transaction.productID,
                    transactionId: transaction.id
                )
            }
        }
        isPremium = hasActivePremium
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
            errorMessage = NetL10n.text("subscription.error.manage_failed", "Couldn't open subscription management.")
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
