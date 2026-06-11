import Foundation

public struct EventProduct: Codable, Identifiable, Sendable, Hashable {
    public var id: String
    public var eventId: String
    public var productId: String
    /// Stored as Double to match the backend float64 column.
    /// Display as integer when `quantity == floor(quantity)`.
    public var quantity: Double
    public var unitPrice: Double
    public var discount: Double
    public var totalPrice: Double?
    public var createdAt: String

    public init(
        id: String, eventId: String, productId: String, quantity: Double,
        unitPrice: Double, discount: Double, totalPrice: Double? = nil, createdAt: String
    ) {
        self.id = id; self.eventId = eventId; self.productId = productId
        self.quantity = quantity; self.unitPrice = unitPrice; self.discount = discount
        self.totalPrice = totalPrice; self.createdAt = createdAt
    }

    /// Formatted quantity: shows as integer string when value is whole ("2"), decimal otherwise ("2.5").
    public var formattedQuantity: String {
        quantity == floor(quantity) ? String(Int(quantity)) : String(quantity)
    }
}
