import { describe, it, expect, beforeEach, vi } from "vitest";
import { organizerRequestsService } from "./organizerRequestsService";

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock("@/lib/api", () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

describe("organizerRequestsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("list returns paginated data", async () => {
    getMock.mockResolvedValue({
      data: [{ id: "r1", status: "pending" }],
      total: 1,
      page: 1,
      limit: 20,
      total_pages: 1,
    });
    const res = await organizerRequestsService.list({ status: "pending" });
    expect(getMock).toHaveBeenCalledWith("/organizers/me/requests", {
      status: "pending",
    });
    expect(res.data).toHaveLength(1);
    expect(res.total).toBe(1);
  });

  it("unreadCount reads nested count", async () => {
    getMock.mockResolvedValue({ data: { count: 3 } });
    await expect(organizerRequestsService.unreadCount()).resolves.toBe(3);
  });

  it("get merges request + responses from detail payload", async () => {
    getMock.mockResolvedValue({
      data: {
        request: { id: "r1", status: "responded", contact_email: "a@b.co" },
        responses: [{ id: "resp-1", quote_amount: 500, currency: "MXN" }],
      },
    });
    const res = await organizerRequestsService.get("r1");
    expect(getMock).toHaveBeenCalledWith("/organizers/me/requests/r1");
    expect(res.id).toBe("r1");
    expect(res.contact_email).toBe("a@b.co");
    expect(res.responses).toHaveLength(1);
    expect(res.responses?.[0].quote_amount).toBe(500);
  });

  it("markRead posts to /read", async () => {
    postMock.mockResolvedValue({});
    await organizerRequestsService.markRead("r1");
    expect(postMock).toHaveBeenCalledWith("/organizers/me/requests/r1/read", {});
  });

  it("respond posts quote payload", async () => {
    postMock.mockResolvedValue({
      data: { id: "resp-1", quote_amount: 1000, currency: "MXN" },
    });
    const res = await organizerRequestsService.respond("r1", {
      quote_amount: 1000,
      currency: "MXN",
      message: "Hi",
    });
    expect(postMock).toHaveBeenCalledWith(
      "/organizers/me/requests/r1/responses",
      { quote_amount: 1000, currency: "MXN", message: "Hi" },
    );
    expect(res.quote_amount).toBe(1000);
  });

  it("decline posts optional reason", async () => {
    postMock.mockResolvedValue({});
    await organizerRequestsService.decline("r1", "busy");
    expect(postMock).toHaveBeenCalledWith("/organizers/me/requests/r1/decline", {
      reason: "busy",
    });
  });

  it("convertToEvent returns event_id", async () => {
    postMock.mockResolvedValue({ data: { event_id: "evt-9" } });
    const res = await organizerRequestsService.convertToEvent("r1");
    expect(res.event_id).toBe("evt-9");
  });
});
