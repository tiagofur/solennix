import Foundation

public struct Payment: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let eventId: String
    public let userId: String
    public let amount: Double
    public let paymentDate: String
    public let paymentMethod: String
    public var notes: String?
    public let createdAt: String
    
    // MARK: - Init
    
    public init(
        id: String,
        eventId: String,
        userId: String,
        amount: Double,
        paymentDate: String,
        paymentMethod: String,
        notes: String? = nil,
        createdAt: String
    ) {
        self.id = id
        self.eventId = eventId
        self.userId = userId
        self.amount = amount
        self.paymentDate = paymentDate
        self.paymentMethod = paymentMethod
        self.notes = notes
        self.createdAt = createdAt
    }
}
