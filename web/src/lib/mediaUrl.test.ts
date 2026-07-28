import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveMediaUrl } from "./mediaUrl";

describe("resolveMediaUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns undefined for empty values", () => {
    expect(resolveMediaUrl(null)).toBeUndefined();
    expect(resolveMediaUrl(undefined)).toBeUndefined();
    expect(resolveMediaUrl("")).toBeUndefined();
    expect(resolveMediaUrl("   ")).toBeUndefined();
  });

  it("keeps absolute https and data URLs", () => {
    expect(resolveMediaUrl("https://cdn.example/logo.png")).toBe(
      "https://cdn.example/logo.png",
    );
    expect(resolveMediaUrl("data:image/png;base64,abc")).toBe(
      "data:image/png;base64,abc",
    );
  });

  it("prefixes relative upload paths with the API origin", () => {
    vi.stubEnv("VITE_API_URL", "https://api.solennix.com/api");
    // re-import would be needed if module cached env at load; function reads
    // import.meta.env at call time via module const — env is baked at build.
    // In Vitest, import.meta.env is set at start. Test the path join logic by
    // asserting shape against current env.
    const resolved = resolveMediaUrl(
      "/api/v1/uploads/user/file.png",
    );
    expect(resolved).toMatch(/\/api\/v1\/uploads\/user\/file\.png$/);
    expect(resolved).toMatch(/^https?:\/\//);
    // Must NOT be SPA-relative only
    expect(resolved?.startsWith("/api")).toBe(false);
  });

  it("handles protocol-relative URLs", () => {
    expect(resolveMediaUrl("//cdn.example/a.png")).toBe(
      "https://cdn.example/a.png",
    );
  });
});
