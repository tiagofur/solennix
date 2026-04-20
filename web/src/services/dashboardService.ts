import { api } from "../lib/api";
import type {
  DashboardKpis,
  DashboardRevenuePeriod,
  DashboardRevenuePoint,
} from "../types/dashboard";

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
};
