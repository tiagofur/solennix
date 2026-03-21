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
}
