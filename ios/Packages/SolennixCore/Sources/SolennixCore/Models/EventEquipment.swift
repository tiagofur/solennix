import Foundation

public struct EventEquipment: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let eventId: String
    public let inventoryId: String
    public let quantity: Int
    public var notes: String?
    public let createdAt: String
    // Denormalized joined fields
    public var equipmentName: String?
    public var unit: String?
    public var currentStock: Double?
}
