import Foundation

/// Top client by total spent, returned by `GET /api/dashboard/top-clients`.
/// Relies on APIClient's `.convertFromSnakeCase` — no explicit CodingKeys.
public struct TopClient: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let name: String
    public let totalSpent: Double
    public let totalEvents: Int

    public var eventCount: Int { totalEvents }

    public init(id: String, name: String, totalSpent: Double, eventCount: Int) {
        self.id = id
        self.name = name
        self.totalSpent = totalSpent
        self.totalEvents = eventCount
    }
}
