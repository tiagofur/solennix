import Foundation
import SolennixCore

extension APIClient {
    /// Fetch top clients by total spent
    public func getTopClients(limit: Int = 5) async throws -> [TopClient] {
        let params: [String: String] = ["limit": String(limit)]
        let data = try await request(
            endpoint: Endpoints.dashboardTopClients,
            method: .get,
            queryParams: params
        )
        return try decoder.decode([TopClient].self, from: data)
    }

    /// Fetch product demand (top products by times used)
    public func getProductDemand() async throws -> [ProductDemandItem] {
        let data = try await request(
            endpoint: Endpoints.dashboardProductDemand,
            method: .get
        )
        return try decoder.decode([ProductDemandItem].self, from: data)
    }

    /// Fetch revenue forecast by month
    public func getForecast() async throws -> [ForecastDataPoint] {
        let data = try await request(
            endpoint: Endpoints.dashboardForecast,
            method: .get
        )
        return try decoder.decode([ForecastDataPoint].self, from: data)
    }
}
