import Foundation

// MARK: - Plan

/// User subscription plan. Uses a custom decoder to handle any unknown
/// plan strings the backend might send (e.g., "business") by falling back to `.basic`.
public enum Plan: String, Codable, Sendable, CaseIterable, Hashable {
    case basic
    case premium

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        let raw = try container.decode(String.self)
        self = Plan(rawValue: raw) ?? .basic
    }
}

// MARK: - User

/// Note: The APIClient uses `keyDecodingStrategy = .convertFromSnakeCase`,
/// so we use camelCase property names directly — no explicit CodingKeys needed.
/// Extra fields from the backend (role, google_user_id, etc.) are safely ignored.
public struct User: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let email: String
    public let name: String
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
