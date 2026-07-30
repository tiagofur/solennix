import { describe, expect, it } from "vitest";
import { render, screen } from "@tests/customRender";
import { SocialIcon } from "./SocialIcon";
import { isKnownSocialPlatform } from "./socialUtils";

describe("SocialIcon", () => {
  it("renders a branded <svg> for known platforms", () => {
    const { container } = render(<SocialIcon platform="instagram" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Branded icons carry an inline path; the generic fallback (ExternalLink)
    // is also an svg, so distinguish by the aria-hidden decorative marker and
    // presence of a <path> child.
    expect(svg?.querySelector("path")).not.toBeNull();
  });

  it("matches platform keys case-insensitively", () => {
    const { container } = render(<SocialIcon platform="Instagram" />);
    expect(container.querySelector("svg path")).not.toBeNull();
    expect(isKnownSocialPlatform("INSTAGRAM")).toBe(true);
  });

  it("supports all documented brand platforms", () => {
    const platforms = [
      "instagram",
      "facebook",
      "tiktok",
      "whatsapp",
      "youtube",
      "x",
      "twitter",
      "linkedin",
      "pinterest",
    ];
    for (const p of platforms) {
      expect(isKnownSocialPlatform(p)).toBe(true);
    }
  });

  it("falls back to the generic icon for unknown platforms", () => {
    // Unknown platforms must still render something (no blank link) — the
    // fallback is lucide's ExternalLink. isKnownSocialPlatform distinguishes.
    expect(isKnownSocialPlatform("myspace")).toBe(false);
    const { container } = render(<SocialIcon platform="myspace" />);
    expect(container.querySelector("svg")).not.toBeNull();
    // The fallback ExternalLink from lucide renders a <line>/<polyline> set,
    // not a single filled <path> like the brand glyphs. Either way it renders.
    expect(screen.queryByRole("img")).toBeNull(); // decorative (aria-hidden)
  });
});
