import Foundation

/// Server-aggregated KPIs for the dashboard header.
///
/// Mirrors the shape of `backend/internal/repository/DashboardKPIs`.
/// Fetched via `GET /api/dashboard/kpis` — fast (single query) so the
/// dashboard can paint counts immediately while the underlying list
/// endpoints continue loading in the background.
public struct DashboardKPIs: Codable, Sendable, Hashable {
    public let totalRevenue: Double
    public let eventsThisMonth: Int
    public let pendingQuotes: Int
    public let lowStockItems: Int
    public let upcomingEvents: Int
    public let totalClients: Int
    public let averageEventValue: Double

    public init(
        totalRevenue: Double,
        eventsThisMonth: Int,
        pendingQuotes: Int,
        lowStockItems: Int,
        upcomingEvents: Int,
        totalClients: Int,
        averageEventValue: Double
    ) {
        self.totalRevenue = totalRevenue
        self.eventsThisMonth = eventsThisMonth
        self.pendingQuotes = pendingQuotes
        self.lowStockItems = lowStockItems
        self.upcomingEvents = upcomingEvents
        self.totalClients = totalClients
        self.averageEventValue = averageEventValue
    }
}
