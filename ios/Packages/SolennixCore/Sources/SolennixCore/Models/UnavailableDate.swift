import Foundation

public struct UnavailableDate: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let userId: String
    public let startDate: String
    public let endDate: String
    public let startTime: String?
    public let endTime: String?
    public var reason: String?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case startDate = "start_date"
        case endDate = "end_date"
        case startTime = "start_time"
        case endTime = "end_time"
        case reason
    }

    public init(
        id: String,
        userId: String,
        startDate: String,
        endDate: String,
        startTime: String? = nil,
        endTime: String? = nil,
        reason: String? = nil
    ) {
        self.id = id
        self.userId = userId
        self.startDate = startDate
        self.endDate = endDate
        self.startTime = startTime
        self.endTime = endTime
        self.reason = reason
    }
}
