import Foundation

// MARK: - ConflictType

public enum ConflictType: String, Codable, Sendable, CaseIterable, Hashable {
    case overlap
    case insufficientGap = "insufficient_gap"
    case fullDay = "full_day"
}

// MARK: - SupplySuggestion

public struct SupplySuggestion: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let ingredientName: String
    public let currentStock: Double
    public let unit: String
    public let unitCost: Double
    public let suggestedQuantity: Double
}

// MARK: - EquipmentSuggestion

public struct EquipmentSuggestion: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let ingredientName: String
    public let currentStock: Double
    public let unit: String
    public let type: String
    public let suggestedQuantity: Double
}

// MARK: - EquipmentConflict

public struct EquipmentConflict: Codable, Sendable, Hashable {
    public let inventoryId: String
    public let equipmentName: String
    public let conflictingEventId: String
    public let eventDate: String
    public var startTime: String?
    public var endTime: String?
    public let serviceType: String
    public var clientName: String?
    public let conflictType: ConflictType
}
