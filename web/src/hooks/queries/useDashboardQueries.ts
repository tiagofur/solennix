import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboardService";
import type { DashboardEventStatusScope, DashboardRevenuePeriod } from "@/types/dashboard";
import { queryKeys } from "./queryKeys";

/**
 * Backend-aggregated KPIs for the dashboard header (sales, VAT, counts).
 *
 * Backend is the single source of truth — the web client reads the values
 * directly instead of aggregating from events/payments lists. Parity with
 * iOS and Android.
 */
export function useDashboardKpis() {
  return useQuery({
    queryKey: queryKeys.dashboard.kpis,
    queryFn: () => dashboardService.getKpis(),
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
  period: DashboardRevenuePeriod = "year",
  enabled: boolean = true
) {
  return useQuery({
    queryKey: queryKeys.dashboard.revenueChart(period),
    queryFn: () => dashboardService.getRevenueChart(period),
    enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * Month-scoped event status distribution for the "Estado de Eventos" chart.
 * Backend is the source of truth so iOS / Android / Web show identical counts.
 */
export function useDashboardEventsByStatus(
  scope: DashboardEventStatusScope = "month"
) {
  return useQuery({
    queryKey: queryKeys.dashboard.eventsByStatus(scope),
    queryFn: () => dashboardService.getEventsByStatus(scope),
    staleTime: 30_000,
  });
}
