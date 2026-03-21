import Foundation

public struct UnavailableDate: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let userId: String
    public let startDate: String
    public let endDate: String
    public var reason: String?

    public init(
        id: String,
        userId: String,
        startDate: String,
        endDate: String,
        reason: String? = nil
    ) {
        self.id = id
        self.userId = userId
        self.startDate = startDate
        self.endDate = endDate
        self.reason = reason
    }
}
