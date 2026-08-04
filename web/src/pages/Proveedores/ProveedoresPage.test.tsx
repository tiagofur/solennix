import { describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { render } from "@tests/customRender";
import { server } from "../../../tests/mocks/server";
import { ProveedoresPage } from "./ProveedoresPage";

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
    is_featured: true,
    response_time: "24h",
    ...overrides,
  };
}

function makeResponse(cards: unknown[], total: number, page = 1, limit = 20) {
  return { data: cards, total, page, limit, total_pages: Math.ceil(total / limit) || 0 };
}

function renderPage(initialPath = "/proveedores") {
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
    renderPage("/proveedores?city=Nowhere&q=ghost");
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
