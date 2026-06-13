import Foundation

public struct Client: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let userId: String
    public let name: String
    public let phone: String
    public var email: String?
    public var address: String?
    public var city: String?
    public var notes: String?
    public var photoUrl: String?
    public var totalEvents: Int?
    public var totalSpent: Double?
    /// Confirmed + completed event totals minus payments. Negative = overpayment (client has credit).
    /// Absent on list endpoint responses (nil-safe: older payloads decode without error).
    public var pendingBalance: Double?
    public let createdAt: String
    public let updatedAt: String

    // MARK: - CodingKeys

    private enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case phone
        case email
        case address
        case city
        case notes
        case photoUrl = "photo_url"
        case totalEvents = "total_events"
        case totalSpent = "total_spent"
        case pendingBalance = "pending_balance"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    // MARK: - Init

    public init(
        id: String,
        userId: String,
        name: String,
        phone: String,
        email: String? = nil,
        address: String? = nil,
        city: String? = nil,
        notes: String? = nil,
        photoUrl: String? = nil,
        totalEvents: Int? = nil,
        totalSpent: Double? = nil,
        pendingBalance: Double? = nil,
        createdAt: String,
        updatedAt: String
    ) {
        self.id = id
        self.userId = userId
        self.name = name
        self.phone = phone
        self.email = email
        self.address = address
        self.city = city
        self.notes = notes
        self.photoUrl = photoUrl
        self.totalEvents = totalEvents
        self.totalSpent = totalSpent
        self.pendingBalance = pendingBalance
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
