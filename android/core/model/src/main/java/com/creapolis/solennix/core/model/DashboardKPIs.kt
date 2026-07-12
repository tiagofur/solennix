package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Server-aggregated KPIs for the dashboard header.
 *
 * Mirrors [backend/internal/repository/DashboardKPIs]. Fetched via
 * `GET /api/dashboard/kpis`. Backend is the single source of truth for every
 * metric on the dashboard header — clients no longer aggregate from raw lists.
 *
 * Monthly fields (net sales, cash collected, VAT collected / outstanding)
 * are scoped to events with `event_date` in the current calendar month AND
 * status ∈ {confirmed, completed}. VAT is prorated per event by paid ratio.
 * Cash collected is scoped by `payment_date` in the current calendar month.
 */
@Serializable
data class DashboardKPIs(
    @SerialName("total_revenue") val totalRevenue: Double = 0.0,
    @SerialName("events_this_month") val eventsThisMonth: Int = 0,
    @SerialName("pending_quotes") val pendingQuotes: Int = 0,
    @SerialName("low_stock_items") val lowStockItems: Int = 0,
    @SerialName("upcoming_events") val upcomingEvents: Int = 0,
    @SerialName("total_clients") val totalClients: Int = 0,
    @SerialName("total_products") val totalProducts: Int = 0,
    @SerialName("average_event_value") val averageEventValue: Double = 0.0,
    @SerialName("net_sales_this_month") val netSalesThisMonth: Double = 0.0,
    @SerialName("cash_collected_this_month") val cashCollectedThisMonth: Double = 0.0,
    @SerialName("vat_collected_this_month") val vatCollectedThisMonth: Double = 0.0,
    @SerialName("vat_outstanding_this_month") val vatOutstandingThisMonth: Double = 0.0
)

/**
 * One point returned by `GET /api/dashboard/revenue-chart`.
 * Mirrors [backend/internal/repository/RevenueDataPoint].
 */
@Serializable
data class DashboardRevenuePoint(
    val month: String,
    val revenue: Double,
    @SerialName("event_count") val eventCount: Int
)

/**
 * One row returned by `GET /api/dashboard/events-by-status?scope=month|all`.
 * Mirrors [backend/internal/repository/EventStatusCount]. `status` is the
 * raw backend string (e.g. "quoted"); callers map it to the client's
 * `EventStatus` enum and drop rows that don't match.
 */
@Serializable
data class DashboardEventStatusCount(
    val status: String,
    val count: Int
)

/**
 * Bundled dashboard payload from `GET /api/dashboard/summary`. Collapses KPIs +
 * the 5 chart/widget datasets into one response (issue #807 / #931).
 * Mirrors [backend/internal/repository/DashboardSummary].
 */
@Serializable
data class DashboardSummary(
    val kpis: DashboardKPIs = DashboardKPIs(),
    @SerialName("revenue_chart") val revenueChart: List<DashboardRevenuePoint> = emptyList(),
    @SerialName("events_by_status") val eventsByStatus: List<DashboardEventStatusCount> = emptyList(),
    @SerialName("top_clients") val topClients: List<TopClient> = emptyList(),
    @SerialName("product_demand") val productDemand: List<ProductDemandItem> = emptyList(),
    val forecast: List<ForecastDataPoint> = emptyList()
)
