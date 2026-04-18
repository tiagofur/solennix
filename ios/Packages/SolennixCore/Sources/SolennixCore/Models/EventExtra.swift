import Foundation

public struct EventExtra: Codable, Identifiable, Sendable, Hashable {
    public var id: String
    public var eventId: String
    public var description: String
    public var cost: Double
    public var price: Double
    public var excludeUtility: Bool
    public var includeInChecklist: Bool
    public var createdAt: String

    public init(
        id: String, eventId: String, description: String, cost: Double,
        price: Double, excludeUtility: Bool, includeInChecklist: Bool = true,
        createdAt: String
    ) {
        self.id = id; self.eventId = eventId; self.description = description
        self.cost = cost; self.price = price; self.excludeUtility = excludeUtility
        self.includeInChecklist = includeInChecklist
        self.createdAt = createdAt
    }

    private enum CodingKeys: String, CodingKey {
        case id, eventId, description, cost, price
        case excludeUtility, includeInChecklist, createdAt
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try c.decode(String.self, forKey: .id)
        self.eventId = try c.decode(String.self, forKey: .eventId)
        self.description = try c.decode(String.self, forKey: .description)
        self.cost = try c.decode(Double.self, forKey: .cost)
        self.price = try c.decode(Double.self, forKey: .price)
        self.excludeUtility = try c.decodeIfPresent(Bool.self, forKey: .excludeUtility) ?? false
        self.includeInChecklist = try c.decodeIfPresent(Bool.self, forKey: .includeInChecklist) ?? true
        self.createdAt = try c.decode(String.self, forKey: .createdAt)
    }
}
