import Foundation
import Observation
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

/// Administra las suscripciones de la app usando StoreKit 2.
///
/// Carga productos, maneja compras, verifica transacciones y
/// escucha actualizaciones de transacciones en segundo plano.
/// Inyectar via `@Environment(SubscriptionManager.self)`.
@Observable
public final class SubscriptionManager {

    // MARK: - Product IDs

    /// Identificadores de productos de StoreKit.
    public enum ProductID {
        public static let monthlyPremium = "com.solennix.premium.monthly"
        public static let yearlyPremium = "com.solennix.premium.yearly"

        static let all: [String] = [monthlyPremium, yearlyPremium]
    }

    // MARK: - Properties

    /// Productos disponibles cargados de StoreKit.
    public private(set) var products: [Product] = []

    /// Indica si el usuario tiene una suscripcion premium activa.
    public private(set) var isPremium: Bool = false

    /// La suscripcion activa actual, si existe.
    public private(set) var currentSubscription: Product.SubscriptionInfo.Status?

    /// Indica si se estan cargando los productos.
    public private(set) var isLoading: Bool = false

    /// Indica si se esta procesando una compra.
    public private(set) var isPurchasing: Bool = false

    /// Error mas reciente para mostrar al usuario.
    public var errorMessage: String?

    /// Tarea de escucha de actualizaciones de transacciones.
    private var transactionListenerTask: Task<Void, Never>?

    // MARK: - Init

    public init() {}

    deinit {
        transactionListenerTask?.cancel()
    }

    // MARK: - Cargar Productos

    /// Carga los productos de suscripcion desde StoreKit.
    @MainActor
    public func loadProducts() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let storeProducts = try await Product.products(for: ProductID.all)
            // Ordenar: mensual primero, anual despues
            products = storeProducts.sorted { product1, _ in
                product1.id == ProductID.monthlyPremium
            }
        } catch {
            errorMessage = "No se pudieron cargar los planes. Verifica tu conexion e intenta de nuevo."
        }
    }

    // MARK: - Comprar Producto

    /// Inicia la compra de un producto de suscripcion.
    /// - Parameter product: El producto a comprar.
    /// - Throws: `SubscriptionError` si la compra falla.
    @MainActor
    public func purchase(_ product: Product) async throws {
        isPurchasing = true
        defer { isPurchasing = false }

        do {
            let result = try await product.purchase()

            switch result {
            case .success(let verification):
                let transaction = try checkVerification(verification)
                await transaction.finish()
                await updateSubscriptionStatus()
                await syncWithRevenueCat()

            case .userCancelled:
                throw SubscriptionError.userCancelled

            case .pending:
                throw SubscriptionError.pending

            @unknown default:
                throw SubscriptionError.unknown
            }
        } catch let error as SubscriptionError {
            if case .userCancelled = error {
                // No mostrar error si el usuario cancelo voluntariamente
                throw error
            }
            errorMessage = error.localizedDescription
            throw error
        } catch is StoreKit.Product.PurchaseError {
            let subError = SubscriptionError.purchaseFailed("No se pudo completar la compra.")
            errorMessage = subError.localizedDescription
            throw subError
        } catch {
            let subError = SubscriptionError.purchaseFailed(error.localizedDescription)
            errorMessage = subError.localizedDescription
            throw subError
        }
    }

    // MARK: - Restaurar Compras

    /// Restaura compras anteriores del usuario.
    @MainActor
    public func restorePurchases() async {
        isLoading = true
        defer { isLoading = false }

        do {
            try await AppStore.sync()
            await updateSubscriptionStatus()
        } catch {
            errorMessage = "No se pudieron restaurar las compras. Intenta de nuevo."
        }
    }

    // MARK: - Verificar Estado de Suscripcion

    /// Actualiza el estado de suscripcion verificando los entitlements actuales.
    @MainActor
    public func updateSubscriptionStatus() async {
        var hasActiveSubscription = false

        for productID in ProductID.all {
            guard let result = await Transaction.currentEntitlement(for: productID) else {
                continue
            }

            if let transaction = try? checkVerification(result) {
                // Verificar que la suscripcion no haya expirado
                if let expirationDate = transaction.expirationDate,
                   expirationDate > Date() {
                    hasActiveSubscription = true
                    break
                } else if transaction.expirationDate == nil {
                    // Transacciones sin fecha de expiracion (lifetime)
                    hasActiveSubscription = true
                    break
                }
            }
        }

        isPremium = hasActiveSubscription
    }

    // MARK: - Escuchar Actualizaciones de Transacciones

    /// Inicia la escucha de actualizaciones de transacciones en segundo plano.
    ///
    /// Debe llamarse al inicio de la app para detectar renovaciones,
    /// cancelaciones y compras realizadas en otros dispositivos.
    public func startTransactionListener() {
        transactionListenerTask?.cancel()
        transactionListenerTask = Task(priority: .background) { [weak self] in
            for await result in Transaction.updates {
                guard let self else { return }
                if let transaction = try? self.checkVerification(result) {
                    await transaction.finish()
                    await MainActor.run {
                        Task {
                            await self.updateSubscriptionStatus()
                        }
                    }
                }
            }
        }
    }

    // MARK: - Sincronizacion con RevenueCat

    /// Sincroniza el recibo de la App Store con el backend (RevenueCat).
    ///
    /// - Note: Placeholder para integracion futura con RevenueCat.
    ///   Cuando se implemente, debe enviar el recibo al backend para
    ///   validacion server-side y actualizacion del plan del usuario.
    @MainActor
    public func syncWithRevenueCat() async {
        // TODO: Implementar sincronizacion con RevenueCat
        // 1. Obtener el recibo de la App Store
        // 2. Enviar al backend via APIClient: POST /subscriptions/verify-receipt
        // 3. Actualizar el plan del usuario en el backend
        // 4. Refrescar el estado local del usuario
    }

    // MARK: - Helpers

    /// Verifica la firma criptografica de una transaccion de StoreKit.
    /// - Parameter result: El resultado de verificacion de StoreKit.
    /// - Returns: La transaccion verificada.
    /// - Throws: `SubscriptionError.verificationFailed` si la verificacion falla.
    private func checkVerification<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw SubscriptionError.verificationFailed
        case .verified(let safe):
            return safe
        }
    }

    // MARK: - Producto por ID

    /// Obtiene el producto mensual, si esta disponible.
    public var monthlyProduct: Product? {
        products.first { $0.id == ProductID.monthlyPremium }
    }

    /// Obtiene el producto anual, si esta disponible.
    public var yearlyProduct: Product? {
        products.first { $0.id == ProductID.yearlyPremium }
    }

    // MARK: - Administrar Suscripcion

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
}
