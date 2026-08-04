import { api } from "@/lib/api";
import type { components } from "@/types/api";

/**
 * Authenticated organizer inbox for public quote requests (v2.0).
 * Endpoints under /api/organizers/me/requests.
 */
export type PublicRequest = components["schemas"]["PublicRequest"];
export type PublicRequestStatus = components["schemas"]["PublicRequestStatus"];
export type PublicResponse = components["schemas"]["PublicResponse"];
export type CreatePublicResponseRequest =
  components["schemas"]["CreatePublicResponseRequest"];

export type PaginatedPublicRequests = {
  data: PublicRequest[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type ListOrganizerRequestsParams = {
  page?: number;
  limit?: number;
  status?: PublicRequestStatus | string;
  sort?: "created_at" | "event_date";
  order?: "asc" | "desc";
};

export type OrganizerRequestDetail = PublicRequest & {
  responses?: PublicResponse[];
};

function toQueryParams(
  params: ListOrganizerRequestsParams = {},
): Record<string, string> {
  const out: Record<string, string> = {};
  if (params.page != null) out.page = String(params.page);
  if (params.limit != null) out.limit = String(params.limit);
  if (params.status) out.status = String(params.status);
  if (params.sort) out.sort = params.sort;
  if (params.order) out.order = params.order;
  return out;
}

export const organizerRequestsService = {
  /** GET /api/organizers/me/requests */
  async list(
    params: ListOrganizerRequestsParams = {},
  ): Promise<PaginatedPublicRequests> {
    const res = await api.get<PaginatedPublicRequests>(
      "/organizers/me/requests",
      toQueryParams(params),
    );
    return {
      data: Array.isArray(res?.data) ? res.data : [],
      total: res?.total ?? 0,
      page: res?.page ?? 1,
      limit: res?.limit ?? 20,
      total_pages: res?.total_pages ?? 0,
    };
  },

  /** GET /api/organizers/me/requests/unread-count */
  async unreadCount(): Promise<number> {
    const res = await api.get<{ data?: { count?: number }; count?: number }>(
      "/organizers/me/requests/unread-count",
    );
    if (typeof res?.data?.count === "number") return res.data.count;
    if (typeof res?.count === "number") return res.count;
    return 0;
  },

  /**
   * GET /api/organizers/me/requests/{id}
   * Backend shape: { data: { request: PublicRequest, responses: PublicResponse[] } }
   */
  async get(id: string): Promise<OrganizerRequestDetail> {
    type DetailPayload = {
      data?: {
        request?: PublicRequest;
        responses?: PublicResponse[];
      } & Partial<PublicRequest>;
      request?: PublicRequest;
      responses?: PublicResponse[];
    };
    const res = await api.get<DetailPayload>(
      `/organizers/me/requests/${encodeURIComponent(id)}`,
    );
    const payload = res?.data ?? res;
    const request = payload?.request;
    const responses = payload?.responses ?? [];
    if (request) {
      return { ...request, responses };
    }
    // Backward-compatible: flat PublicRequest-ish payload
    return { ...(payload as PublicRequest), responses };
  },

  /** POST /api/organizers/me/requests/{id}/read */
  async markRead(id: string): Promise<void> {
    await api.post(`/organizers/me/requests/${encodeURIComponent(id)}/read`, {});
  },

  /** POST /api/organizers/me/requests/{id}/responses */
  async respond(
    id: string,
    body: CreatePublicResponseRequest,
  ): Promise<PublicResponse> {
    const res = await api.post<
      { data?: PublicResponse } | PublicResponse
    >(`/organizers/me/requests/${encodeURIComponent(id)}/responses`, body);
    if (res && typeof res === "object" && "data" in res && res.data) {
      return res.data;
    }
    return res as PublicResponse;
  },

  /** POST /api/organizers/me/requests/{id}/decline */
  async decline(id: string, reason?: string): Promise<void> {
    await api.post(`/organizers/me/requests/${encodeURIComponent(id)}/decline`, {
      reason: reason || undefined,
    });
  },

  /** POST /api/organizers/me/requests/{id}/request-info */
  async requestInfo(id: string): Promise<void> {
    await api.post(
      `/organizers/me/requests/${encodeURIComponent(id)}/request-info`,
      {},
    );
  },

  /** POST /api/organizers/me/requests/{id}/convert-to-event */
  async convertToEvent(id: string): Promise<{ event_id: string }> {
    const res = await api.post<{
      data?: { event_id?: string };
      event_id?: string;
    }>(`/organizers/me/requests/${encodeURIComponent(id)}/convert-to-event`, {});
    const eventId = res?.data?.event_id ?? res?.event_id;
    if (!eventId) {
      throw new Error("Missing event_id from convert-to-event response");
    }
    return { event_id: eventId };
  },
};

export default organizerRequestsService;
