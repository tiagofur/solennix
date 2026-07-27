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
});
