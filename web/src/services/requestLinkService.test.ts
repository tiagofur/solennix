import { describe, it, expect, beforeEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { requestLinkService } from "./requestLinkService";
import { PublicRequestError } from "./publicRequestService";
import { server } from "../../tests/mocks/server";

const API_BASE = "http://localhost:8080/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from "@/lib/api";

const mockLink = {
  id: "link-1",
  token: "abc123",
  label: "Paquete XV",
  status: "active" as const,
  submit_mode: "auto_event" as const,
  max_uses: 1,
  use_count: 0,
  expires_at: "2026-12-01T00:00:00Z",
  url: "http://localhost:5173/s/abc123",
};

describe("requestLinkService", () => {
  beforeEach(() => {
    server.resetHandlers();
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.delete).mockReset();
  });

  describe("listLinks", () => {
    it("unwraps { data } list from auth endpoint", async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [mockLink] });
      const result = await requestLinkService.listLinks();
      expect(api.get).toHaveBeenCalledWith("/organizers/me/request-links");
      expect(result).toEqual([mockLink]);
    });

    it("accepts bare array response", async () => {
      vi.mocked(api.get).mockResolvedValue([mockLink]);
      const result = await requestLinkService.listLinks();
      expect(result).toHaveLength(1);
    });

    it("returns empty array when data is missing", async () => {
      vi.mocked(api.get).mockResolvedValue({});
      const result = await requestLinkService.listLinks();
      expect(result).toEqual([]);
    });
  });

  describe("createLink", () => {
    it("posts body and unwraps created link", async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockLink });
      const result = await requestLinkService.createLink({
        label: "Paquete XV",
        ttl_days: 7,
        max_uses: 1,
        submit_mode: "auto_event",
      });
      expect(api.post).toHaveBeenCalledWith("/organizers/me/request-links", {
        label: "Paquete XV",
        ttl_days: 7,
        max_uses: 1,
        submit_mode: "auto_event",
      });
      expect(result.id).toBe("link-1");
      expect(result.url).toContain("/s/");
    });
  });

  describe("revokeLink", () => {
    it("DELETE request-links/{id}", async () => {
      vi.mocked(api.delete).mockResolvedValue({});
      await requestLinkService.revokeLink("link-1");
      expect(api.delete).toHaveBeenCalledWith(
        "/organizers/me/request-links/link-1",
      );
    });
  });

  describe("getPublicLink", () => {
    it("returns branding + catalog on 200", async () => {
      const payload = {
        link_id: "link-1",
        submit_mode: "auto_event",
        label: "Paquete",
        expires_at: null,
        organizer: {
          business_name: "Alice",
          brand_color: "#112233",
          logo_url: null,
        },
        products: [{ id: "p1", name: "DJ", category: "music", base_price: 500 }],
        profile_enabled: true,
      };
      server.use(
        http.get(`${API_BASE}/public/request-links/tok-1`, () =>
          HttpResponse.json({ data: payload }, { status: 200 }),
        ),
      );
      const result = await requestLinkService.getPublicLink("tok-1");
      expect(result.submit_mode).toBe("auto_event");
      expect(result.organizer.business_name).toBe("Alice");
      expect(result.products).toHaveLength(1);
    });

    it("throws PublicRequestError with code link_invalid on 410", async () => {
      server.use(
        http.get(`${API_BASE}/public/request-links/gone`, () =>
          HttpResponse.json(
            {
              error: "link_invalid",
              message: "Este enlace ya no es válido o ha expirado.",
            },
            { status: 410 },
          ),
        ),
      );
      try {
        await requestLinkService.getPublicLink("gone");
        throw new Error("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(PublicRequestError);
        expect((err as PublicRequestError).status).toBe(410);
        expect((err as PublicRequestError).code).toBe("link_invalid");
      }
    });

    it("throws on 404", async () => {
      server.use(
        http.get(`${API_BASE}/public/request-links/missing`, () =>
          HttpResponse.json({ error: "not_found" }, { status: 404 }),
        ),
      );
      await expect(
        requestLinkService.getPublicLink("missing"),
      ).rejects.toThrow(PublicRequestError);
    });
  });

  describe("submitRequest", () => {
    it("posts payload and returns create result", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(
          `${API_BASE}/public/request-links/tok-1/requests`,
          async ({ request }) => {
            capturedBody = (await request.json()) as Record<string, unknown>;
            return HttpResponse.json(
              {
                data: {
                  id: "req-1",
                  client_token: "ctok",
                  status: "booked",
                  event_id: "evt-1",
                },
              },
              { status: 201 },
            );
          },
        ),
      );
      const result = await requestLinkService.submitRequest("tok-1", {
        contact_name: "Ana",
        contact_phone: "+52111",
        contact_email: "ana@example.com",
        event_type: "wedding",
        event_date: "2026-11-20",
        guest_count: 80,
        currency: "MXN",
        services: [{ product_id: "p1", qty: 2 }],
        website: "",
      });
      expect(result.id).toBe("req-1");
      expect(result.status).toBe("booked");
      expect(result.event_id).toBe("evt-1");
      expect(capturedBody.contact_phone).toBe("+52111");
      expect(capturedBody.services).toEqual([{ product_id: "p1", qty: 2 }]);
      expect(capturedBody.website).toBe("");
    });

    it("throws PublicRequestError on 429 inbox_full", async () => {
      server.use(
        http.post(`${API_BASE}/public/request-links/tok-1/requests`, () =>
          HttpResponse.json(
            { error: "inbox_full", message: "inbox full" },
            { status: 429 },
          ),
        ),
      );
      try {
        await requestLinkService.submitRequest("tok-1", {
          contact_email: "a@b.com",
          currency: "MXN",
        });
        throw new Error("should have thrown");
      } catch (err) {
        expect((err as PublicRequestError).code).toBe("inbox_full");
        expect((err as PublicRequestError).status).toBe(429);
      }
    });
  });
});
