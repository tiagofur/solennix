/**
 * Resolve media URLs returned by the API for use on the SPA origin.
 *
 * Upload paths are stored as site-relative paths (e.g. `/api/v1/uploads/...`).
 * On `solennix.com` the browser would load them from the frontend host and get
 * HTML instead of the image. Prefix with the API origin when needed.
 */
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export function resolveMediaUrl(
  url: string | null | undefined,
): string | undefined {
  if (url == null) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Absolute or data URLs are already usable as <img src>.
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  // Protocol-relative
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  try {
    const origin = new URL(API_BASE).origin;
    if (trimmed.startsWith("/")) {
      return `${origin}${trimmed}`;
    }
    // Bare path without leading slash
    return `${origin}/${trimmed}`;
  } catch {
    return trimmed;
  }
}
