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

/** Active product row for public-profile service multi-select. */
export type PublicProfileServiceSelectionItem = {
  id: string;
  name: string;
  category: string;
  base_price: number;
  image_url?: string | null;
  show_on_public_profile: boolean;
  is_featured: boolean;
};

export type PortfolioCandidatePhoto = {
  id: string;
  url: string;
  thumbnail_url?: string | null;
};

/** Sanitized event eligible for portfolio (no client PII). */
export type PortfolioCandidateEvent = {
  id: string;
  service_type: string;
  event_date: string;
  city?: string | null;
  photos: PortfolioCandidatePhoto[];
};

export type PortfolioCreateRequest = {
  /** Optional when event_id is provided (defaults to service_type). */
  title?: string;
  /** Optional when event_id is provided (defaults to first/selected photo). */
  photo_url?: string;
  event_id?: string | null;
  photo_id?: string | null;
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

export type OrganizerPublicPackage =
  components["schemas"]["OrganizerPublicPackage"];
export type PackageCreateRequest = {
  title: string;
  description?: string | null;
  from_price?: number | null;
  inclusions?: string[];
  image_url?: string | null;
  is_featured?: boolean;
  sort_order?: number;
};
export type PackageUpdateRequest = Partial<PackageCreateRequest>;

export type OrganizerPublicFaqItem =
  components["schemas"]["OrganizerPublicFaqItem"];
export type FaqCreateRequest = {
  question: string;
  answer: string;
  sort_order?: number;
};
export type FaqUpdateRequest = Partial<FaqCreateRequest>;

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

  /** GET /api/users/me/public-profile/services — active products for selection. */
  async listServices(): Promise<PublicProfileServiceSelectionItem[]> {
    const items = await api.get<PublicProfileServiceSelectionItem[]>(
      "/users/me/public-profile/services",
    );
    return items ?? [];
  }

  /** PUT /api/users/me/public-profile/services — bulk set selection (Free max 3). */
  async setServices(
    productIds: string[],
  ): Promise<PublicProfileServiceSelectionItem[]> {
    const items = await api.put<PublicProfileServiceSelectionItem[]>(
      "/users/me/public-profile/services",
      { product_ids: productIds },
    );
    return items ?? [];
  }

  /** GET /api/users/me/public-profile/portfolio — Pro+ list. */
  async listPortfolio(): Promise<OrganizerPublicPortfolioItem[]> {
    const items = await api.get<OrganizerPublicPortfolioItem[]>(
      "/users/me/public-profile/portfolio",
    );
    return items ?? [];
  }

  /** GET /api/users/me/public-profile/portfolio/candidates — Pro+ event picker. */
  async listPortfolioCandidates(): Promise<PortfolioCandidateEvent[]> {
    const items = await api.get<PortfolioCandidateEvent[]>(
      "/users/me/public-profile/portfolio/candidates",
    );
    return items ?? [];
  }

  /** POST /api/users/me/public-profile/portfolio — Pro+, max 6. Prefer event_id. */
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

  // ---- Packages (Issue #1081) ----

  /** GET /api/users/me/public-profile/packages. */
  async listPackages(): Promise<OrganizerPublicPackage[]> {
    return api.get<OrganizerPublicPackage[]>(
      "/users/me/public-profile/packages",
    );
  }

  /** POST /api/users/me/public-profile/packages. */
  async createPackage(
    payload: PackageCreateRequest,
  ): Promise<OrganizerPublicPackage> {
    return api.post<OrganizerPublicPackage>(
      "/users/me/public-profile/packages",
      payload,
    );
  }

  /** PUT /api/users/me/public-profile/packages/{id}. */
  async updatePackage(
    id: string,
    payload: PackageUpdateRequest,
  ): Promise<OrganizerPublicPackage> {
    return api.put<OrganizerPublicPackage>(
      `/users/me/public-profile/packages/${id}`,
      payload,
    );
  }

  /** DELETE /api/users/me/public-profile/packages/{id}. */
  async deletePackage(id: string): Promise<void> {
    await api.delete(`/users/me/public-profile/packages/${id}`);
  }

  // ---- FAQ (Issue #1081) ----

  /** GET /api/users/me/public-profile/faq. */
  async listFaq(): Promise<OrganizerPublicFaqItem[]> {
    return api.get<OrganizerPublicFaqItem[]>("/users/me/public-profile/faq");
  }

  /** POST /api/users/me/public-profile/faq. */
  async createFaqItem(payload: FaqCreateRequest): Promise<OrganizerPublicFaqItem> {
    return api.post<OrganizerPublicFaqItem>(
      "/users/me/public-profile/faq",
      payload,
    );
  }

  /** PUT /api/users/me/public-profile/faq/{id}. */
  async updateFaqItem(
    id: string,
    payload: FaqUpdateRequest,
  ): Promise<OrganizerPublicFaqItem> {
    return api.put<OrganizerPublicFaqItem>(
      `/users/me/public-profile/faq/${id}`,
      payload,
    );
  }

  /** DELETE /api/users/me/public-profile/faq/{id}. */
  async deleteFaqItem(id: string): Promise<void> {
    await api.delete(`/users/me/public-profile/faq/${id}`);
  }
}

export const publicProfileConfigService = new PublicProfileConfigService();
