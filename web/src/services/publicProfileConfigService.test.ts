import { describe, it, expect, vi, beforeEach } from "vitest";
import { publicProfileConfigService } from "./publicProfileConfigService";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    postFormData: vi.fn(),
  },
}));

describe("publicProfileConfigService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getMyPublicProfile calls GET /users/me/public-profile and unwraps data", async () => {
    const profile = { user_id: "u1", is_enabled: true, show_prices: false };
    (api.get as any).mockResolvedValue({ data: profile });

    await expect(publicProfileConfigService.getMyPublicProfile()).resolves.toEqual(profile);
    expect(api.get).toHaveBeenCalledWith("/users/me/public-profile");
  });

  it("upsertMyPublicProfile calls PUT /users/me/public-profile with the body and unwraps data", async () => {
    const saved = { user_id: "u1", is_enabled: true };
    (api.put as any).mockResolvedValue({ data: saved });

    const body = { is_enabled: true, public_slug: "alice" };
    await expect(
      publicProfileConfigService.upsertMyPublicProfile(body as any),
    ).resolves.toEqual(saved);
    expect(api.put).toHaveBeenCalledWith("/users/me/public-profile", body);
  });

  it("listPortfolio calls GET portfolio path", async () => {
    const items = [{ id: "i1", title: "Gala", photo_url: "https://x", sort_order: 0 }];
    (api.get as any).mockResolvedValue(items);

    await expect(publicProfileConfigService.listPortfolio()).resolves.toEqual(items);
    expect(api.get).toHaveBeenCalledWith("/users/me/public-profile/portfolio");
  });

  it("createPortfolioItem posts title + photo_url", async () => {
    const created = { id: "i2", title: "Gala", photo_url: "https://x", sort_order: 1 };
    (api.post as any).mockResolvedValue(created);

    const body = { title: "Gala", photo_url: "https://x", sort_order: 1 };
    await expect(publicProfileConfigService.createPortfolioItem(body)).resolves.toEqual(created);
    expect(api.post).toHaveBeenCalledWith("/users/me/public-profile/portfolio", body);
  });

  it("deletePortfolioItem calls DELETE with id", async () => {
    (api.delete as any).mockResolvedValue({});
    await publicProfileConfigService.deletePortfolioItem("abc");
    expect(api.delete).toHaveBeenCalledWith("/users/me/public-profile/portfolio/abc");
  });
});
