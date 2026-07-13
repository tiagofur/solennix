import { useSyncExternalStore } from "react";

/**
 * Tailwind v4 default breakpoints (px). See index.css `@theme` — no overrides.
 * Used by the master-detail split pane (#879) to gate the xl layout.
 */
const XL_PX = 1280;

const XL_QUERY = `(min-width: ${XL_PX}px)`;

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia(XL_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(XL_QUERY).matches;
}

// SSR / non-DOM fallback: treat as narrow viewport.
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Returns `true` when the viewport is at least the Tailwind `xl` breakpoint
 * (1280px). SSR-safe (returns `false` on the server). Re-renders on resize
 * across the boundary only.
 */
export function useIsXl(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
