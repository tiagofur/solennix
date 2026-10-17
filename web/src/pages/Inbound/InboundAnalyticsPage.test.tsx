import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@tests/customRender";
import { MemoryRouter } from "react-router-dom";
import { InboundAnalyticsPage } from "./InboundAnalyticsPage";
import { inboundAnalyticsService } from "@/services/inboundAnalyticsService";

vi.mock("@/services/inboundAnalyticsService", () => ({
  inboundAnalyticsService: { get: vi.fn() },
}));

vi.mock("@/hooks/usePlanLimits", () => ({
  usePlanLimits: () => ({ isBasicPlan: false }),
}));

const mockedGet = vi.mocked(inboundAnalyticsService.get);

const baseData = {
  views: 120,
  unique_visitors: 80,
  requests: 10,
  response_rate: 0.5,
  converted: 3,
  conversion_rate: 0.3,
  limited: false,
  views_by_day: [{ date: "2026-10-01", count: 5 }],
  views_change_pct: 10,
  sources: { direct: 70, directory: 50 },
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <InboundAnalyticsPage />
    </MemoryRouter>,
  );

describe("InboundAnalyticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGet.mockResolvedValue(baseData as any);
  });

  it("loads 30-day analytics and renders KPIs", async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByTestId("inbound-analytics-page"),
      ).toBeInTheDocument();
    });
    expect(mockedGet).toHaveBeenCalledWith(30);
    await waitFor(() => {
      expect(screen.getByText("120")).toBeInTheDocument();
    });
  });

  it("refetches with 7 days when switching period", async () => {
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByTestId("inbound-analytics-page"),
      ).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("period-7"));

    await waitFor(() => {
      expect(mockedGet).toHaveBeenLastCalledWith(7);
    });
  });

  it("shows the error state when loading fails", async () => {
    mockedGet.mockRejectedValue(new Error("down"));
    renderPage();

    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(
        screen.getByText("No pudimos cargar las métricas. Probá de nuevo."),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText("120")).toBeNull();
  });
});
