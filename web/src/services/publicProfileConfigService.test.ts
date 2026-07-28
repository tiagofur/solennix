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

  it("listServices calls GET services path", async () => {
    const items = [
      {
        id: "p1",
        name: "Catering",
        category: "main",
        base_price: 100,
        show_on_public_profile: true,
      },
    ];
    (api.get as any).mockResolvedValue(items);

    await expect(publicProfileConfigService.listServices()).resolves.toEqual(items);
    expect(api.get).toHaveBeenCalledWith("/users/me/public-profile/services");
  });

  it("setServices puts product_ids bulk selection", async () => {
    const items = [
      {
        id: "p1",
        name: "Catering",
        category: "main",
        base_price: 100,
        show_on_public_profile: true,
      },
    ];
    (api.put as any).mockResolvedValue(items);

    await expect(publicProfileConfigService.setServices(["p1", "p2"])).resolves.toEqual(
      items,
    );
    expect(api.put).toHaveBeenCalledWith("/users/me/public-profile/services", {
      product_ids: ["p1", "p2"],
    });
  });

  it("listPortfolioCandidates calls candidates path", async () => {
    const items = [
      {
        id: "e1",
        service_type: "Wedding",
        event_date: "2024-06-15",
        photos: [{ id: "ph1", url: "https://x" }],
      },
    ];
    (api.get as any).mockResolvedValue(items);

    await expect(publicProfileConfigService.listPortfolioCandidates()).resolves.toEqual(
      items,
    );
    expect(api.get).toHaveBeenCalledWith(
      "/users/me/public-profile/portfolio/candidates",
    );
  });

  it("createPortfolioItem posts event_id primary path", async () => {
    const created = {
      id: "i2",
      title: "Wedding",
      photo_url: "https://x",
      sort_order: 1,
      event_id: "e1",
    };
    (api.post as any).mockResolvedValue(created);

    const body = { event_id: "e1", photo_id: "ph1" };
    await expect(publicProfileConfigService.createPortfolioItem(body)).resolves.toEqual(
      created,
    );
    expect(api.post).toHaveBeenCalledWith("/users/me/public-profile/portfolio", body);
  });

  it("deletePortfolioItem calls DELETE with id", async () => {
    (api.delete as any).mockResolvedValue({});
    await publicProfileConfigService.deletePortfolioItem("abc");
    expect(api.delete).toHaveBeenCalledWith("/users/me/public-profile/portfolio/abc");
  });
});
