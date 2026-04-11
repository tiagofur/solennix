import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, ChevronLeft, ChevronRight, History } from "lucide-react";
import { useAdminAuditLogs } from "@/hooks/queries/useActivityQueries";

/**
 * Platform-wide audit log section for the Admin Dashboard.
 *
 * Consumes the backend's `/api/admin/audit-logs` endpoint (added during
 * the contract freeze; enforces admin role via middleware) and renders
 * a paginated, read-only table of every audit event on the platform.
 *
 * This is a new section appended at the bottom of `AdminDashboard.tsx`
 * using the same card style as the rest of the admin sections. Not a
 * redesign — just surfaces the existing backend endpoint.
 */

const PAGE_SIZE = 20;

function formatTimestamp(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM yyyy, HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

function formatUserId(userId: string): string {
  // Show only the first 8 chars of the UUID — the full id is available
  // via hover (title attr) and this keeps the column narrow.
  return userId.slice(0, 8);
}

export const AdminAuditLogSection: React.FC = () => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAdminAuditLogs(page, PAGE_SIZE);

  const entries = data?.data ?? [];
  const totalPages = data?.total_pages ?? 1;
  const total = data?.total ?? 0;

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="bg-card shadow-sm border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <History className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-text">Audit log de la plataforma</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Registro completo de acciones en todas las cuentas.
            </p>
          </div>
        </div>
        {total > 0 && (
          <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
            {total.toLocaleString("es-MX")} evento{total === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-text-secondary" role="status" aria-live="polite">
            Cargando audit log...
          </div>
        ) : isError ? (
          <div className="p-6 flex items-center gap-3 text-sm text-text-secondary">
            <AlertTriangle className="h-4 w-4 text-error shrink-0" aria-hidden="true" />
            <span>Error al cargar el audit log de la plataforma.</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-secondary">
            No hay eventos registrados en el audit log.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-border" aria-label="Audit log de la plataforma">
            <thead className="bg-surface-alt">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Fecha
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Usuario
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Acción
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Recurso
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {formatTimestamp(entry.created_at)}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-text" title={entry.user_id}>
                    {formatUserId(entry.user_id)}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-semibold text-text">
                    {entry.action}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-text-secondary">
                    {entry.resource_type}
                    {entry.resource_id && (
                      <span className="ml-1 text-xs text-text-tertiary" title={entry.resource_id}>
                        ({entry.resource_id.slice(0, 8)})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-sm text-text-secondary max-w-md truncate" title={entry.details ?? undefined}>
                    {entry.details ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && !isError && entries.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-border">
          <span className="text-xs text-text-secondary">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border text-text-secondary bg-card hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Anterior
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border text-text-secondary bg-card hover:bg-surface-alt disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Página siguiente"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
