import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  publicProfileService,
  PublicProfileNotFoundError,
} from "./publicProfileService";

describe("publicProfileService", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("getBySlug calls GET /public/organizers/{slug} and unwraps data", async () => {
    const profile = {
      slug: "alice",
      business_name: "Alice Events",
      headline: "Weddings",
    };
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: profile }),
    });

    await expect(publicProfileService.getBySlug("alice")).resolves.toEqual(
      profile,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/public\/organizers\/alice$/),
      expect.objectContaining({ signal: undefined }),
    );
  });

  it("getBySlug rewrites relative logo/service/portfolio media to absolute API URLs", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          slug: "solennix",
          logo_url: "/api/v1/uploads/u/logo.png",
          services: [
            {
              id: "s1",
              name: "Pack",
              category: "main",
              image_url: "/api/v1/uploads/u/svc.png",
            },
          ],
          portfolio: [
            {
              id: "p1",
              title: "Evento",
              photo_url: "/api/v1/uploads/u/photo.png",
              thumbnail_url: "/api/v1/uploads/u/thumb.png",
              sort_order: 0,
            },
          ],
        },
      }),
    });

    const profile = await publicProfileService.getBySlug("solennix");

    expect(profile.logo_url).toMatch(/^https?:\/\//);
    expect(profile.logo_url).toContain("/api/v1/uploads/u/logo.png");
    expect(profile.services?.[0]?.image_url).toMatch(/^https?:\/\//);
    expect(profile.portfolio?.[0]?.photo_url).toMatch(/^https?:\/\//);
    expect(profile.portfolio?.[0]?.thumbnail_url).toMatch(/^https?:\/\//);
  });

  it("getBySlug encodes the slug in the path", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { slug: "a-b" } }),
    });

    await publicProfileService.getBySlug("a/b");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/public/organizers/a%2Fb"),
      expect.any(Object),
    );
  });

  it("getBySlug throws PublicProfileNotFoundError on 404", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Profile not found" }),
    });

    await expect(publicProfileService.getBySlug("missing")).rejects.toBeInstanceOf(
      PublicProfileNotFoundError,
    );
  });

  it("getBySlug throws a generic Error on non-404 failures", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    });

    await expect(publicProfileService.getBySlug("alice")).rejects.toThrow(
      /Failed to load profile \(500\)/,
    );
  });

  it("getBySlug forwards AbortSignal", async () => {
    const controller = new AbortController();
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { slug: "alice" } }),
    });

    await publicProfileService.getBySlug("alice", controller.signal);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
