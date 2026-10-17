import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useDynamicManifestStartUrl } from "./useDynamicManifestStartUrl";

const MANIFEST_HREF = "/manifest.webmanifest";
const BASE_MANIFEST = { name: "Solennix", start_url: "/dashboard" };

describe("useDynamicManifestStartUrl", () => {
  let link: HTMLLinkElement;
  let createdBlobs: Blob[];

  beforeEach(() => {
    createdBlobs = [];
    link = document.createElement("link");
    link.setAttribute("rel", "manifest");
    link.setAttribute("href", MANIFEST_HREF);
    document.head.appendChild(link);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ...BASE_MANIFEST }),
      }),
    );
    vi.stubGlobal(
      "URL",
      Object.assign(URL, {
        createObjectURL: vi.fn((blob: Blob) => {
          createdBlobs.push(blob);
          return "blob:mock-manifest";
        }),
        revokeObjectURL: vi.fn(),
      }),
    );
    window.history.pushState({}, "", "/providers?from=landing");
  });

  afterEach(() => {
    link.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("swaps manifest href with current path as start_url", async () => {
    renderHook(() => useDynamicManifestStartUrl());
    await waitFor(() => {
      expect(link.getAttribute("href")).toBe("blob:mock-manifest");
    });
    expect(createdBlobs).toHaveLength(1);
    const swapped = JSON.parse(await createdBlobs[0].text());
    expect(swapped.start_url).toBe("/providers?from=landing");
    expect(swapped.name).toBe("Solennix");
  });

  it("restores the original href on unmount", async () => {
    const { unmount } = renderHook(() => useDynamicManifestStartUrl());
    await waitFor(() => {
      expect(link.getAttribute("href")).toBe("blob:mock-manifest");
    });
    unmount();
    expect(link.getAttribute("href")).toBe(MANIFEST_HREF);
  });

  it("keeps the static manifest when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("offline")),
    );
    renderHook(() => useDynamicManifestStartUrl());
    await new Promise((r) => setTimeout(r, 50));
    expect(link.getAttribute("href")).toBe(MANIFEST_HREF);
  });

  it("does nothing without a manifest link", () => {
    link.remove();
    expect(() => renderHook(() => useDynamicManifestStartUrl())).not.toThrow();
  });
});
