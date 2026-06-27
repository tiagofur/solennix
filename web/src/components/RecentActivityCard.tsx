import React from "react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Activity, AlertTriangle, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDashboardActivity } from "@/hooks/queries/useActivityQueries";
import type { AuditLog } from "@/services/activityService";
import { Card } from "./Card";
import { ListGroup, ListItem } from "./ListGroup";

/**
 * Read-only "Actividad reciente" widget for the user Dashboard.
 */

interface RecentActivityCardProps {
  /** Max number of rows to display. Defaults to 8. */
  limit?: number;
}

export const RecentActivityCard: React.FC<RecentActivityCardProps> = ({ limit = 8 }) => {
  const { t, i18n } = useTranslation();
  const { data: entries, isLoading, isError } = useDashboardActivity(limit);

  function describeAction(entry: AuditLog): string {
    const actionKey = entry.action.toLowerCase();
    const resourceKey = entry.resource_type.toLowerCase();
    
    // Normalize some backend resource keys to our i18n keys
    const normalizedResource = resourceKey.endsWith('s') ? resourceKey.slice(0, -1) : resourceKey;
    const finalResourceKey = normalizedResource === 'inventory_item' ? 'inventory' : normalizedResource;

    const verb = t(`activity.actions.${actionKey}`, { defaultValue: entry.action });
    const resource = t(`activity.resources.${finalResourceKey}`, { defaultValue: entry.resource_type });
    
    if (!resource) return verb;
    return `${verb} ${resource}`;
  }

  function formatRelative(createdAt: string): string {
    try {
      const locale = i18n.language.startsWith('es') ? es : enUS;
      return formatDistanceToNow(parseISO(createdAt), { addSuffix: true, locale });
    } catch {
      return "";
    }
  }

  return (
    <Card variant="glass" padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h3 className="text-sm font-bold text-text flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Activity className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          </span>
          {t('activity.recent')}
        </h3>
      </div>

      <div className="min-h-[140px]">
        {isLoading ? (
          <div className="p-6 space-y-3" role="status" aria-live="polite">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-surface-alt/40 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-surface-alt/40 rounded w-2/3" />
                  <div className="h-2.5 bg-surface-alt/40 rounded w-1/3" />
                </div>
              </div>
            ))}
            <span className="sr-only">{t('action.loading_activity')}</span>
          </div>
        ) : isError ? (
          <div className="p-6 flex items-center gap-3 text-sm text-text-secondary font-semibold">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" aria-hidden="true" />
            <span>{t('action.activity_error')}</span>
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="p-6 flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Clock className="h-8 w-8 text-text-tertiary opacity-40" aria-hidden="true" />
            <p className="text-xs text-text-secondary">{t('action.no_activity')}</p>
          </div>
        ) : (
          <ListGroup variant="glass" className="border-0 shadow-none rounded-t-none" aria-label={t('activity.event_list_label')}>
            {entries.map((entry) => (
              <ListItem key={entry.id} className="flex items-start gap-3 py-3.5">
                <span className="w-8 h-8 rounded-lg bg-surface-alt/60 flex items-center justify-center shrink-0 mt-0.5">
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
              </ListItem>
            ))}
          </ListGroup>
        )}
      </div>
    </Card>
  );
};
