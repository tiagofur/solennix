import type { components } from "@/types/api";

/**
 * Public organizers directory service (#1117). Consumes
 * GET /api/public/organizers (#1116) — unauthenticated, NG1 ratified.
 * Source of truth: backend/docs/openapi.yaml — PaginatedOrganizersResponse.
 */
export type PublicOrganizerCard =
  components["schemas"]["PublicOrganizerCard"];
export type PaginatedOrganizersResponse =
  components["schemas"]["PaginatedOrganizersResponse"];

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

/** Filters for the directory search. All optional; empty = first page default. */
export interface DirectoryFilters {
  city?: string;
  event_type?: string;
  q?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
  /** #1128 advanced */
  min_budget?: number;
  max_budget?: number;
  service_category?: string;
  available_on?: string; // YYYY-MM-DD
}

/** Shape returned by the service (normalized, never undefined fields). */
export interface DirectorySearchResult {
  data: PublicOrganizerCard[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export class DirectorySearchError extends Error {
  constructor(message = "Failed to search directory", public status?: number) {
    super(message);
    this.name = "DirectorySearchError";
  }
}

function buildQueryString(filters: DirectoryFilters): string {
  const params = new URLSearchParams();
  if (filters.city && filters.city.trim()) params.set("city", filters.city.trim());
  if (filters.event_type && filters.event_type.trim())
    params.set("event_type", filters.event_type.trim());
  if (filters.q && filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.order) params.set("order", filters.order);
  if (filters.page && filters.page > 0) params.set("page", String(filters.page));
  if (filters.limit && filters.limit > 0) params.set("limit", String(filters.limit));
  if (filters.lat != null) params.set("lat", String(filters.lat));
  if (filters.lng != null) params.set("lng", String(filters.lng));
  if (filters.radius_km != null) params.set("radius_km", String(filters.radius_km));
  if (filters.min_budget != null) params.set("min_budget", String(filters.min_budget));
  if (filters.max_budget != null) params.set("max_budget", String(filters.max_budget));
  if (filters.service_category?.trim())
    params.set("service_category", filters.service_category.trim());
  if (filters.available_on?.trim()) params.set("available_on", filters.available_on.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const organizersDirectoryService = {
  /**
   * Search publicable organizers. Unauthenticated.
   * Throws DirectorySearchError on non-2xx (status attached).
   */
  async search(
    filters: DirectoryFilters,
    signal?: AbortSignal,
  ): Promise<DirectorySearchResult> {
    const res = await fetch(
      `${API_BASE}/public/organizers${buildQueryString(filters)}`,
      { signal },
    );
    if (!res.ok) {
      throw new DirectorySearchError(
        `Failed to search directory (${res.status})`,
        res.status,
      );
    }
    const json = (await res.json()) as PaginatedOrganizersResponse;
    // Normalize: ensure data is always an array (defensive against malformed payloads).
    return {
      data: Array.isArray(json.data) ? json.data : [],
      total: json.total ?? 0,
      page: json.page ?? 1,
      limit: json.limit ?? 20,
      total_pages: json.total_pages ?? 0,
    };
  },
};
