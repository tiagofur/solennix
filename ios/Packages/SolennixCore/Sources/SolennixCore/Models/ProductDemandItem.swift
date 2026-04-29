import Foundation

/// Product by times used, returned by `GET /api/dashboard/product-demand`.
/// Relies on APIClient's `.convertFromSnakeCase` — no explicit CodingKeys.
public struct ProductDemandItem: Codable, Identifiable, Sendable, Hashable {
    public let id: String
    public let name: String
    public let timesUsed: Int
    public let totalRevenue: Double

    public init(id: String, name: String, timesUsed: Int, totalRevenue: Double) {
        self.id = id
        self.name = name
        self.timesUsed = timesUsed
        self.totalRevenue = totalRevenue
    }
}
