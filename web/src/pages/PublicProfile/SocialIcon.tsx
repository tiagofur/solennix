import type { SVGProps } from "react";
import { ExternalLink } from "lucide-react";
import { BRAND_PATHS } from "./socialUtils";

/**
 * SocialIcon renders a branded glyph for known social platforms, keyed off the
 * `socials` map keys (`{ platform: url }`). Brand SVGs are inlined from the
 * Simple Icons project (CC0) to avoid a runtime icon-font dependency while
 * keeping recognizable glyphs for the platforms event businesses rely on
 * (Instagram, TikTok, etc.). Unknown platforms fall back to a generic
 * ExternalLink icon so no key renders blank.
 *
 * The label is intentionally NOT derived from the platform key here — the
 * caller renders the (capitalized) platform name as the link text, so the icon
 * is purely decorative and `aria-hidden`.
 */
export function SocialIcon({
  platform,
  className,
}: {
  platform: string;
  className?: string;
}) {
  const path = BRAND_PATHS[platform.toLowerCase()];
  if (!path) {
    return <ExternalLink className={className} aria-hidden="true" />;
  }
  const svgProps: SVGProps<SVGSVGElement> = {
    viewBox: "0 0 24 24",
    fill: "currentColor",
    "aria-hidden": true,
    className,
  };
  return (
    <svg {...svgProps}>
      <path d={path} />
    </svg>
  );
}
