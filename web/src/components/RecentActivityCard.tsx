import React from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Activity, AlertTriangle, Clock } from "lucide-react";
import { useDashboardActivity } from "@/hooks/queries/useActivityQueries";
import type { AuditLog } from "@/services/activityService";

/**
 * Read-only "Actividad reciente" widget for the user Dashboard.
 *
 * Consumes the backend's `/api/dashboard/activity` endpoint (added during
 * the contract freeze) and renders the N most recent entries of the
 * authenticated user's audit log with a minimal, non-interactive layout.
 *
 * Intentionally kept visually aligned with the other Dashboard cards
 * (same rounded-2xl, border, shadow) — this is a new read-only widget,
 * not a redesign. The Dashboard page composes it as a side card near
 * "Próximos Eventos" / "Inventario crítico".
 */

interface RecentActivityCardProps {
  /** Max number of rows to display. Defaults to 8. */
  limit?: number;
}

// Map the backend's verb strings to human-readable Spanish labels.
// The backend normalizes verbs to a small set (create/update/delete/login,
// etc.) so the mapping can stay tight. Anything unknown falls back to
// the raw verb.
const ACTION_LABELS: Record<string, string> = {
  create: "Creó",
  update: "Actualizó",
  delete: "Eliminó",
  login: "Inició sesión",
  logout: "Cerró sesión",
  register: "Se registró",
};

const RESOURCE_LABELS: Record<string, string> = {
  event: "un evento",
  events: "un evento",
  client: "un cliente",
  product: "un producto",
  products: "un producto",
  inventory: "un ítem de inventario",
  inventory_item: "un ítem de inventario",
  payment: "un pago",
  payments: "un pago",
  user: "su perfil",
  auth: "",
};

function describeAction(entry: AuditLog): string {
  const verb = ACTION_LABELS[entry.action.toLowerCase()] ?? entry.action;
  const resource = RESOURCE_LABELS[entry.resource_type.toLowerCase()] ?? entry.resource_type;
  if (!resource) return verb;
  return `${verb} ${resource}`;
}

function formatRelative(createdAt: string): string {
  try {
    return formatDistanceToNow(parseISO(createdAt), { addSuffix: true, locale: es });
  } catch {
    return "";
  }
}

export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ limit = 8 }) => {
  const { data: entries, isLoading, isError } = useDashboardActivity(limit);

  return (
    <section className="bg-card shadow-sm border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-text flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Activity className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          </span>
          Actividad reciente
        </h3>
      </div>

      <div className="p-4 min-h-[140px]">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-live="polite">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-surface-alt shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-surface-alt rounded w-2/3" />
                  <div className="h-2.5 bg-surface rounded w-1/3" />
                </div>
              </div>
            ))}
            <span className="sr-only">Cargando actividad reciente...</span>
          </div>
        ) : isError ? (
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" aria-hidden="true" />
            <span>No se pudo cargar la actividad reciente.</span>
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <Clock className="h-8 w-8 text-text-tertiary opacity-40" aria-hidden="true" />
            <p className="text-xs text-text-secondary">Sin actividad registrada todavía.</p>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Lista de eventos de actividad reciente">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center shrink-0 mt-0.5">
                  <Activity className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text truncate">
                    <span className="font-semibold">{describeAction(entry)}</span>
                    {entry.details && (
                      <span className="text-text-secondary"> · {entry.details}</span>
                    )}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {formatRelative(entry.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
