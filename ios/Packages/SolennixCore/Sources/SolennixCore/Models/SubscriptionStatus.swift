import Foundation

// MARK: - Subscription Provider

/// Platform where the user originally subscribed.
///
/// The user-facing `fallbackBadge` and `fallbackCancelInstructions` strings
/// are kept on the enum ONLY as a fallback when talking to an older backend
/// that does not yet return the server-authored `source_badge` /
/// `cancel_instructions` fields. Once the backend is deployed with those
/// fields, the client renders them verbatim so iOS, Android and Web stay
/// in sync without per-client drift.
public enum SubscriptionProvider: String, Codable, Sendable {
    case stripe
    case apple
    case google

    /// Fallback label in Spanish — only used if backend omitted `source_badge`.
    public var fallbackBadge: String {
        switch self {
        case .stripe: return "Suscrito vía Web"
        case .apple: return "Suscrito vía App Store"
        case .google: return "Suscrito vía Google Play"
        }
    }

    /// Fallback cancel instructions — only used if backend omitted the field.
    public var fallbackCancelInstructions: String {
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
///
/// `sourceBadge` and `cancelInstructions` are server-authored (backend
/// Fase 2). `amountCents` / `currency` / `billingInterval` come from the
/// Stripe subscription when the provider is stripe (Fase 3); Apple and
/// Google leave them nil since the store is the source of truth for
/// those users. All new fields are optional to stay forward-compatible
/// with older backend deployments.
public struct SubscriptionInfo: Codable, Sendable {
    public let status: String
    public let provider: SubscriptionProvider
    public let sourceBadge: String?
    public let cancelInstructions: String?
    public let currentPeriodEnd: String?
    public let cancelAtPeriodEnd: Bool
    public let amountCents: Int?
    public let currency: String?
    public let billingInterval: String?

    public init(
        status: String,
        provider: SubscriptionProvider,
        sourceBadge: String? = nil,
        cancelInstructions: String? = nil,
        currentPeriodEnd: String? = nil,
        cancelAtPeriodEnd: Bool = false,
        amountCents: Int? = nil,
        currency: String? = nil,
        billingInterval: String? = nil
    ) {
        self.status = status
        self.provider = provider
        self.sourceBadge = sourceBadge
        self.cancelInstructions = cancelInstructions
        self.currentPeriodEnd = currentPeriodEnd
        self.cancelAtPeriodEnd = cancelAtPeriodEnd
        self.amountCents = amountCents
        self.currency = currency
        self.billingInterval = billingInterval
    }
}

// MARK: - Subscription Status Response

/// Response from `GET /api/subscriptions/status`.
public struct SubscriptionStatusResponse: Codable, Sendable {
    public let plan: String
    public let hasStripeAccount: Bool
    public let subscription: SubscriptionInfo?
}
