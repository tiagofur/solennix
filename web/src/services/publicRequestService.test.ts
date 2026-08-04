import { describe, it, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { publicRequestService, PublicRequestError } from "./publicRequestService";
import { server } from "../../tests/mocks/server";

const API_BASE = "http://localhost:8080/api";

const validPayload = {
  contact_email: "client@example.com",
  currency: "MXN",
};

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: "req-1",
    contact_email: "client@example.com",
    status: "pending",
    currency: "MXN",
    ...overrides,
  };
}

describe("publicRequestService", () => {
  beforeEach(() => {
    server.resetHandlers();
  });

  describe("submit", () => {
    it("returns the created request on 201 (wrapped in { data })", async () => {
      server.use(
        http.post(`${API_BASE}/public/organizers/alice/requests`, () =>
          HttpResponse.json({ data: makeRequest() }, { status: 201 }),
        ),
      );
      const result = await publicRequestService.submit("alice", validPayload);
      expect(result.id).toBe("req-1");
      expect(result.status).toBe("pending");
    });

    it("returns client_token when present on create response", async () => {
      server.use(
        http.post(`${API_BASE}/public/organizers/alice/requests`, () =>
          HttpResponse.json(
            { data: makeRequest({ client_token: "tok-abc" }) },
            { status: 201 },
          ),
        ),
      );
      const result = await publicRequestService.submit("alice", validPayload);
      expect(result.client_token).toBe("tok-abc");
    });

    it("forwards honeypot website field when provided", async () => {
      let capturedBody: Record<string, unknown> = {};
      server.use(
        http.post(`${API_BASE}/public/organizers/alice/requests`, async ({ request }) => {
          capturedBody = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ data: makeRequest() }, { status: 201 });
        }),
      );
      await publicRequestService.submit("alice", { ...validPayload, website: "" });
      expect(capturedBody.website).toBe("");
    });

    it("accepts a bare object response (no { data } wrapper)", async () => {
      server.use(
        http.post(`${API_BASE}/public/organizers/alice/requests`, () =>
          HttpResponse.json(makeRequest({ id: "bare-1" }), { status: 201 }),
        ),
      );
      const result = await publicRequestService.submit("alice", validPayload);
      expect(result.id).toBe("bare-1");
    });

    it("posts the payload as JSON with content-type header", async () => {
      let capturedBody: string | null = null;
      let capturedContentType: string | null = null;
      server.use(
        http.post(`${API_BASE}/public/organizers/alice/requests`, ({ request }) => {
          capturedContentType = request.headers.get("content-type");
          return request.text().then((b) => {
            capturedBody = b;
            return HttpResponse.json({ data: makeRequest() }, { status: 201 });
          });
        }),
      );
      await publicRequestService.submit("alice", {
        ...validPayload,
        event_type: "boda",
        service_ids: ["s1", "s2"],
      });
      expect(capturedContentType).toBe("application/json");
      const parsed = JSON.parse(capturedBody!);
      expect(parsed.contact_email).toBe("client@example.com");
      expect(parsed.event_type).toBe("boda");
      expect(parsed.service_ids).toEqual(["s1", "s2"]);
    });

    it("throws PublicRequestError with code='inbox_full' on 429", async () => {
      server.use(
        http.post(`${API_BASE}/public/organizers/alice/requests`, () =>
          HttpResponse.json(
            { error: "inbox_full", message: "This organizer's inbox is full." },
            { status: 429 },
          ),
        ),
      );
      try {
        await publicRequestService.submit("alice", validPayload);
        throw new Error("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(PublicRequestError);
        expect((err as PublicRequestError).status).toBe(429);
        expect((err as PublicRequestError).code).toBe("inbox_full");
        expect((err as PublicRequestError).message).toContain("inbox is full");
      }
    });

    it("throws PublicRequestError with status 400 on invalid body", async () => {
      server.use(
        http.post(`${API_BASE}/public/organizers/alice/requests`, () =>
          HttpResponse.json(
            { error: "invalid_services", message: "Invalid service_ids" },
            { status: 400 },
          ),
        ),
      );
      try {
        await publicRequestService.submit("alice", validPayload);
        throw new Error("should have thrown");
      } catch (err) {
        expect((err as PublicRequestError).status).toBe(400);
        expect((err as PublicRequestError).code).toBe("invalid_services");
      }
    });

    it("throws PublicRequestError with status 404 on disabled profile", async () => {
      server.use(
        http.post(`${API_BASE}/public/organizers/ghost/requests`, () =>
          HttpResponse.json({ error: "not_found" }, { status: 404 }),
        ),
      );
      await expect(
        publicRequestService.submit("ghost", validPayload),
      ).rejects.toThrow(PublicRequestError);
    });

    it("falls back to default message when body is not JSON", async () => {
      server.use(
        http.post(`${API_BASE}/public/organizers/alice/requests`, () =>
          new HttpResponse("Server Error", { status: 500 }),
        ),
      );
      try {
        await publicRequestService.submit("alice", validPayload);
        throw new Error("should have thrown");
      } catch (err) {
        expect((err as PublicRequestError).status).toBe(500);
        expect((err as PublicRequestError).code).toBeUndefined();
        expect((err as PublicRequestError).message).toContain("500");
      }
    });

    it("encodes the slug in the URL", async () => {
      let capturedUrl = "";
      server.use(
        http.post(`${API_BASE}/public/organizers/*`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json({ data: makeRequest() }, { status: 201 });
        }),
      );
      await publicRequestService.submit("alice & bob", validPayload);
      expect(capturedUrl).toContain("alice%20%26%20bob");
    });
  });

  describe("clientAction", () => {
    it("posts action with X-Request-Token header", async () => {
      let capturedAction: string | null = null;
      let capturedToken: string | null = null;
      server.use(
        http.post(`${API_BASE}/public/requests/req-1/action`, async ({ request }) => {
          capturedToken = request.headers.get("X-Request-Token");
          const body = (await request.json()) as { action: string };
          capturedAction = body.action;
          return new HttpResponse(null, { status: 200 });
        }),
      );
      await publicRequestService.clientAction("req-1", "tok-xyz", "accept");
      expect(capturedToken).toBe("tok-xyz");
      expect(capturedAction).toBe("accept");
    });

    it("throws PublicRequestError on 401", async () => {
      server.use(
        http.post(`${API_BASE}/public/requests/req-1/action`, () =>
          HttpResponse.json({ error: "unauthorized" }, { status: 401 }),
        ),
      );
      await expect(
        publicRequestService.clientAction("req-1", "bad", "decline"),
      ).rejects.toThrow(PublicRequestError);
    });
  });
});
