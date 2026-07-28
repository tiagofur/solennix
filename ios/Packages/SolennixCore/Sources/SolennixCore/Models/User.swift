import Foundation

// MARK: - Plan

/// User subscription plan. Backend sends "basic" | "pro" | "business"
/// (and legacy "premium" from older records). Unknown strings fall back
/// to `.basic` only when truly unrecognized.
public enum Plan: String, Codable, Sendable, CaseIterable, Hashable {
    case basic
    case pro
    case business
    case premium // legacy — treat as paid tier

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        self = Plan(rawValue: raw) ?? .basic
    }

    /// True for any paid tier (pro, business, legacy premium).
    public var isPaid: Bool { self != .basic }
}

// MARK: - User

/// Note: The APIClient uses `keyDecodingStrategy = .convertFromSnakeCase`,
/// so we use camelCase property names directly — no explicit CodingKeys needed.
/// Extra fields from the backend (role, google_user_id, etc.) are safely ignored.
public struct User: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let email: String
    public let name: String
    public var role: String? = nil
    public var preferredLanguage: String?
    public var businessName: String?
    public var logoUrl: String?
    public var brandColor: String?
    public var showBusinessNameInPdf: Bool?
    public var defaultDepositPercent: Double?
    public var defaultCancellationDays: Double?
    public var defaultRefundPercent: Double?
    public var contractTemplate: String?
    // Notification preferences
    public var emailPaymentReceipt: Bool?
    public var emailEventReminder: Bool?
    public var emailSubscriptionUpdates: Bool?
    public var emailWeeklySummary: Bool?
    public var emailMarketing: Bool?
    public var pushEnabled: Bool?
    public var pushEventReminder: Bool?
    public var pushPaymentReceived: Bool?
    public let plan: Plan
    public var planExpiresAt: String?
    /// Backend `account_status` field. Known values: "active", "suspended", "pending_verification".
    public var accountStatus: String?
    public let createdAt: String
    public let updatedAt: String
    public var defaultCurrency: String?
    /// Opt-in public profile URL segment (`/u/{publicSlug}`).
    public var publicSlug: String?

    // MARK: - Custom Init & Codable

    public init(
        id: String,
        email: String,
        name: String,
        role: String? = nil,
        preferredLanguage: String? = nil,
        businessName: String? = nil,
        logoUrl: String? = nil,
        brandColor: String? = nil,
        showBusinessNameInPdf: Bool? = nil,
        defaultDepositPercent: Double? = nil,
        defaultCancellationDays: Double? = nil,
        defaultRefundPercent: Double? = nil,
        contractTemplate: String? = nil,
        emailPaymentReceipt: Bool? = nil,
        emailEventReminder: Bool? = nil,
        emailSubscriptionUpdates: Bool? = nil,
        emailWeeklySummary: Bool? = nil,
        emailMarketing: Bool? = nil,
        pushEnabled: Bool? = nil,
        pushEventReminder: Bool? = nil,
        pushPaymentReceived: Bool? = nil,
        plan: Plan,
        planExpiresAt: String? = nil,
        accountStatus: String? = nil,
        createdAt: String,
        updatedAt: String,
        defaultCurrency: String? = "MXN",
        publicSlug: String? = nil
    ) {
        self.id = id
        self.email = email
        self.name = name
        self.role = role
        self.preferredLanguage = preferredLanguage
        self.businessName = businessName
        self.logoUrl = logoUrl
        self.brandColor = brandColor
        self.showBusinessNameInPdf = showBusinessNameInPdf
        self.defaultDepositPercent = defaultDepositPercent
        self.defaultCancellationDays = defaultCancellationDays
        self.defaultRefundPercent = defaultRefundPercent
        self.contractTemplate = contractTemplate
        self.emailPaymentReceipt = emailPaymentReceipt
        self.emailEventReminder = emailEventReminder
        self.emailSubscriptionUpdates = emailSubscriptionUpdates
        self.emailWeeklySummary = emailWeeklySummary
        self.emailMarketing = emailMarketing
        self.pushEnabled = pushEnabled
        self.pushEventReminder = pushEventReminder
        self.pushPaymentReceived = pushPaymentReceived
        self.plan = plan
        self.planExpiresAt = planExpiresAt
        self.accountStatus = accountStatus
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.defaultCurrency = defaultCurrency ?? "MXN"
        self.publicSlug = publicSlug
    }
}
