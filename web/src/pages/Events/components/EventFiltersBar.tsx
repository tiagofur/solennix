import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Search, X } from "lucide-react";

import { getPeriodRange, getActivePeriod } from "../../../lib/periods";
import type { EventsViewMode } from "./EventsToolbar";

/**
 * Filters bar for the Events page: search input (+ `/` focus shortcut),
 * period chips (today/week/month/custom), custom date inputs, and status
 * chips.
 *
 * Lifted from `EventList.tsx`. The search-input ref and the `/` focus effect
 * live HERE (presentational concern owned by the input), while the URL state
 * stays in the parent — chips/date/status funnel through `onFilterChange`.
 *
 * Period chips use the parent's URL `setSearchParams` indirectly via
 * `onSetDateRange` so the from/to + page-reset stays atomic with the rest of
 * the page.
 */

export type StatusFilter = "all" | "quoted" | "confirmed" | "completed" | "cancelled";

export interface EventFiltersBarProps {
  searchTerm: string;
  statusFilter: StatusFilter;
  dateFrom: string;
  dateTo: string;
  viewMode: EventsViewMode;
  /** Generic URL filter update, e.g. (key, value). Empty/"all" deletes the key. */
  onFilterChange: (key: string, value: string) => void;
  /** Atomic from/to + page-reset update used by the period chips. */
  onSetDateRange: (range: { from: string; to: string }) => void;
  /** Atomic clear of from/to + page. */
  onClearDateRange: () => void;
}

export const EventFiltersBar: React.FC<EventFiltersBarProps> = ({
  searchTerm,
  statusFilter,
  dateFrom,
  dateTo,
  viewMode,
  onFilterChange,
  onSetDateRange,
  onClearDateRange,
}) => {
  const { t } = useTranslation(["events", "common"]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus the search input on "/" keydown (Linear/GitHub/Notion pattern).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable === true;
      if (isEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const activePeriod = getActivePeriod(dateFrom, dateTo);

  const statusChips: { label: string; value: StatusFilter }[] = [
    { label: t("events:list.status.all"), value: "all" },
    { label: t("events:list.status.quoted"), value: "quoted" },
    { label: t("events:list.status.confirmed"), value: "confirmed" },
    { label: t("events:list.status.completed"), value: "completed" },
    { label: t("events:list.status.cancelled"), value: "cancelled" },
  ];

  const periodChips = [
    { label: t("events:list.period.today"), value: "today" },
    { label: t("events:list.period.week"), value: "week" },
    { label: t("events:list.period.month"), value: "month" },
    { label: t("events:list.period.custom"), value: "custom" },
  ] as const;

  return (
    <>
      {/* Search bar + Period Chips & Date Inputs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search bar */}
        <div className="relative max-w-md w-full">
          <label htmlFor="event-search" className="sr-only">
            {t("events:list.search_placeholder")}
          </label>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-text-secondary" aria-hidden="true" />
          </div>
          <input
            id="event-search"
            ref={searchInputRef}
            type="search"
            className="block w-full pl-10 pr-16 py-2 border border-border rounded-xl leading-5 bg-card text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary sm:text-sm transition duration-150 ease-in-out"
            placeholder={t("events:list.search_placeholder")}
            value={searchTerm}
            onChange={(e) => onFilterChange("q", e.target.value)}
            aria-label={t("events:list.search_aria")}
          />
          {!searchTerm && (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 text-[10px] font-semibold text-text-tertiary bg-surface-alt border border-border rounded pointer-events-none select-none">
              /
            </kbd>
          )}
          {searchTerm && (
            <button
              type="button"
              onClick={() => onFilterChange("q", "")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text transition-colors"
              aria-label={t("events:list.search_clear")}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Period Chips & Date Inputs */}
        {viewMode === "list" && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {periodChips.map((chip) => {
                const active = activePeriod === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => {
                      if (chip.value === "custom") {
                        if (!dateFrom && !dateTo) {
                          const todayStr = format(new Date(), "yyyy-MM-dd");
                          onSetDateRange({ from: todayStr, to: todayStr });
                        }
                      } else {
                        onSetDateRange(getPeriodRange(chip.value));
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all active-ios-scale ${
                      active
                        ? "bg-primary text-white border-primary"
                        : "bg-card text-text-secondary border-border hover:border-primary/50 hover:text-primary"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
              {activePeriod !== "all" && (
                <button
                  type="button"
                  onClick={onClearDateRange}
                  className="text-xs text-text-tertiary hover:text-error transition-colors ml-1 font-semibold"
                >
                  {t("common:action.clear", { defaultValue: "Limpiar" })}
                </button>
              )}
            </div>

            {/* Custom picker inputs (shown only when 'custom' is active) */}
            {activePeriod === "custom" && (
              <div className="flex items-center gap-1.5 animate-fade-in">
                <label htmlFor="date-from" className="sr-only">{t("events:list.date_filter.from")}</label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => onFilterChange("from", e.target.value)}
                  className="text-xs border border-border rounded-lg px-2 py-1 bg-card text-text focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  aria-label={t("events:list.date_filter.from_aria")}
                />
                <span className="text-xs text-text-secondary">—</span>
                <label htmlFor="date-to" className="sr-only">{t("events:list.date_filter.to")}</label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => onFilterChange("to", e.target.value)}
                  className="text-xs border border-border rounded-lg px-2 py-1 bg-card text-text focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  aria-label={t("events:list.date_filter.to_aria")}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Status Chips */}
      <div className="flex flex-wrap items-center gap-2">
        {statusChips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => onFilterChange("status", chip.value)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors active-ios-scale ${
              statusFilter === chip.value
                ? "bg-primary text-white border-primary"
                : "bg-card text-text-secondary border-border hover:border-primary/50 hover:text-primary"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </>
  );
};

export default EventFiltersBar;
