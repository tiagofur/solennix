import { api } from "@/lib/api";
import {
  PublicRequestError,
  type CreatePublicRequestRequest,
  type PublicRequestCreateResult,
} from "@/services/publicRequestService";

/**
 * Organizer + public shareable Solicitudes links (PR2).
 * Auth: GET/POST/DELETE /api/organizers/me/request-links
 * Public: GET/POST /api/public/request-links/{token}
 *
 * Local types until openapi regenerates web/src/types/api.ts fully.
 */

export type SubmitMode = "standard" | "auto_quote" | "auto_event";
export type PublicRequestLinkStatus =
  | "active"
  | "used"
  | "expired"
  | "revoked";

export interface PublicRequestLink {
  id: string;
  organizer_user_id?: string;
  token: string;
  label?: string | null;
  status: PublicRequestLinkStatus;
  submit_mode: SubmitMode;
  max_uses?: number | null;
  use_count?: number;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
  /** Absolute URL /s/{token} (server-computed). */
  url: string;
}

export interface CreatePublicRequestLinkRequest {
  label?: string;
  ttl_days?: number;
  max_uses?: number | null;
  submit_mode?: SubmitMode;
}

export interface PublicRequestLinkCatalogItem {
  id: string;
  name: string;
  category?: string;
  image_url?: string | null;
  base_price?: number;
}

export interface PublicRequestLinkData {
  link_id: string;
  submit_mode: SubmitMode;
  expires_at?: string | null;
  label?: string | null;
  organizer: {
    business_name?: string | null;
    logo_url?: string | null;
    brand_color?: string | null;
  };
  products: PublicRequestLinkCatalogItem[];
  profile_enabled: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

function unwrapData<T>(json: { data?: T } | T): T {
  if (json && typeof json === "object" && "data" in json && json.data != null) {
    return json.data as T;
  }
  return json as T;
}

async function parsePublicError(
  res: Response,
  fallback: string,
): Promise<PublicRequestError> {
  let code: string | undefined;
  let message = fallback;
  try {
    const errJson = (await res.json()) as { error?: string; message?: string };
    if (errJson?.error) code = errJson.error;
    if (errJson?.message) message = errJson.message;
  } catch {
    // keep fallback
  }
  return new PublicRequestError(message, res.status, code);
}

export const requestLinkService = {
  /** GET /organizers/me/request-links */
  async listLinks(): Promise<PublicRequestLink[]> {
    const res = await api.get<{ data?: PublicRequestLink[] } | PublicRequestLink[]>(
      "/organizers/me/request-links",
    );
    const data = unwrapData(res);
    return Array.isArray(data) ? data : [];
  },

  /** POST /organizers/me/request-links */
  async createLink(
    body: CreatePublicRequestLinkRequest = {},
  ): Promise<PublicRequestLink> {
    const res = await api.post<{ data?: PublicRequestLink } | PublicRequestLink>(
      "/organizers/me/request-links",
      body,
    );
    return unwrapData(res);
  },

  /** DELETE /organizers/me/request-links/{id} */
  async revokeLink(id: string): Promise<void> {
    await api.delete(`/organizers/me/request-links/${id}`);
  },

  /**
   * GET /public/request-links/{token} — unauthenticated branding + catalog.
   * Throws PublicRequestError (404 not found, 410 link_invalid).
   */
  async getPublicLink(
    token: string,
    signal?: AbortSignal,
  ): Promise<PublicRequestLinkData> {
    const res = await fetch(
      `${API_BASE}/public/request-links/${encodeURIComponent(token)}`,
      { signal },
    );
    if (!res.ok) {
      throw await parsePublicError(
        res,
        `Failed to load link (${res.status})`,
      );
    }
    const json = (await res.json()) as
      | { data?: PublicRequestLinkData }
      | PublicRequestLinkData;
    return unwrapData(json);
  },

  /**
   * POST /public/request-links/{token}/requests — unauthenticated submit.
   */
  async submitRequest(
    token: string,
    payload: CreatePublicRequestRequest,
    signal?: AbortSignal,
  ): Promise<PublicRequestCreateResult> {
    const res = await fetch(
      `${API_BASE}/public/request-links/${encodeURIComponent(token)}/requests`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      },
    );
    if (!res.ok) {
      throw await parsePublicError(
        res,
        `Failed to submit request (${res.status})`,
      );
    }
    const json = (await res.json()) as
      | { data?: PublicRequestCreateResult }
      | PublicRequestCreateResult;
    return unwrapData(json);
  },
};
