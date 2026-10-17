import { useEffect } from "react";

/**
 * Overrides the PWA manifest start_url with the current inbound route so a
 * visitor who installs the app from /providers or /u/:slug launches back
 * into that page instead of /dashboard (which bounces unauthenticated
 * users to /login). The static manifest keeps start_url /dashboard for
 * organizer installs; this hook swaps the link href to a Blob manifest
 * while the inbound page is mounted and restores it on unmount.
 * Best-effort: any failure keeps the static manifest.
 */
export function useDynamicManifestStartUrl() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const link =
      document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;
    const originalHref = link.getAttribute("href");
    if (!originalHref) return;

    let objectUrl: string | null = null;
    let cancelled = false;

    fetch(originalHref)
      .then((res) => (res.ok ? res.json() : null))
      .then((manifest: unknown) => {
        if (cancelled || !manifest || typeof manifest !== "object") return;
        const next = {
          ...(manifest as Record<string, unknown>),
          start_url: window.location.pathname + window.location.search,
        };
        objectUrl = URL.createObjectURL(
          new Blob([JSON.stringify(next)], {
            type: "application/manifest+json",
          }),
        );
        link.setAttribute("href", objectUrl);
      })
      .catch(() => {
        // Keep the static manifest on failure.
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      link.setAttribute("href", originalHref);
    };
  }, []);
}
