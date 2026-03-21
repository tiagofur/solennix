import Foundation

public struct ProductIngredient: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let productId: String
    public let inventoryId: String
    public let quantityRequired: Double
    public var capacity: Double?
    public var bringToEvent: Bool?
    public let createdAt: String
    // Flattened inventory joined fields
    public var ingredientName: String?
    public var unit: String?
    public var unitCost: Double?
    public var type: InventoryType?
}
