/**
 * SEO helpers for client-side meta tag + JSON-LD management (#1119).
 * Extracted from PublicProfilePage so other public pages (ProveedoresPage,
 * future landing pages) can reuse them without duplicating DOM manipulation.
 */

/** Upserts a <meta> tag in <head> by attribute (name or property). */
export function upsertMeta(attr: "name" | "property", key: string, content: string): void {
  if (typeof document === "undefined") return;
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/** Upserts a <script type="application/ld+json"> tag by id (replaces if exists). */
export function setJsonLd(id: string, data: unknown): void {
  if (typeof document === "undefined") return;
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** Sets document.title (no-react-hook — just a DOM mutation helper). */
export function setDocumentTitle(title: string): void {
  if (typeof document === "undefined") return;
  document.title = title;
}

/** Removes a JSON-LD script by id (cleanup when leaving the page). */
export function removeJsonLd(id: string): void {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.remove();
}
