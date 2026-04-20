import Foundation

/// Server-aggregated KPIs for the dashboard header.
///
/// Mirrors the shape of `backend/internal/repository/DashboardKPIs`.
/// Fetched via `GET /api/dashboard/kpis`. Backend is the single source of
/// truth for every metric on the dashboard header — clients no longer
/// aggregate from raw lists.
///
/// Monthly fields (net sales, cash collected, VAT collected / outstanding)
/// are scoped to events with `event_date` in the current calendar month
/// AND status ∈ {confirmed, completed}. VAT is prorated per event by paid
/// ratio. Cash collected is scoped by `payment_date` in the current month.
///
/// Key decoding relies on `APIClient`'s global `.convertFromSnakeCase`
/// strategy — do NOT add explicit `CodingKeys`, they'd shadow the
/// converter and cause `keyNotFound` errors at runtime.
public struct DashboardKPIs: Codable, Sendable, Hashable {
    public let totalRevenue: Double
    public let eventsThisMonth: Int
    public let pendingQuotes: Int
    public let lowStockItems: Int
    public let upcomingEvents: Int
    public let totalClients: Int
    public let averageEventValue: Double
    public let netSalesThisMonth: Double
    public let cashCollectedThisMonth: Double
    public let vatCollectedThisMonth: Double
    public let vatOutstandingThisMonth: Double

    public init(
        totalRevenue: Double,
        eventsThisMonth: Int,
        pendingQuotes: Int,
        lowStockItems: Int,
        upcomingEvents: Int,
        totalClients: Int,
        averageEventValue: Double,
        netSalesThisMonth: Double,
        cashCollectedThisMonth: Double,
        vatCollectedThisMonth: Double,
        vatOutstandingThisMonth: Double
    ) {
        self.totalRevenue = totalRevenue
        self.eventsThisMonth = eventsThisMonth
        self.pendingQuotes = pendingQuotes
        self.lowStockItems = lowStockItems
        self.upcomingEvents = upcomingEvents
        self.totalClients = totalClients
        self.averageEventValue = averageEventValue
        self.netSalesThisMonth = netSalesThisMonth
        self.cashCollectedThisMonth = cashCollectedThisMonth
        self.vatCollectedThisMonth = vatCollectedThisMonth
        self.vatOutstandingThisMonth = vatOutstandingThisMonth
    }
}

/// One data point returned by `GET /api/dashboard/revenue-chart`.
/// Mirrors `backend/internal/repository/RevenueDataPoint`.
/// Relies on APIClient's `.convertFromSnakeCase` — no explicit CodingKeys.
public struct DashboardRevenuePoint: Codable, Sendable, Hashable {
    public let month: String        // "YYYY-MM"
    public let revenue: Double
    public let eventCount: Int

    public init(month: String, revenue: Double, eventCount: Int) {
        self.month = month
        self.revenue = revenue
        self.eventCount = eventCount
    }
}

/// One row returned by `GET /api/dashboard/events-by-status`. `status`
/// is the raw backend string (e.g. "quoted"); callers map it to the
/// platform's `EventStatus` enum. Relies on `.convertFromSnakeCase`.
public struct DashboardEventStatusCount: Codable, Sendable, Hashable {
    public let status: String
    public let count: Int

    public init(status: String, count: Int) {
        self.status = status
        self.count = count
    }
}
