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
    public var stripeCustomerId: String?
    public var planExpiresAt: String?
    public let createdAt: String
    public let updatedAt: String
}
