import { api } from "../lib/api";
import type { components } from "../types/api";
import type {
  DashboardEventStatusCount,
  DashboardEventStatusScope,
  DashboardKpis,
  DashboardRevenuePeriod,
  DashboardRevenuePoint,
} from "../types/dashboard";

type TopClient = components["schemas"]["TopClient"];
type ProductDemandItem = components["schemas"]["ProductDemandItem"];
type ForecastDataPoint = components["schemas"]["ForecastDataPoint"];

export const dashboardService = {
  async getKpis(): Promise<DashboardKpis> {
    return api.get<DashboardKpis>("/dashboard/kpis");
  },

  async getRevenueChart(
    period: DashboardRevenuePeriod = "year"
  ): Promise<DashboardRevenuePoint[]> {
    return api.get<DashboardRevenuePoint[]>("/dashboard/revenue-chart", {
      period,
    });
  },

  async getEventsByStatus(
    scope: DashboardEventStatusScope = "month"
  ): Promise<DashboardEventStatusCount[]> {
    return api.get<DashboardEventStatusCount[]>("/dashboard/events-by-status", {
      scope,
    });
  },

  async getTopClients(limit: number = 10): Promise<TopClient[]> {
    return api.get<TopClient[]>("/dashboard/top-clients", { limit: limit.toString() });
  },

  async getProductDemand(): Promise<ProductDemandItem[]> {
    return api.get<ProductDemandItem[]>("/dashboard/product-demand");
  },

  async getForecast(): Promise<ForecastDataPoint[]> {
    return api.get<ForecastDataPoint[]>("/dashboard/forecast");
  },
};
