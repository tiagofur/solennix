import type { components } from "./api";

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
  total_products: number;
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

// One row from GET /api/dashboard/events-by-status?scope=month|all.
// Mirrors backend/internal/repository/EventStatusCount. `status` is the
// raw backend string; callers map it onto their local enum.
export interface DashboardEventStatusCount {
  status: string;
  count: number;
}

export type DashboardEventStatusScope = "month" | "all";

// Bundled dashboard payload from GET /api/dashboard/summary. Collapses KPIs +
// the 5 chart/widget datasets into one response (issue #807 / #932).
// Mirrors backend/internal/repository/DashboardSummary. Snake_case — the web
// API client returns raw JSON with no key-casing transform.
export interface DashboardSummary {
  kpis: DashboardKpis;
  revenue_chart: DashboardRevenuePoint[];
  events_by_status: DashboardEventStatusCount[];
  top_clients: components["schemas"]["TopClient"][];
  product_demand: components["schemas"]["ProductDemandItem"][];
  forecast: components["schemas"]["ForecastDataPoint"][];
}

// One row from GET /api/dashboard/attention. Mirrors backend
// AttentionItem — events needing follow-up with reason + balance computed
// server-side so the three frontends don't triplicate the logic (issue #861).
export type AttentionReason = "payment_due" | "overdue_event" | "quote_urgent";

export interface AttentionItem {
  event_id: string;
  event_date: string;
  service_type: string;
  status: string;
  client_name: string;
  total_amount: number;
  amount_paid: number;
  pending_balance: number;
  reason: AttentionReason;
}
