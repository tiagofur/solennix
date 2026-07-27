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
}

export const publicProfileConfigService = new PublicProfileConfigService();
