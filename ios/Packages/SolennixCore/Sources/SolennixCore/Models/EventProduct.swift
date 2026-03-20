import Foundation

public struct EventProduct: Codable, Identifiable, Sendable, Hashable {
    public var id: String
    public var eventId: String
    public var productId: String
    public var quantity: Int
    public var unitPrice: Double
    public var discount: Double
    public var totalPrice: Double?
    public var createdAt: String

    public init(
        id: String, eventId: String, productId: String, quantity: Int,
        unitPrice: Double, discount: Double, totalPrice: Double? = nil, createdAt: String
    ) {
        self.id = id; self.eventId = eventId; self.productId = productId
        self.quantity = quantity; self.unitPrice = unitPrice; self.discount = discount
        self.totalPrice = totalPrice; self.createdAt = createdAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case eventId = "event_id"
        case productId = "product_id"
        case quantity
        case unitPrice = "unit_price"
        case discount
        case totalPrice = "total_price"
        case createdAt = "created_at"
    }
}
