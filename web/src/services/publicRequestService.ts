import type { components } from "@/types/api";

/**
 * Public structured quote-request service (#1118). Consumes
 * POST /api/public/organizers/{slug}/requests (#1115) — unauthenticated, NG1
 * ratified. Source of truth: backend/docs/openapi.yaml — CreatePublicRequestRequest.
 *
 * Create response may include `client_token` once (never re-issued). Visitor
 * uses it as X-Request-Token for accept/decline actions.
 */
/** Catalog line item with quantity (preferred over flat service_ids). */
export type CreatePublicRequestServiceLine = {
  product_id: string;
  qty?: number;
};

/**
 * Unified visitor payload (profile CTA + shared link).
 * Extends OpenAPI schema with fields from unify-solicitudes (phone, city, services[].qty)
 * until `web/src/types/api.ts` is fully regenerated.
 */
export type CreatePublicRequestRequest = Omit<
  components["schemas"]["CreatePublicRequestRequest"],
  "contact_email"
> & {
  /** Required on profile path; optional on link if phone is present. */
  contact_email?: string;
  contact_phone?: string | null;
  city?: string | null;
  services?: CreatePublicRequestServiceLine[];
  /** Honeypot anti-spam. Must stay empty; bots that fill it get a fake 201. */
  website?: string;
  /** When set, server freezes a live package quote snapshot on the request. */
  package_id?: string;
};

export type PublicRequest = components["schemas"]["PublicRequest"] & {
  contact_phone?: string | null;
  city?: string | null;
  source?: "public_profile" | "shared_link";
  submit_mode?: "standard" | "auto_quote" | "auto_event";
  event_id?: string | null;
};

/** Create response: PublicRequest + one-time client_token when issued. */
export type PublicRequestCreateResult = PublicRequest & {
  client_token?: string;
  event_id?: string | null;
  status?: string;
};

export type PublicRequestClientAction = "accept" | "decline";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export const PUBLIC_REQUEST_TOKEN_KEY = (id: string) =>
  `public_request_token:${id}`;

/**
 * Error thrown by submit()/clientAction(). Carries `status` (HTTP) and `code`
 * (backend error string when present, e.g. "inbox_full") so callers can map to
 * localized messages without re-parsing the body.
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

async function parseError(res: Response, fallback: string): Promise<PublicRequestError> {
  let code: string | undefined;
  let message = fallback;
  try {
    const errJson = (await res.json()) as { error?: string; message?: string };
    if (errJson?.error) code = errJson.error;
    if (errJson?.message) message = errJson.message;
  } catch {
    // Body not JSON; keep default message.
  }
  return new PublicRequestError(message, res.status, code);
}

export const publicRequestService = {
  /**
   * Submits a structured quote request to an organizer's public profile.
   * Throws PublicRequestError on non-2xx (status + code attached for mapping).
   * On success, `client_token` is present only on the create response (once).
   */
  async submit(
    slug: string,
    payload: CreatePublicRequestRequest,
    signal?: AbortSignal,
  ): Promise<PublicRequestCreateResult> {
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
      throw await parseError(res, `Failed to submit request (${res.status})`);
    }

    const json = (await res.json()) as
      | { data?: PublicRequestCreateResult }
      | PublicRequestCreateResult;
    // Backend wraps as { data: PublicRequestCreateResponse }; fall back to bare object.
    if (json && typeof json === "object" && "data" in json && json.data) {
      return json.data;
    }
    return json as PublicRequestCreateResult;
  },

  /**
   * Visitor accept/decline with X-Request-Token (NG1 — no account).
   * POST /api/public/requests/{id}/action
   */
  async clientAction(
    id: string,
    token: string,
    action: PublicRequestClientAction,
    signal?: AbortSignal,
  ): Promise<void> {
    const res = await fetch(
      `${API_BASE}/public/requests/${encodeURIComponent(id)}/action`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-Token": token,
        },
        body: JSON.stringify({ action }),
        signal,
      },
    );

    if (!res.ok) {
      throw await parseError(res, `Failed to apply action (${res.status})`);
    }
  },
};
