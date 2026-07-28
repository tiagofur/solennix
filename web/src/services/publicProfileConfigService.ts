import { api } from "@/lib/api";
import type { components } from "@/types/api";

/**
 * Source of truth: backend/docs/openapi.yaml.
 * Organizer public-profile config (auth Settings) and its upsert payload.
 */
export type OrganizerPublicProfile =
  components["schemas"]["OrganizerPublicProfile"];
export type OrganizerPublicProfileUpsertRequest =
  components["schemas"]["OrganizerPublicProfileUpsertRequest"];
export type OrganizerPublicPortfolioItem =
  components["schemas"]["OrganizerPublicPortfolioItem"];

export type PortfolioCreateRequest = {
  title: string;
  photo_url: string;
  event_id?: string | null;
  event_date?: string | null;
  thumbnail_url?: string | null;
  sort_order?: number;
};

export type PortfolioUpdateRequest = {
  title?: string;
  photo_url?: string;
  event_id?: string | null;
  event_date?: string | null;
  thumbnail_url?: string | null;
  sort_order?: number;
};

class PublicProfileConfigService {
  /** GET /api/users/me/public-profile — current config (or DB defaults). */
  async getMyPublicProfile(): Promise<OrganizerPublicProfile> {
    const response = await api.get<{ data: OrganizerPublicProfile }>(
      "/users/me/public-profile",
    );
    return response.data;
  }

  /** PUT /api/users/me/public-profile — upsert config. */
  async upsertMyPublicProfile(
    body: OrganizerPublicProfileUpsertRequest,
  ): Promise<OrganizerPublicProfile> {
    const response = await api.put<{ data: OrganizerPublicProfile }>(
      "/users/me/public-profile",
      body,
    );
    return response.data;
  }

  /** GET /api/users/me/public-profile/portfolio — Pro+ list. */
  async listPortfolio(): Promise<OrganizerPublicPortfolioItem[]> {
    const items = await api.get<OrganizerPublicPortfolioItem[]>(
      "/users/me/public-profile/portfolio",
    );
    return items ?? [];
  }

  /** POST /api/users/me/public-profile/portfolio — Pro+, max 6. */
  async createPortfolioItem(
    body: PortfolioCreateRequest,
  ): Promise<OrganizerPublicPortfolioItem> {
    return api.post<OrganizerPublicPortfolioItem>(
      "/users/me/public-profile/portfolio",
      body,
    );
  }

  /** PUT /api/users/me/public-profile/portfolio/{id}. */
  async updatePortfolioItem(
    id: string,
    body: PortfolioUpdateRequest,
  ): Promise<OrganizerPublicPortfolioItem> {
    return api.put<OrganizerPublicPortfolioItem>(
      `/users/me/public-profile/portfolio/${id}`,
      body,
    );
  }

  /** DELETE /api/users/me/public-profile/portfolio/{id}. */
  async deletePortfolioItem(id: string): Promise<void> {
    await api.delete(`/users/me/public-profile/portfolio/${id}`);
  }
}

export const publicProfileConfigService = new PublicProfileConfigService();
