import type { components } from "@/types/api";

/**
 * Unauthenticated public organizer profile (GET /api/public/organizers/{slug}).
 * Source of truth: backend/docs/openapi.yaml — PublicOrganizerProfile.
 */
export type PublicOrganizerProfile =
  components["schemas"]["PublicOrganizerProfile"];
export type PublicProfileServiceItem =
  components["schemas"]["PublicProfileService"];
export type PublicPortfolioItem =
  components["schemas"]["PublicPortfolioItem"];
export type PublicReview = components["schemas"]["PublicReview"];
export type PublicContact = components["schemas"]["PublicContact"];
export type PublicLocation = components["schemas"]["PublicLocation"];

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export class PublicProfileNotFoundError extends Error {
  constructor(message = "Profile not found") {
    super(message);
    this.name = "PublicProfileNotFoundError";
  }
}

export const publicProfileService = {
  /**
   * Fetches the plan-aware public profile aggregate by slug.
   * Throws PublicProfileNotFoundError on 404 (unknown or disabled).
   */
  async getBySlug(
    slug: string,
    signal?: AbortSignal,
  ): Promise<PublicOrganizerProfile> {
    const res = await fetch(
      `${API_BASE}/public/organizers/${encodeURIComponent(slug)}`,
      { signal },
    );
    if (res.status === 404) {
      throw new PublicProfileNotFoundError();
    }
    if (!res.ok) {
      throw new Error(`Failed to load profile (${res.status})`);
    }
    const json: unknown = await res.json();
    // Backend wraps as { data: PublicOrganizerProfile }.
    if (
      json &&
      typeof json === "object" &&
      "data" in json &&
      (json as { data: unknown }).data
    ) {
      return (json as { data: PublicOrganizerProfile }).data;
    }
    return json as PublicOrganizerProfile;
  },
};
