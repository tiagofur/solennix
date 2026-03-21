import Foundation

// MARK: - InventoryType

public enum InventoryType: String, Codable, Sendable, CaseIterable, Hashable {
    case ingredient
    case equipment
    case supply
}

// MARK: - InventoryItem

public struct InventoryItem: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let userId: String
    public let ingredientName: String
    public let currentStock: Double
    public let minimumStock: Double
    public let unit: String
    public var unitCost: Double?
    public let lastUpdated: String
    public let type: InventoryType

    public init(
        id: String,
        userId: String,
        ingredientName: String,
        currentStock: Double,
        minimumStock: Double,
        unit: String,
        unitCost: Double? = nil,
        lastUpdated: String,
        type: InventoryType
    ) {
        self.id = id
        self.userId = userId
        self.ingredientName = ingredientName
        self.currentStock = currentStock
        self.minimumStock = minimumStock
        self.unit = unit
        self.unitCost = unitCost
        self.lastUpdated = lastUpdated
        self.type = type
    }
}
