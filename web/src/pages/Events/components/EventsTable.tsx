import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, CalendarPlus, ArrowUp, ArrowDown } from "lucide-react";
import { es, enUS } from "date-fns/locale";
import { format } from "date-fns";

import { Card } from "../../../components/Card";
import Empty from "../../../components/Empty";
import { Pagination } from "../../../components/Pagination";
import { SkeletonTable } from "../../../components/Skeleton";
import { StatusDropdown, EventStatus } from "../../../components/StatusDropdown";
import { RowActionMenu, type RowActionMenuItem } from "../../../components/RowActionMenu";
import { formatCurrency as libFormatCurrency } from "../../../lib/finance";
import type useRowSelection from "../../../hooks/useRowSelection";

/**
 * Events list table branch of the Events page.
 *
 * Lifted from `EventList.tsx`. Presentational: it renders the skeleton, empty
 * state, sortable table, and pagination. All data (rows, selection state,
 * sort/pagination state) comes via props; the parent owns the server-side /
 * client-side query hooks and the URL state.
 */

export type EventWithClient = {
  id: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  service_type: string;
  num_people: number;
  status: string;
  total_amount: number;
  currency?: string;
  city?: string | null;
  location?: string | null;
  client?: { name: string; phone: string } | null;
};

export interface EventsTableProps {
  loading: boolean;
  paginatedEvents: EventWithClient[];
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  sortKey: string;
  sortOrder: "asc" | "desc";
  hasActiveFilters: boolean;
  /** Row multi-select state from `useRowSelection`. */
  selection: ReturnType<typeof useRowSelection<string>>;
  /** Current i18n language ("es"/"en") — drives the date format/locale. */
  language: string;
  /** Build the row action menu items for a given event id. */
  getRowActions: (eventId: string) => RowActionMenuItem[];
  onSort: (key: keyof EventWithClient) => void;
  onRowClick: (eventId: string) => void;
  onRowContext: (eventId: string, x: number, y: number) => void;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  onPageChange: (page: number) => void;
}

const formatDate = (dateStr: string, language: string) => {
  const dateLocale = language === "en" ? enUS : es;
  try {
    return format(new Date(dateStr + "T12:00:00"), language === "en" ? "MMM d, yyyy" : "d 'de' MMM yyyy", {
      locale: dateLocale,
    });
  } catch {
    return dateStr;
  }
};

const formatCurrency = (value: number, currency?: string) => libFormatCurrency(value, currency);

export const EventsTable: React.FC<EventsTableProps> = ({
  loading,
  paginatedEvents,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  sortKey,
  sortOrder,
  hasActiveFilters,
  selection,
  language,
  getRowActions,
  onSort,
  onRowClick,
  onRowContext,
  onToggleRow,
  onToggleAll,
  onPageChange,
}) => {
  const { t } = useTranslation(["events", "common"]);

  const renderSortIcon = (key: keyof EventWithClient) => {
    if (sortKey !== key) return null;
    return sortOrder === "asc" ? (
      <ArrowUp className="inline h-3 w-3 ml-1" aria-hidden="true" />
    ) : (
      <ArrowDown className="inline h-3 w-3 ml-1" aria-hidden="true" />
    );
  };

  const getSortAriaSort = (key: keyof EventWithClient): "ascending" | "descending" | "none" => {
    if (sortKey !== key) return "none";
    return sortOrder === "asc" ? "ascending" : "descending";
  };

  return (
    <Card variant="glass" padding="none" className="overflow-hidden">
      {loading ? (
        <SkeletonTable
          rows={6}
          columns={[
            { width: "w-28" },
            { width: "w-40" },
            { width: "w-36" },
            { width: "w-24", badge: true },
            { width: "w-28" },
            { width: "w-20" },
          ]}
        />
      ) : paginatedEvents.length === 0 ? (
        <Empty
          icon={CalendarDays}
          title={hasActiveFilters ? t("events:list.empty.no_results_title") : t("events:list.empty.no_events_title")}
          description={hasActiveFilters ? t("events:list.empty.no_results_description") : t("events:list.empty.no_events_description")}
          action={
            !hasActiveFilters ? (
              <Link
                to="/events/new"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg transition-all hover:scale-[1.02]"
              >
                <CalendarPlus className="h-5 w-5 mr-2" aria-hidden="true" />
                {t("events:list.empty.create_event")}
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table" aria-label={t("events:list.table.aria")}>
            <caption className="sr-only">
              {t("events:list.table.caption", { total: totalItems, page: currentPage, pages: totalPages })}
            </caption>
            <thead>
              <tr>
                {/* Multi-select checkbox (#885) — desktop only */}
                <th scope="col" className="px-2 py-3 w-10 text-center hidden lg:table-cell">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer align-middle"
                    checked={selection.allSelected}
                    ref={(el) => { if (el) el.indeterminate = selection.someSelected; }}
                    onChange={onToggleAll}
                    aria-label={t("common:a11y.select_all_events")}
                  />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                  onClick={() => onSort("event_date")}
                  aria-sort={getSortAriaSort("event_date")}
                >
                  {t("events:list.table.date")} {renderSortIcon("event_date")}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary">
                  {t("events:list.table.client")}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                  onClick={() => onSort("service_type")}
                  aria-sort={getSortAriaSort("service_type")}
                >
                  {t("events:list.table.service")} {renderSortIcon("service_type")}
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-text-secondary">
                  {t("events:list.table.status")}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                  onClick={() => onSort("total_amount")}
                  aria-sort={getSortAriaSort("total_amount")}
                >
                  {t("events:list.table.total")} {renderSortIcon("total_amount")}
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">{t("events:list.table.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedEvents.map((event) => (
                <tr
                  key={event.id}
                  className="group hover:bg-surface-alt/50 cursor-pointer transition-colors"
                  onClick={() => onRowClick(event.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onRowContext(event.id, e.clientX, e.clientY);
                  }}
                >
                  {/* Multi-select checkbox (#885) — desktop only */}
                  <td className="px-2 py-4 w-10 text-center hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer align-middle"
                      checked={selection.selected.has(event.id)}
                      onChange={() => onToggleRow(event.id)}
                      aria-label={t("common:a11y.select_named", { name: event.client?.name ?? t("common:nav.events") })}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-text">{formatDate(event.event_date, language)}</div>
                    {event.start_time && (
                      <div className="text-xs text-text-secondary">
                        {event.start_time}
                        {event.end_time ? ` – ${event.end_time}` : ""}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-text">{event.client?.name ?? t("events:list.table.no_client")}</div>
                    {event.city && <div className="text-xs text-text-secondary truncate max-w-[180px]">{event.city}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-text">{event.service_type}</div>
                    <div className="text-xs text-text-secondary">
                      {t(event.num_people === 1 ? "events:list.table.people_one" : "events:list.table.people_other", { count: event.num_people })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <StatusDropdown eventId={event.id} currentStatus={event.status as EventStatus} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                    {formatCurrency(event.total_amount, event.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <RowActionMenu items={getRowActions(event.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && paginatedEvents.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={onPageChange}
        />
      )}
    </Card>
  );
};

export default EventsTable;
