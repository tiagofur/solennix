import Foundation

// MARK: - SupplySource

public enum SupplySource: String, Codable, Sendable, CaseIterable, Hashable {
    case stock
    case purchase
}

// MARK: - EventSupply

public struct EventSupply: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let eventId: String
    public let inventoryId: String
    public let quantity: Double
    public let unitCost: Double
    public let source: SupplySource
    public let excludeCost: Bool
    public let createdAt: String
    // Denormalized joined fields
    public var supplyName: String?
    public var unit: String?
    public var currentStock: Double?
}
