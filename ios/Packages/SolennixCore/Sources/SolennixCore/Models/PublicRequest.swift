import Foundation

/// Structured quote request from a public visitor (NG1 — no client account).
/// Wire shape from `GET /api/organizers/me/requests` (#1121 cursor / offset).
public struct PublicRequest: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let contactEmail: String
    public let contactName: String?
    public let eventType: String?
    public let eventDate: String?
    public let location: String?
    public let guestCount: Int?
    public let budget: Double?
    public let currency: String
    public let services: [PublicRequestServiceSnapshot]
    public let message: String?
    public let status: PublicRequestStatus
    public let isRead: Bool
    public let eventId: String?
    public let declinedReason: String?
    public let lastStatusChange: String?
    public let createdAt: String
    public let updatedAt: String

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        contactEmail = try c.decode(String.self, forKey: .contactEmail)
        contactName = try c.decodeIfPresent(String.self, forKey: .contactName)
        eventType = try c.decodeIfPresent(String.self, forKey: .eventType)
        eventDate = try c.decodeIfPresent(String.self, forKey: .eventDate)
        location = try c.decodeIfPresent(String.self, forKey: .location)
        guestCount = try c.decodeIfPresent(Int.self, forKey: .guestCount)
        budget = try c.decodeIfPresent(Double.self, forKey: .budget)
        currency = try c.decodeIfPresent(String.self, forKey: .currency) ?? "MXN"
        services = try c.decodeIfPresent([PublicRequestServiceSnapshot].self, forKey: .services) ?? []
        message = try c.decodeIfPresent(String.self, forKey: .message)
        status = try c.decodeIfPresent(PublicRequestStatus.self, forKey: .status) ?? .pending
        isRead = try c.decodeIfPresent(Bool.self, forKey: .isRead) ?? false
        eventId = try c.decodeIfPresent(String.self, forKey: .eventId)
        declinedReason = try c.decodeIfPresent(String.self, forKey: .declinedReason)
        lastStatusChange = try c.decodeIfPresent(String.self, forKey: .lastStatusChange)
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt) ?? ""
        updatedAt = try c.decodeIfPresent(String.self, forKey: .updatedAt) ?? ""
    }

    public init(
        id: String,
        contactEmail: String,
        contactName: String? = nil,
        eventType: String? = nil,
        eventDate: String? = nil,
        location: String? = nil,
        guestCount: Int? = nil,
        budget: Double? = nil,
        currency: String = "MXN",
        services: [PublicRequestServiceSnapshot] = [],
        message: String? = nil,
        status: PublicRequestStatus = .pending,
        isRead: Bool = false,
        eventId: String? = nil,
        declinedReason: String? = nil,
        lastStatusChange: String? = nil,
        createdAt: String = "",
        updatedAt: String = ""
    ) {
        self.id = id
        self.contactEmail = contactEmail
        self.contactName = contactName
        self.eventType = eventType
        self.eventDate = eventDate
        self.location = location
        self.guestCount = guestCount
        self.budget = budget
        self.currency = currency
        self.services = services
        self.message = message
        self.status = status
        self.isRead = isRead
        self.eventId = eventId
        self.declinedReason = declinedReason
        self.lastStatusChange = lastStatusChange
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    /// Display name for list rows (sanitized: name if present, else email local-part).
    public var displayName: String {
        if let contactName, !contactName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return contactName.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let at = contactEmail.firstIndex(of: "@") {
            return String(contactEmail[..<at])
        }
        return contactEmail
    }
}

/// Snapshot of a service selected by the visitor at submit time.
public struct PublicRequestServiceSnapshot: Codable, Sendable, Hashable, Identifiable {
    public var id: String { productId }
    public let productId: String
    public let name: String
    public let price: Double?
    public let isFeatured: Bool?

    public init(productId: String, name: String, price: Double? = nil, isFeatured: Bool? = nil) {
        self.productId = productId
        self.name = name
        self.price = price
        self.isFeatured = isFeatured
    }
}

public enum PublicRequestStatus: String, Codable, Sendable, Hashable, CaseIterable {
    case pending
    case infoRequested = "info_requested"
    case responded
    case acceptedByClient = "accepted_by_client"
    case declinedProvider = "declined_provider"
    case declinedClient = "declined_client"
    case booked
    case expired
}

/// Organizer quote reply embedded on the detail endpoint.
public struct PublicResponse: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let requestId: String
    public let quoteAmount: Double
    public let currency: String
    public let inclusions: [String]
    public let validUntil: String?
    public let message: String?
    public let createdAt: String
}

/// Keyset pagination envelope from `GET .../requests?cursor=` (#1121).
public struct CursorPaginatedResponse<T: Decodable>: Decodable {
    public let data: [T]
    public let nextCursor: String?
    public let hasMore: Bool
    public let limit: Int

    public init(data: [T], nextCursor: String?, hasMore: Bool, limit: Int) {
        self.data = data
        self.nextCursor = nextCursor
        self.hasMore = hasMore
        self.limit = limit
    }
}

/// Detail payload: request row + response history.
public struct PublicRequestDetail: Codable, Sendable {
    public let request: PublicRequest
    public let responses: [PublicResponse]

    public init(request: PublicRequest, responses: [PublicResponse] = []) {
        self.request = request
        self.responses = responses
    }
}
