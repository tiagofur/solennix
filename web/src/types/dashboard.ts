// Mirrors backend/internal/repository/DashboardKPIs.
// Fetched via GET /api/dashboard/kpis. Backend is the single source of truth
// for every metric on the dashboard header — the web client no longer
// aggregates monetary values or counts from raw lists.
export interface DashboardKpis {
  total_revenue: number;
  events_this_month: number;
  pending_quotes: number;
  low_stock_items: number;
  upcoming_events: number;
  total_clients: number;
  average_event_value: number;
  net_sales_this_month: number;
  cash_collected_this_month: number;
  vat_collected_this_month: number;
  vat_outstanding_this_month: number;
}

// One point from GET /api/dashboard/revenue-chart?period=month|quarter|year.
// Mirrors backend/internal/repository/RevenueDataPoint.
export interface DashboardRevenuePoint {
  month: string; // "YYYY-MM"
  revenue: number;
  event_count: number;
}

export type DashboardRevenuePeriod = "month" | "quarter" | "year";
