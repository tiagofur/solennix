import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import type { DashboardEventStatusScope, DashboardRevenuePeriod } from "@/types/dashboard";
import { queryKeys } from "./queryKeys";

/**
 * All dashboard analytics (KPIs + revenue chart + status distribution + top
 * clients + product demand + forecast) are bundled into a single
 * `GET /dashboard/summary` round-trip (issue #807 / #932). Each hook below
 * reads from the SAME shared query cache (`['dashboard','summary']`) and
 * projects its slice via `select`, so 6 hook call sites collapse to 1 network
 * request. `staleTime: 30s` honors the KPI freshness requirement (the header
 * is the first thing the user sees after a mutation).
 *
 * The `period`/`scope`/`limit` args on some hooks are kept in their signatures
 * for call-site compatibility but are no longer sent — the summary endpoint
 * pins them internally to the values the dashboard used to pass individually
 * (revenue-chart period=year, events-by-status scope=month, top-clients limit=5).
 */

/**
 * Backend-aggregated KPIs for the dashboard header (sales, VAT, counts).
 *
 * Backend is the single source of truth — the web client reads the values
 * directly instead of aggregating from events/payments lists. Parity with
 * iOS and Android.
 */
export function useDashboardKpis() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => dashboardService.getSummary(),
    select: (s) => s.kpis,
    // Fresh-ish but not jittery: the header is the first thing the user sees
    // after any mutation (new event, payment, inventory change), so a short
    // staleness window keeps it honest without hammering the server.
    staleTime: 30_000,
  });
}

/**
 * Monthly revenue data for the "Ingresos — Últimos 6 meses" premium chart.
 * Backend returns up to 12 months; the Dashboard slices the tail to 6.
 */
export function useDashboardRevenueChart(
  _period: DashboardRevenuePeriod = "year",
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => dashboardService.getSummary(),
    select: (s) => s.revenue_chart,
    enabled,
    staleTime: 30_000,
  });
}

/**
 * Month-scoped event status distribution for the "Estado de Eventos" chart.
 * Backend is the source of truth so iOS / Android / Web show identical counts.
 */
export function useDashboardEventsByStatus(
  _scope: DashboardEventStatusScope = "month"
) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => dashboardService.getSummary(),
    select: (s) => s.events_by_status,
    staleTime: 30_000,
  });
}

/**
 * Top clients by total spent — analytics widget for dashboard.
 */
export function useTopClients(_limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => dashboardService.getSummary(),
    select: (s) => s.top_clients,
    staleTime: 30_000,
  });
}

/**
 * Product demand — most used products and revenue — analytics widget.
 */
export function useProductDemand() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => dashboardService.getSummary(),
    select: (s) => s.product_demand,
    staleTime: 30_000,
  });
}

/**
 * Revenue forecast for confirmed/quoted future events — analytics widget.
 */
export function useForecast() {
  return useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: () => dashboardService.getSummary(),
    select: (s) => s.forecast,
    staleTime: 30_000,
  });
}
