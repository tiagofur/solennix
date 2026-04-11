import { api } from '../lib/api';
import type { components } from '../types/api';

/**
 * Activity log entries as declared by the backend contract.
 * One row per tracked action (create/update/delete/login) on a resource,
 * with optional resource id, free-text details and request metadata.
 *
 * Endpoint: `GET /api/dashboard/activity` (authenticated user scope)
 *           `GET /api/admin/audit-logs`  (admin scope, all users)
 */
export type AuditLog = components['schemas']['AuditLog'];

/**
 * Paginated envelope — returned when the caller passes a `page` query
 * parameter. When `page` is omitted, the backend returns a flat array of
 * the most recent entries instead.
 */
export type PaginatedAuditLogsResponse = components['schemas']['PaginatedAuditLogsResponse'];

interface ActivityQueryParams {
  /** Inclusive 1-indexed page number. Omit for a flat, unpaginated array. */
  page?: number;
  /** Max rows per page when paginated. Defaults server-side to 20 for
   *  the user scope, 50 for the admin scope. */
  limit?: number;
}

/**
 * Builds the query string that the backend expects. Drops empty values
 * so that "no params" hits the unpaginated flat-array path.
 */
const buildParams = (params: ActivityQueryParams = {}): Record<string, string> => {
  const query: Record<string, string> = {};
  if (params.page !== undefined) query.page = String(params.page);
  if (params.limit !== undefined) query.limit = String(params.limit);
  return query;
};

export const activityService = {
  /**
   * Fetches the authenticated user's activity log.
   *
   * When called without `page`, returns a flat `AuditLog[]` of the most
   * recent entries (used by the Dashboard widget). When `page` is passed,
   * returns `PaginatedAuditLogsResponse` (the envelope).
   */
  async getDashboardActivity(params?: ActivityQueryParams): Promise<AuditLog[] | PaginatedAuditLogsResponse> {
    return api.get<AuditLog[] | PaginatedAuditLogsResponse>('/dashboard/activity', buildParams(params));
  },

  /**
   * Fetches the platform-wide audit log (admin-only).
   *
   * Same paginated-or-flat response shape as `getDashboardActivity`. The
   * backend enforces admin role via middleware — a non-admin request
   * fails with 403.
   */
  async getAdminAuditLogs(params?: ActivityQueryParams): Promise<AuditLog[] | PaginatedAuditLogsResponse> {
    return api.get<AuditLog[] | PaginatedAuditLogsResponse>('/admin/audit-logs', buildParams(params));
  },
};

/**
 * Narrow the `flat array | envelope` union into a plain array for the
 * consumer's convenience. Callers that always pass `page` get the envelope
 * back via the raw method; callers that want a flat list regardless can
 * use this helper.
 */
export const unwrapAuditLogs = (
  response: AuditLog[] | PaginatedAuditLogsResponse,
): AuditLog[] => {
  return Array.isArray(response) ? response : response.data;
};
