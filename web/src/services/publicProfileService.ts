import type { components } from "@/types/api";
import { resolveMediaUrl } from "@/lib/mediaUrl";

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

/** Rewrite relative upload paths so images load from the API host on the SPA. */
export function normalizePublicProfileMedia(
  profile: PublicOrganizerProfile,
): PublicOrganizerProfile {
  return {
    ...profile,
    logo_url: resolveMediaUrl(profile.logo_url) ?? profile.logo_url,
    services: profile.services?.map((svc) => ({
      ...svc,
      image_url: resolveMediaUrl(svc.image_url) ?? svc.image_url,
    })),
    portfolio: profile.portfolio?.map((item) => ({
      ...item,
      photo_url: resolveMediaUrl(item.photo_url) ?? item.photo_url,
      thumbnail_url:
        resolveMediaUrl(item.thumbnail_url) ?? item.thumbnail_url,
    })),
  };
}

export interface SubmitPublicLeadPayload {
  name: string;
  contact: string;
  event_date?: string;
  event_type?: string;
  num_guests?: number;
  message?: string;
  source?: string;
}

export interface PublicLeadResponse {
  id: string;
  organizer_user_id: string;
  name: string;
  contact: string;
  event_date?: string | null;
  event_type?: string | null;
  num_guests?: number | null;
  message?: string | null;
  created_at: string;
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
    let profile: PublicOrganizerProfile;
    if (
      json &&
      typeof json === "object" &&
      "data" in json &&
      (json as { data: unknown }).data
    ) {
      profile = (json as { data: PublicOrganizerProfile }).data;
    } else {
      profile = json as PublicOrganizerProfile;
    }
    return normalizePublicProfileMedia(profile);
  },

  /**
   * Submits a public lead inquiry / quote request for an organizer by slug.
   * POST /api/public/organizers/{slug}/leads
   */
  async submitLead(
    slug: string,
    payload: SubmitPublicLeadPayload,
  ): Promise<PublicLeadResponse> {
    const res = await fetch(
      `${API_BASE}/public/organizers/${encodeURIComponent(slug)}/leads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const message =
        errJson && typeof errJson === "object" && "error" in errJson
          ? (errJson as { error: string }).error
          : `Failed to submit lead (${res.status})`;
      throw new Error(message);
    }
    const json = await res.json();
    return (json as { data: PublicLeadResponse }).data || json;
  },
};
