import Foundation
import SolennixCore

extension APIClient {
    /// Fetch top clients by total spent
    public func getTopClients(limit: Int = 5) async throws -> [TopClient] {
        try await get(Endpoint.dashboardTopClients, params: ["limit": String(limit)])
    }

    /// Fetch product demand (top products by times used)
    public func getProductDemand() async throws -> [ProductDemandItem] {
        try await get(Endpoint.dashboardProductDemand)
    }

    /// Fetch revenue forecast by month
    public func getForecast() async throws -> [ForecastDataPoint] {
        try await get(Endpoint.dashboardForecast)
    }
}
