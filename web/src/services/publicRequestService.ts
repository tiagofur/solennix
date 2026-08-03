import type { components } from "@/types/api";

/**
 * Public structured quote-request service (#1118). Consumes
 * POST /api/public/organizers/{slug}/requests (#1115) — unauthenticated, NG1
 * ratified. Source of truth: backend/docs/openapi.yaml — CreatePublicRequestRequest.
 */
export type CreatePublicRequestRequest =
  components["schemas"]["CreatePublicRequestRequest"];
export type PublicRequest = components["schemas"]["PublicRequest"];

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

/**
 * Error thrown by submit(). Carries `status` (HTTP) and `code` (backend error
 * string when present, e.g. "inbox_full") so callers can map to localized
 * messages without re-parsing the body.
 */
export class PublicRequestError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "PublicRequestError";
  }
}

export const publicRequestService = {
  /**
   * Submits a structured quote request to an organizer's public profile.
   * Throws PublicRequestError on non-2xx (status + code attached for mapping).
   */
  async submit(
    slug: string,
    payload: CreatePublicRequestRequest,
    signal?: AbortSignal,
  ): Promise<PublicRequest> {
    const res = await fetch(
      `${API_BASE}/public/organizers/${encodeURIComponent(slug)}/requests`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal,
      },
    );

    if (!res.ok) {
      // Parse the structured error body (backend returns { error, message }).
      let code: string | undefined;
      let message = `Failed to submit request (${res.status})`;
      try {
        const errJson = (await res.json()) as { error?: string; message?: string };
        if (errJson?.error) code = errJson.error;
        if (errJson?.message) message = errJson.message;
      } catch {
        // Body not JSON; keep default message.
      }
      throw new PublicRequestError(message, res.status, code);
    }

    const json = (await res.json()) as { data?: PublicRequest } | PublicRequest;
    // Backend wraps as { data: PublicRequest }; fall back to bare object.
    if (json && typeof json === "object" && "data" in json && json.data) {
      return json.data;
    }
    return json as PublicRequest;
  },
};
