import { api } from "@/lib/api";

export type PublicationStatus =
  | "unpublished"
  | "pending_review"
  | "published"
  | "rejected";

export type ModerationListing = {
  user_id: string;
  public_slug: string;
  business_name: string;
  plan: string;
  city?: string | null;
  country?: string | null;
  headline?: string | null;
  about?: string | null;
  cover_url?: string | null;
  publication_status: PublicationStatus;
  publication_spam_flag: boolean;
  publication_submitted_at?: string | null;
  publication_rejection_reason?: string | null;
};

export const listingModerationService = {
  /** Provider: submit own profile for directory review. */
  async submitForReview(): Promise<{ publication_status: PublicationStatus }> {
    const res = await api.post<{ data?: { publication_status?: PublicationStatus } }>(
      "/users/me/public-profile/submit-for-review",
      {},
    );
    return {
      publication_status:
        res?.data?.publication_status ??
        (res as { publication_status?: PublicationStatus }).publication_status ??
        "pending_review",
    };
  },

  async listQueue(status: PublicationStatus = "pending_review"): Promise<ModerationListing[]> {
    const res = await api.get<{ data?: ModerationListing[] } | ModerationListing[]>(
      "/admin/listing-moderation",
      { status },
    );
    if (res && typeof res === "object" && "data" in res && Array.isArray(res.data)) {
      return res.data;
    }
    return Array.isArray(res) ? res : [];
  },

  async approve(userId: string): Promise<void> {
    await api.post(`/admin/listing-moderation/${encodeURIComponent(userId)}/approve`, {});
  },

  async reject(userId: string, reason: string): Promise<void> {
    await api.post(`/admin/listing-moderation/${encodeURIComponent(userId)}/reject`, {
      reason,
    });
  },
};
