import Foundation

/// Monthly revenue forecast, returned by `GET /api/dashboard/forecast`.
/// Relies on APIClient's `.convertFromSnakeCase` — no explicit CodingKeys.
public struct ForecastDataPoint: Codable, Sendable, Hashable {
    public let month: String // "YYYY-MM"
    public let confirmedRevenue: Double
    public let confirmedEvents: Int

    public init(month: String, confirmedRevenue: Double, confirmedEvents: Int) {
        self.month = month
        self.confirmedRevenue = confirmedRevenue
        self.confirmedEvents = confirmedEvents
    }
}
