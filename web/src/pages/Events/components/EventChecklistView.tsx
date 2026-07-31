import React, { useCallback, useEffect, useState } from "react";
import {
  ClipboardList,
  Wrench,
  Package,
  ShoppingCart,
  Zap,
  CheckSquare,
  Square,
} from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import type { Event } from "@/types/entities";

type ChecklistSection = "equipment" | "stock" | "purchase" | "extra";

export interface ChecklistItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  section: ChecklistSection;
}

export interface EventChecklistViewProps {
  eventId: string | undefined;
  event: Event;
  /** Pre-built checklist items (built in the parent from cached query data). */
  checklistItems: ChecklistItem[];
  moneyLocale: string;
  /** Optional reporter so the parent's tab badge can mirror live progress. */
  onProgressChange?: (checkedCount: number, total: number, progress: number) => void;
}

/**
 * `viewMode === "checklist"` block.
 *
 * The checklist ITEM LIST is built in the parent (from cached query data)
 * so the always-visible tab badge can show the item count on every tab.
 * This component owns the interactive checked-state:
 *   - restores checked ids from localStorage on event change
 *   - persists toggles back to localStorage
 *   - reports live progress up via onProgressChange (for the tab badge)
 */
export const EventChecklistView: React.FC<EventChecklistViewProps> = ({
  eventId,
  event,
  checklistItems,
  moneyLocale,
  onProgressChange,
}) => {
  const { t } = useTranslation(['events', 'common']);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  // ── Restore checked state from localStorage ──
  // Runs only on event change (mount/id switch), NOT on background refetches,
  // so toggles made during the session survive query invalidation.
  useEffect(() => {
    const savedChecked = localStorage.getItem(`event_checklist_${eventId}`);
    if (savedChecked) {
      try { setCheckedIds(new Set(JSON.parse(savedChecked))); } catch { setCheckedIds(new Set()); }
    } else {
      setCheckedIds(new Set());
    }
  }, [eventId]);

  const toggleChecklistItem = useCallback((itemId: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      localStorage.setItem(`event_checklist_${eventId}`, JSON.stringify(Array.from(next)));
      return next;
    });
  }, [eventId]);

  const checklistProgress = checklistItems.length > 0 ? checkedIds.size / checklistItems.length : 0;

  // Report live progress up so the tab badge (rendered by the parent) mirrors
  // it while the checklist tab is mounted.
  useEffect(() => {
    onProgressChange?.(checkedIds.size, checklistItems.length, checklistProgress);
  }, [checkedIds.size, checklistItems.length, checklistProgress, onProgressChange]);

  const sections: {
    key: ChecklistSection;
    icon: typeof Wrench;
    iconClass: string;
    label: string;
    formatQuantity?: (q: number, unit: string) => string;
  }[] = [
    { key: "equipment", icon: Wrench, iconClass: "text-primary", label: t('common:equipment') },
    { key: "stock", icon: Package, iconClass: "text-primary", label: t('events:summary.warehouse_supplies'), formatQuantity: (q, unit) => `${q.toFixed(2)} ${unit || t('common:unit_short')}` },
    { key: "purchase", icon: ShoppingCart, iconClass: "text-warning", label: t('events:summary.supplies_to_buy') },
    { key: "extra", icon: Zap, iconClass: "text-primary", label: t('events:general.extras'), formatQuantity: () => "" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header card */}
      <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border">
        <h1 className="text-2xl font-black text-text uppercase tracking-tight mb-2">
          {t('events:summary.checklist_title')}
        </h1>
        <p className="text-text-secondary text-sm flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary" />
          {event.service_type} • {new Date(event.event_date + "T12:00:00").toLocaleDateString(moneyLocale)}
        </p>

        {checklistItems.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-text-secondary">
                {t('events:summary.checklist_count', { current: checkedIds.size, total: checklistItems.length })}
              </span>
              <span className="font-bold text-primary">
                {Math.round(checklistProgress * 100)}%
              </span>
            </div>
            <div className="w-full bg-surface-alt rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out premium-gradient"
                style={{ width: `${Math.round(checklistProgress * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {checklistItems.length === 0 ? (
        <div className="bg-card shadow-sm rounded-2xl border border-border p-8 text-center">
          <ClipboardList className="mx-auto h-12 w-12 text-text-secondary mb-3" aria-hidden="true" />
          <p className="text-text-secondary">{t('events:summary.checklist_empty')}</p>
          <p className="text-sm text-text-secondary mt-1">
            {t('events:summary.checklist_empty_desc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map(({ key: section, icon: Icon, iconClass, label, formatQuantity }) => {
            const items = checklistItems.filter((i) => i.section === section);
            if (items.length === 0) return null;
            return (
              <div key={section} className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border">
                <h2 className="text-sm font-black text-text uppercase tracking-tight mb-4 flex items-center gap-2">
                  <Icon className={clsx("h-4 w-4", iconClass)} aria-hidden="true" />
                  {label}
                </h2>
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleChecklistItem(item.id)}
                      className={clsx(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left",
                        checkedIds.has(item.id)
                          ? "bg-success/5 hover:bg-success/10"
                          : "hover:bg-surface-alt"
                      )}
                    >
                      {checkedIds.has(item.id) ? (
                        <CheckSquare className="h-5 w-5 text-success shrink-0" />
                      ) : (
                        <Square className="h-5 w-5 text-text-secondary shrink-0" />
                      )}
                      <span className={clsx(
                        "flex-1 text-sm font-medium",
                        checkedIds.has(item.id) ? "line-through text-text-secondary" : "text-text"
                      )}>
                        {item.name}
                      </span>
                      {formatQuantity && (
                        <span className="text-xs text-text-secondary shrink-0">
                          {formatQuantity(item.quantity, item.unit)}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
