import Foundation

public struct EventExtra: Codable, Identifiable, Sendable, Hashable {
    public var id: String
    public var eventId: String
    public var description: String
    public var cost: Double
    public var price: Double
    public var excludeUtility: Bool
    public var createdAt: String

    public init(
        id: String, eventId: String, description: String, cost: Double,
        price: Double, excludeUtility: Bool, createdAt: String
    ) {
        self.id = id; self.eventId = eventId; self.description = description
        self.cost = cost; self.price = price; self.excludeUtility = excludeUtility
        self.createdAt = createdAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case eventId = "event_id"
        case description
        case cost
        case price
        case excludeUtility = "exclude_utility"
        case createdAt = "created_at"
    }
}
