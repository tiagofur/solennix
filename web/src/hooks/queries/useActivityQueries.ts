import { useQuery } from '@tanstack/react-query';
import { activityService, unwrapAuditLogs } from '@/services/activityService';
import type { AuditLog } from '@/services/activityService';

/**
 * Query keys for the activity/audit-log domain. Kept local to this file
 * to avoid bloating the central `queryKeys.ts` with a feature that only
 * has 2 consumers (Dashboard widget + Admin audit section).
 */
const activityKeys = {
  dashboard: (limit: number) => ['activity', 'dashboard', limit] as const,
  admin: (page: number, limit: number) => ['activity', 'admin', page, limit] as const,
};

/**
 * Recent activity feed for the authenticated user's Dashboard widget.
 * Requests a flat, unpaginated list of the most recent entries from
 * `GET /api/dashboard/activity`.
 *
 * The widget is read-only and fetches at most `limit` rows; no pagination.
 */
export function useDashboardActivity(limit = 10) {
  return useQuery<AuditLog[]>({
    queryKey: activityKeys.dashboard(limit),
    queryFn: async () => {
      // Unpaginated call returns a flat `AuditLog[]`. We still normalize
      // via `unwrapAuditLogs` so the caller never has to worry about which
      // shape came back.
      const response = await activityService.getDashboardActivity();
      return unwrapAuditLogs(response).slice(0, limit);
    },
  });
}

/**
 * Paginated admin audit log feed for the AdminDashboard section.
 * Uses `GET /api/admin/audit-logs?page=...&limit=...` which enforces
 * admin role server-side. Non-admin callers get 403.
 */
export function useAdminAuditLogs(page = 1, limit = 20) {
  return useQuery({
    queryKey: activityKeys.admin(page, limit),
    queryFn: async () => {
      const response = await activityService.getAdminAuditLogs({ page, limit });
      // The admin endpoint is always called with a `page` param here, so
      // the backend returns the paginated envelope. We keep the envelope
      // as-is so the UI can render total, total_pages, etc.
      return Array.isArray(response)
        ? { data: response, total: response.length, page: 1, limit, total_pages: 1 }
        : response;
    },
  });
}
