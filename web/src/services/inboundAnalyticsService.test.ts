import { describe, it, expect, beforeEach, vi } from "vitest";
import { inboundAnalyticsService } from "./inboundAnalyticsService";

const getMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
  },
}));

describe("inboundAnalyticsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unwraps data payload and normalizes fields", async () => {
    getMock.mockResolvedValue({
      data: {
        period_days: 7,
        views: 12,
        unique_visitors: 5,
        previous_views: 10,
        views_change_pct: 20,
        requests: 3,
        responded: 2,
        response_rate: 0.66,
        converted: 1,
        conversion_rate: 0.33,
        requests_by_status: { pending: 1 },
        sources: { directory: 8 },
        views_by_day: [{ date: "2026-08-01", count: 2 }],
        limited: false,
      },
    });
    const res = await inboundAnalyticsService.get(7);
    expect(getMock).toHaveBeenCalledWith("/users/me/inbound-analytics", {
      days: "7",
    });
    expect(res.views).toBe(12);
    expect(res.limited).toBe(false);
    expect(res.views_by_day).toHaveLength(1);
  });
});
