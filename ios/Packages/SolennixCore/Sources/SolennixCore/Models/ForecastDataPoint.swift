import Foundation

/// Monthly revenue forecast, returned by `GET /api/dashboard/forecast`.
/// Relies on APIClient's `.convertFromSnakeCase` — no explicit CodingKeys.
public struct ForecastDataPoint: Codable, Sendable, Hashable {
    public let month: String // "YYYY-MM"
    public let confirmedRevenue: Double
    public let confirmedEventCount: Int

    public init(month: String, confirmedRevenue: Double, confirmedEventCount: Int) {
        self.month = month
        self.confirmedRevenue = confirmedRevenue
        self.confirmedEventCount = confirmedEventCount
    }
}
