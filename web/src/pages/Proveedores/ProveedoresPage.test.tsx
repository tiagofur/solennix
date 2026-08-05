import { describe, it, expect, beforeEach, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { render } from "@tests/customRender";
import { server } from "../../../tests/mocks/server";
import { ProveedoresPage } from "./ProveedoresPage";

vi.mock("@/hooks/useTheme", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

vi.mock("@/services/pageViewService", () => ({
  recordPageView: vi.fn().mockResolvedValue(undefined),
}));

const API_BASE = "http://localhost:8080/api";

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    slug: "alice-catering",
    business_name: "Alice Catering",
    headline: "Catering premium",
    city: "Mexico City",
    country: "Mexico",
    cover_url: "https://x/cover.png",
    logo_url: null,
    primary_event_types: ["boda"],
    average_rating: 4.8,
    reviews_count: 23,
    is_featured: false,
    response_time: "24h",
    ...overrides,
  };
}

function makeResponse(cards: unknown[], total: number, page = 1, limit = 20) {
  return { data: cards, total, page, limit, total_pages: Math.ceil(total / limit) || 0 };
}

function renderPage(initialPath = "/providers") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ProveedoresPage />
    </MemoryRouter>,
  );
}

describe("ProveedoresPage", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  it("renders hero title and search inputs", () => {
    server.use(
      http.get(`${API_BASE}/public/organizers`, () =>
        HttpResponse.json(makeResponse([], 0)),
      ),
    );
    renderPage();
    // Title (ES default in test env) + city placeholder.
    expect(screen.getByText(/proveedor perfecto/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ciudad/i)).toBeInTheDocument();
  });

  it("renders hub category chips and toggles service filter", async () => {
    server.use(
      http.get(`${API_BASE}/public/organizers`, () =>
        HttpResponse.json(makeResponse([], 0)),
      ),
    );
    renderPage();
    expect(screen.getByTestId("directory-hub-chips")).toBeInTheDocument();
    const catering = screen.getByTestId("hub-service-catering");
    fireEvent.click(catering);
    await waitFor(() => {
      expect(screen.getByTestId("service-category-select")).toHaveValue("catering");
    });
  });

  it("injects ItemList JSON-LD when results load", async () => {
    server.use(
      http.get(`${API_BASE}/public/organizers`, () =>
        HttpResponse.json(makeResponse([makeCard()], 1)),
      ),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Alice Catering")).toBeInTheDocument();
    });
    await waitFor(() => {
      const el = document.getElementById("providers-directory-jsonld");
      expect(el).toBeTruthy();
      const data = JSON.parse(el!.textContent || "{}");
      expect(data["@type"]).toBe("ItemList");
      expect(data.itemListElement?.[0]?.item?.name).toBe("Alice Catering");
    });
  });

  it("renders advanced filters (#1128 budget, service, date)", () => {
    server.use(
      http.get(`${API_BASE}/public/organizers`, () =>
        HttpResponse.json(makeResponse([], 0)),
      ),
    );
    renderPage();
    expect(screen.getByTestId("advanced-filters")).toBeInTheDocument();
    expect(screen.getByTestId("budget-select")).toBeInTheDocument();
    expect(screen.getByTestId("service-category-select")).toBeInTheDocument();
    expect(screen.getByTestId("available-on-input")).toBeInTheDocument();
  });

  it("shows featured strip when Business cards are present (#1129)", async () => {
    server.use(
      http.get(`${API_BASE}/public/organizers`, () =>
        HttpResponse.json(
          makeResponse(
            [
              makeCard({ slug: "biz-1", business_name: "Biz One", is_featured: true }),
              makeCard({ slug: "pro-1", business_name: "Pro One", is_featured: false }),
            ],
            2,
          ),
        ),
      ),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("featured-strip")).toBeInTheDocument();
    });
    expect(screen.getByText(/proveedores destacados/i)).toBeInTheDocument();
    // Featured appears in strip and still in full results (not removed).
    expect(screen.getAllByText("Biz One").length).toBeGreaterThanOrEqual(2);
  });

  it("hides featured strip when no Business cards", async () => {
    server.use(
      http.get(`${API_BASE}/public/organizers`, () =>
        HttpResponse.json(
          makeResponse([makeCard({ is_featured: false, business_name: "Only Pro" })], 1),
        ),
      ),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Only Pro")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("featured-strip")).not.toBeInTheDocument();
  });

  it("renders results grid on successful search", async () => {
    server.use(
      http.get(`${API_BASE}/public/organizers`, () =>
        HttpResponse.json(makeResponse([makeCard()], 1)),
      ),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Alice Catering")).toBeInTheDocument();
    });
  });

  it("shows empty state with clear CTA when 0 results", async () => {
    server.use(
      http.get(`${API_BASE}/public/organizers`, () =>
        HttpResponse.json(makeResponse([], 0)),
      ),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/sin resultados/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /limpiar filtros/i })).toBeInTheDocument();
  });

  it("clear CTA resets the search", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${API_BASE}/public/organizers`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(makeResponse([], 0));
      }),
    );
    renderPage("/providers?city=Nowhere&q=ghost");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /limpiar filtros/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /limpiar filtros/i }));
    // After clear, the URL should have no city/q params.
    await waitFor(() => {
      expect(capturedUrl).not.toContain("city=");
      expect(capturedUrl).not.toContain("q=");
    });
  });

  it("shows error state on 500", async () => {
    server.use(
      http.get(`${API_BASE}/public/organizers`, () =>
        HttpResponse.json({ error: "boom" }, { status: 500 }),
      ),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no pudimos cargar el directorio/i)).toBeInTheDocument();
    });
  });

  it("renders pagination when total_pages > 1", async () => {
    server.use(
      http.get(`${API_BASE}/public/organizers`, () =>
        HttpResponse.json(makeResponse([makeCard()], 50, 1, 20)),
      ),
    );
    renderPage();
    await waitFor(() => {
      // Pagination nav present (total_pages=3).
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });
  });

  it("does not render pagination when only one page", async () => {
    server.use(
      http.get(`${API_BASE}/public/organizers`, () =>
        HttpResponse.json(makeResponse([makeCard()], 1)),
      ),
    );
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Alice Catering")).toBeInTheDocument();
    });
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("shows skeletons on first load (aria-busy)", async () => {
    // Never-resolving handler so loading state persists.
    server.use(
      http.get(`${API_BASE}/public/organizers`, async () => {
        await new Promise(() => {}); // hangs
      }),
    );
    renderPage();
    expect(screen.getByRole("status", { busy: true })).toBeInTheDocument();
  });

  it("renders Near me geo button", () => {
    server.use(
      http.get(`${API_BASE}/public/organizers`, () =>
        HttpResponse.json(makeResponse([], 0)),
      ),
    );
    renderPage();
    expect(screen.getByTestId("geo-near-me-btn")).toBeInTheDocument();
  });
});
