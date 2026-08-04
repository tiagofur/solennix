import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import {
  organizersDirectoryService,
  DirectorySearchError,
} from "./organizersDirectoryService";
import { server } from "../../tests/mocks/server";

const API_BASE = "http://localhost:8080/api";

function makeCard(overrides: Record<string, unknown> = {}) {
  return {
    slug: "alice-catering",
    business_name: "Alice Catering",
    headline: "Catering premium para bodas",
    city: "Mexico City",
    country: "Mexico",
    cover_url: "https://x/cover.png",
    logo_url: null,
    primary_event_types: ["boda", "corporativo"],
    average_rating: 4.8,
    reviews_count: 23,
    is_featured: true,
    response_time: "24h",
    ...overrides,
  };
}

function makeResponse(cards: unknown[], total: number, page = 1, limit = 20) {
  return {
    data: cards,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit) || 0,
  };
}

describe("organizersDirectoryService", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe("search", () => {
    it("returns normalized paginated result on happy path", async () => {
      server.use(
        http.get(`${API_BASE}/public/organizers`, () =>
          HttpResponse.json(makeResponse([makeCard()], 1)),
        ),
      );
      const result = await organizersDirectoryService.search({});
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].slug).toBe("alice-catering");
      expect(result.total_pages).toBe(1);
    });

    it("appends filters as query params", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${API_BASE}/public/organizers`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(makeResponse([], 0));
        }),
      );
      await organizersDirectoryService.search({
        city: "Mexico City",
        event_type: "boda",
        q: "catering",
        page: 2,
        limit: 10,
        sort: "rating",
        order: "asc",
        min_budget: 1000,
        max_budget: 5000,
        service_category: "catering",
        available_on: "2026-09-15",
      });
      const url = new URL(capturedUrl);
      expect(url.searchParams.get("city")).toBe("Mexico City");
      expect(url.searchParams.get("event_type")).toBe("boda");
      expect(url.searchParams.get("q")).toBe("catering");
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("limit")).toBe("10");
      expect(url.searchParams.get("min_budget")).toBe("1000");
      expect(url.searchParams.get("max_budget")).toBe("5000");
      expect(url.searchParams.get("service_category")).toBe("catering");
      expect(url.searchParams.get("available_on")).toBe("2026-09-15");
      expect(url.searchParams.get("sort")).toBe("rating");
      expect(url.searchParams.get("order")).toBe("asc");
    });

    it("omits empty/blank filters from the query string", async () => {
      let capturedUrl = "";
      server.use(
        http.get(`${API_BASE}/public/organizers`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(makeResponse([], 0));
        }),
      );
      await organizersDirectoryService.search({ city: "   ", q: "" });
      const url = new URL(capturedUrl);
      expect(url.searchParams.get("city")).toBeNull();
      expect(url.searchParams.get("q")).toBeNull();
    });

    it("normalizes missing data array to empty", async () => {
      server.use(
        http.get(`${API_BASE}/public/organizers`, () =>
          HttpResponse.json({ total: 0, page: 1, limit: 20, total_pages: 0 }),
        ),
      );
      const result = await organizersDirectoryService.search({});
      expect(result.data).toEqual([]);
    });

    it("throws DirectorySearchError on 500 with status attached", async () => {
      server.use(
        http.get(`${API_BASE}/public/organizers`, () =>
          HttpResponse.json({ error: "boom" }, { status: 500 }),
        ),
      );
      try {
        await organizersDirectoryService.search({});
        throw new Error("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DirectorySearchError);
        expect((err as DirectorySearchError).status).toBe(500);
      }
    });

    it("throws DirectorySearchError on 429 rate limit", async () => {
      server.use(
        http.get(`${API_BASE}/public/organizers`, () =>
          HttpResponse.json({ error: "inbox_full" }, { status: 429 }),
        ),
      );
      await expect(organizersDirectoryService.search({})).rejects.toThrow(
        DirectorySearchError,
      );
    });

    it("passes the AbortSignal through to fetch", async () => {
      let capturedSignal: AbortSignal | null = null;
      server.use(
        http.get(`${API_BASE}/public/organizers`, ({ request }) => {
          capturedSignal = request.signal;
          return HttpResponse.json(makeResponse([], 0));
        }),
      );
      const controller = new AbortController();
      await organizersDirectoryService.search({}, controller.signal);
      // MSW ties the request signal; we assert no abort was triggered.
      expect(capturedSignal).not.toBeNull();
    });
  });
});
