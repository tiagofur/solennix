import Foundation

// MARK: - Subscription Provider

/// Platform where the user originally subscribed.
public enum SubscriptionProvider: String, Codable, Sendable {
    case stripe
    case apple
    case google

    /// User-facing label in Spanish.
    public var badge: String {
        switch self {
        case .stripe: return "Suscrito vía Web"
        case .apple: return "Suscrito vía App Store"
        case .google: return "Suscrito vía Google Play"
        }
    }

    /// Cancellation instructions when current platform differs from provider.
    public var cancelInstructions: String {
        switch self {
        case .stripe:
            return "Tu suscripción fue realizada desde la web. Para cancelarla, ingresá a solennix.com > Configuración > Suscripción."
        case .apple:
            return "Para cancelar, abrí Configuración > tu Apple ID > Suscripciones en tu iPhone o iPad."
        case .google:
            return "Tu suscripción fue realizada desde Android. Para cancelarla, abrí Google Play Store > Pagos y suscripciones."
        }
    }

    /// Whether this provider matches the current platform (iOS).
    public var isCurrentPlatform: Bool {
        self == .apple
    }
}

// MARK: - Subscription Info

/// Details about the active subscription from the backend.
public struct SubscriptionInfo: Codable, Sendable {
    public let status: String
    public let provider: SubscriptionProvider
    public let currentPeriodEnd: String?
    public let cancelAtPeriodEnd: Bool
}

// MARK: - Subscription Status Response

/// Response from `GET /api/subscriptions/status`.
public struct SubscriptionStatusResponse: Codable, Sendable {
    public let plan: String
    public let hasStripeAccount: Bool
    public let subscription: SubscriptionInfo?
}
