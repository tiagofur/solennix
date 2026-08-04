import { api } from "@/lib/api";

/** Period options for inbound analytics (#1131). */
export type InboundPeriodDays = 7 | 30 | 90;

export type InboundDayCount = {
  date: string;
  count: number;
};

export type InboundAnalytics = {
  period_days: number;
  views: number;
  unique_visitors: number;
  previous_views: number;
  views_change_pct?: number | null;
  requests: number;
  responded: number;
  response_rate: number;
  converted: number;
  conversion_rate: number;
  requests_by_status: Record<string, number>;
  sources: Record<string, number>;
  views_by_day: InboundDayCount[];
  limited: boolean;
};

export const inboundAnalyticsService = {
  async get(days: InboundPeriodDays = 30): Promise<InboundAnalytics> {
    const res = await api.get<{ data?: InboundAnalytics } | InboundAnalytics>(
      "/users/me/inbound-analytics",
      { days: String(days) },
    );
    const data =
      res && typeof res === "object" && "data" in res && res.data
        ? res.data
        : (res as InboundAnalytics);
    return {
      period_days: data.period_days ?? days,
      views: data.views ?? 0,
      unique_visitors: data.unique_visitors ?? 0,
      previous_views: data.previous_views ?? 0,
      views_change_pct: data.views_change_pct,
      requests: data.requests ?? 0,
      responded: data.responded ?? 0,
      response_rate: data.response_rate ?? 0,
      converted: data.converted ?? 0,
      conversion_rate: data.conversion_rate ?? 0,
      requests_by_status: data.requests_by_status ?? {},
      sources: data.sources ?? {},
      views_by_day: Array.isArray(data.views_by_day) ? data.views_by_day : [],
      limited: Boolean(data.limited),
    };
  },
};
