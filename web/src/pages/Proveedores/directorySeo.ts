/**
 * Pure SEO helpers for the public providers directory hub (/providers).
 * Keeps title/description/JSON-LD construction free of React for unit tests.
 */

export const DIRECTORY_SITE_ORIGIN = "https://solennix.com";
export const DIRECTORY_JSON_LD_ID = "providers-directory-jsonld";

export type DirectorySeoInput = {
  /** Default hub title (i18n). */
  baseTitle: string;
  /** Default hub subtitle / description (i18n). */
  baseDescription: string;
  city?: string;
  serviceLabel?: string;
  eventTypeLabel?: string;
  /** Absolute or path URL for the current listing (query allowed). */
  pageUrl?: string;
};

export type DirectoryListItem = {
  name: string;
  url: string;
  description?: string;
};

/** Build a filter-aware document title for the directory. */
export function buildDirectoryTitle(input: DirectorySeoInput): string {
  const city = input.city?.trim();
  const service = input.serviceLabel?.trim();
  const eventType = input.eventTypeLabel?.trim();

  if (service && eventType && city) {
    return `${service} para ${eventType} en ${city} | Solennix`;
  }
  if (service && city) {
    return `${service} en ${city} | Solennix`;
  }
  if (eventType && city) {
    return `Proveedores para ${eventType} en ${city} | Solennix`;
  }
  if (service && eventType) {
    return `${service} para ${eventType} | Solennix`;
  }
  if (city) {
    return `Proveedores de eventos en ${city} | Solennix`;
  }
  if (service) {
    return `${service} para eventos | Solennix`;
  }
  if (eventType) {
    return `Proveedores para ${eventType} | Solennix`;
  }
  return input.baseTitle.includes("Solennix")
    ? input.baseTitle
    : `${input.baseTitle} | Solennix`;
}

/** Build a filter-aware meta description (no marketplace guarantees). */
export function buildDirectoryDescription(input: DirectorySeoInput): string {
  const city = input.city?.trim();
  const service = input.serviceLabel?.trim();
  const eventType = input.eventTypeLabel?.trim();

  const bits: string[] = [];
  if (service) bits.push(service.toLowerCase());
  if (eventType) bits.push(`para ${eventType.toLowerCase()}`);
  if (city) bits.push(`en ${city}`);

  if (bits.length === 0) {
    return input.baseDescription;
  }

  return `Encontrá profesionales de ${bits.join(" ")}. Directorio de proveedores de eventos en LATAM. Solennix facilita el contacto; el acuerdo es entre vos y el proveedor.`;
}

/**
 * schema.org ItemList for the current page of organizers.
 * Item URLs should point at public profiles (/u/:slug).
 */
export function buildDirectoryItemListJsonLd(
  input: DirectorySeoInput,
  items: DirectoryListItem[],
): Record<string, unknown> {
  const url =
    input.pageUrl?.startsWith("http")
      ? input.pageUrl
      : `${DIRECTORY_SITE_ORIGIN}${input.pageUrl || "/providers"}`;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: buildDirectoryTitle(input),
    description: buildDirectoryDescription(input),
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "LocalBusiness",
        name: item.name,
        url: item.url.startsWith("http")
          ? item.url
          : `${DIRECTORY_SITE_ORIGIN}${item.url}`,
        ...(item.description ? { description: item.description } : {}),
      },
    })),
  };
}
