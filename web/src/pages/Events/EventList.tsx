import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameDay,
  startOfDay,
  type Locale,
} from "date-fns";
import { es, enUS } from "date-fns/locale";

import { Edit, Trash2, Download, Eye, Unlock, Sparkles, X } from "lucide-react";

import { ContextMenu } from "../../components/ContextMenu";
import { BulkActionBar } from "../../components/BulkActionBar";
import { useRowSelection } from "../../hooks/useRowSelection";
import { exportToCsv } from "../../lib/exportCsv";
import { formatCurrency as libFormatCurrency } from "../../lib/finance";
import { parseLocalDate } from "../../lib/dateUtils";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { usePagination } from "../../hooks/usePagination";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";

import {
  useEventsPaginated,
  useDeleteEvent,
  useEventSearch,
  useEventsByDateRange,
} from "../../hooks/queries/useEventQueries";

import {
  useCreateUnavailableDates,
  useDeleteUnavailableDate,
  useUnavailableDatesByRange,
} from "../../hooks/queries/useUnavailableDatesQueries";

import { queryKeys } from "../../hooks/queries/queryKeys";
import { useToast } from "../../hooks/useToast";
import { API_URL } from "../../lib/api";
import { logError } from "../../lib/errorHandler";
import { UnavailableDatesModal } from "../Calendar/components/UnavailableDatesModal";
import type { EventSearchFilters } from "../../services/eventService";
import type { RowActionMenuItem } from "../../components/RowActionMenu";
import { EventStatus } from "../../components/StatusDropdown";

import { EventsToolbar, type EventsViewMode } from "./components/EventsToolbar";
import { EventFiltersBar, type StatusFilter } from "./components/EventFiltersBar";
import { EventsTable, type EventWithClient } from "./components/EventsTable";
import { EventsCalendarView } from "./components/EventsCalendarView";

const ITEMS_PER_PAGE = 10;

const pickDateFnsLocale = (lang: string | undefined): Locale =>
  lang?.startsWith("en") ? enUS : es;

export const EventList: React.FC = () => {
  const { t, i18n } = useTranslation(["events", "calendar", "common"]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const deleteEvent = useDeleteEvent();

  // Normalized today
  const normalizedToday = startOfDay(new Date());
  const dfnsLocale = useMemo(() => pickDateFnsLocale(i18n.language), [i18n.language]);

  // Read URL parameters
  const viewMode = (searchParams.get("view") || "list") as EventsViewMode;
  const searchTerm = searchParams.get("q") || "";
  const statusFilter = (searchParams.get("status") || "all") as StatusFilter;
  const dateFrom = searchParams.get("from") || "";
  const dateTo = searchParams.get("to") || "";
  const urlPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const urlSort = searchParams.get("sort") || "event_date";
  const urlOrder = (searchParams.get("order") || "desc") as "asc" | "desc";

  // Onboarding Tip Gate (localStorage-backed)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem("eventosOnboardingShown") !== "true";
  });
  const dismissOnboarding = () => {
    localStorage.setItem("eventosOnboardingShown", "true");
    setShowOnboarding(false);
  };

  // State for Calendar Mode
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(normalizedToday));
  const [isManagingBlocks, setIsManagingBlocks] = useState(false);
  const [isExportingIcal, setIsExportingIcal] = useState(false);
  const [isConfirmingUnblock, setIsConfirmingUnblock] = useState(false);
  const [contextMenuDate, setContextMenuDate] = useState<string | undefined>();

  // Calendar Range start/end
  const rangeStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  // Fetch events & unavailable dates for visible calendar range
  const { data: eventsRangeData, error: eventsError, isFetching: eventsRangeFetching } =
    useEventsByDateRange(rangeStart, rangeEnd);
  const { data: unavailableData, error: unavailableError, isFetching: unavailableFetching } =
    useUnavailableDatesByRange(rangeStart, rangeEnd);

  const createUnavailableDates = useCreateUnavailableDates();
  const deleteUnavailableDate = useDeleteUnavailableDate();

  const eventsRange = useMemo(() => ((eventsRangeData as EventWithClient[] | undefined) ?? []), [eventsRangeData]);
  const unavailableDates = useMemo(() => (unavailableData ?? []), [unavailableData]);

  // Error logging
  useEffect(() => {
    if (eventsError) logError("EventList:eventsRange", eventsError);
    if (unavailableError) logError("EventList:unavailable", unavailableError);
  }, [eventsError, unavailableError]);

  const hasRangeError = !!eventsError || !!unavailableError;

  const refreshUnavailableRange = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.unavailableDates.byRange(rangeStart, rangeEnd),
    });
  }, [queryClient, rangeStart, rangeEnd]);

  // Period helpers live in lib/periods (shared with EventFiltersBar).
  // Blocked-date modifiers + per-day status dots are computed inside
  // EventsCalendarView (pure derivations from eventsRange/unavailableDates).

  // Sync Calendar Month whenever date range changes via chips
  useEffect(() => {
    if (dateFrom && viewMode === "calendar") {
      const parsed = parseLocalDate(dateFrom);
      setCurrentMonth(startOfMonth(parsed));
      setSelectedDate(parsed);
    }
  }, [dateFrom, viewMode]);

  // Selected date info
  // filteredEventsRange drives both the calendar day-dots and the side panel.
  const filteredEventsRange = useMemo(
    () => (statusFilter !== "all" ? eventsRange.filter((e) => e.status === statusFilter) : eventsRange),
    [eventsRange, statusFilter],
  );

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return filteredEventsRange;
    return filteredEventsRange.filter((e) => isSameDay(parseLocalDate(e.event_date), selectedDate));
  }, [filteredEventsRange, selectedDate]);

  const selectedUnavailable = useMemo(() => {
    return unavailableDates.find((d) => {
      const start = parseLocalDate(d.start_date);
      const end = parseLocalDate(d.end_date);
      return selectedDate && selectedDate >= start && selectedDate <= end;
    });
  }, [unavailableDates, selectedDate]);

  const handleUnblock = async () => {
    if (!selectedUnavailable) return;
    try {
      await deleteUnavailableDate.mutateAsync(selectedUnavailable.id);
      refreshUnavailableRange();
      addToast(t("calendar:unblock.confirm"), "success");
      setSelectedDate(undefined);
    } catch (error) {
      logError("EventList:handleUnblock", error);
      addToast(t("calendar:error.unblock_failed"), "error");
    } finally {
      setIsConfirmingUnblock(false);
    }
  };

  const handleExportIcal = useCallback(async () => {
    if (isExportingIcal) return;
    setIsExportingIcal(true);
    try {
      const response = await fetch(
        `${API_URL}/events/ical?start=${rangeStart}&end=${rangeEnd}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `solennix-${rangeStart}-${rangeEnd}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      logError(err, "EventList.handleExportIcal");
      addToast(t("calendar:error.export_failed"), "error");
    } finally {
      setIsExportingIcal(false);
    }
  }, [isExportingIcal, rangeStart, rangeEnd, addToast, t]);

  const handleContextMenu = useCallback(
    (date: Date, e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenuDate(format(date, "yyyy-MM-dd"));
      setIsManagingBlocks(true);
    },
    [],
  );

  // Shared Server-side / Client-side pagination logic for LIST mode
  const hasFilters = !!(searchTerm || statusFilter !== "all" || dateFrom || dateTo);
  const paginatedQuery = useEventsPaginated({
    page: urlPage,
    limit: ITEMS_PER_PAGE,
    sort: urlSort,
    order: urlOrder,
  });

  const searchFilters: EventSearchFilters = useMemo(() => {
    const filters: EventSearchFilters = {};
    if (searchTerm) filters.q = searchTerm;
    if (statusFilter !== "all") filters.status = statusFilter;
    if (dateFrom) filters.from = dateFrom;
    if (dateTo) filters.to = dateTo;
    return filters;
  }, [searchTerm, statusFilter, dateFrom, dateTo]);
  
  const searchQuery = useEventSearch(searchFilters);

  const loading = viewMode === "list"
    ? (hasFilters ? searchQuery.isLoading : paginatedQuery.isLoading)
    : (eventsRangeFetching || unavailableFetching);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const updateFilter = useCallback((key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === "all") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      if (key !== "page") {
        next.delete("page");
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  // Context-menu state (#883): row right-click opens positioned menu.
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; eventId: string } | null>(null);
  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);
  const getRowActions = useCallback(
    (eventId: string): RowActionMenuItem[] => [
      { label: t("events:list.actions.view_summary"), icon: Eye, onClick: () => navigate(`/events/${eventId}/summary`) },
      { label: t("events:list.actions.edit"), icon: Edit, onClick: () => navigate(`/events/${eventId}/edit`) },
      { label: t("events:list.actions.delete"), icon: Trash2, onClick: () => requestDelete(eventId), variant: "destructive" as const },
    ],
    [t, navigate],
  );

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);
    deleteEvent.mutate(id);
  };

  // Bulk delete selected events (#885)
  const bulkDelete = () => {
    selection.selectedArray.forEach((id) => deleteEvent.mutate(id));
    selection.clear();
  };

  // Export only selected events (#885)
  const exportSelected = () => {
    const selectedEvents = csvRows.filter((e) => selection.selected.has(e.id));
    exportEventsToCsv(selectedEvents);
  };

  const filteredEvents: EventWithClient[] = hasFilters ? (searchQuery.data ?? []) : [];
  const clientPagination = usePagination({
    data: filteredEvents,
    itemsPerPage: ITEMS_PER_PAGE,
    initialSortKey: "event_date",
    initialSortOrder: "desc",
  });

  const paginatedEvents: EventWithClient[] = hasFilters
    ? clientPagination.currentData
    : paginatedQuery.data?.data ?? [];

  // Multi-select for bulk actions (#885) — desktop only column.
  const selection = useRowSelection(paginatedEvents.map((e) => e.id));

  const currentPage = hasFilters ? clientPagination.currentPage : urlPage;
  const totalPages = hasFilters ? clientPagination.totalPages : paginatedQuery.data?.total_pages ?? 1;
  const totalItems = hasFilters ? clientPagination.totalItems : paginatedQuery.data?.total ?? 0;
  const headerCount = hasFilters ? filteredEvents.length : (paginatedQuery.data?.total ?? 0);

  const sortKey = hasFilters ? clientPagination.sortKey : urlSort;
  const sortOrder = hasFilters ? clientPagination.sortOrder : urlOrder;
  const dateLocale = i18n.language === "en" ? enUS : es;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + "T12:00:00"), i18n.language === "en" ? "MMM d, yyyy" : "d 'de' MMM yyyy", {
        locale: dateLocale,
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value: number, currency?: string) => libFormatCurrency(value, currency);

  // CSV export reflects the current view: filtered results when searching,
  // otherwise the current paginated page. Exporting the entire catalog would
  // require a dedicated backend endpoint (out of scope for #861).
  const csvRows = hasFilters ? filteredEvents : paginatedEvents;
  const hasActiveFilters = !!(searchTerm || statusFilter !== "all" || dateFrom || dateTo);

  // Shared CSV export used by the toolbar (all current rows) and the bulk
  // action bar (selected rows only).
  const exportEventsToCsv = useCallback(
    (rows: EventWithClient[]) => {
      exportToCsv(
        t("events:list.csv.file_name"),
        [
          t("events:list.csv.headers.date"),
          t("events:list.csv.headers.client"),
          t("events:list.csv.headers.service_type"),
          t("events:list.csv.headers.people"),
          t("events:list.csv.headers.status"),
          t("events:list.csv.headers.total"),
          t("events:list.csv.headers.city"),
        ],
        rows.map((e) => [
          formatDate(e.event_date),
          e.client?.name ?? "",
          e.service_type,
          e.num_people,
          t(`events:list.status.${e.status as EventStatus}`),
          formatCurrency(e.total_amount, e.currency),
          e.city ?? "",
        ]),
      );
    },
    [t],
  );

  const handleExportCsv = useCallback(() => exportEventsToCsv(csvRows), [exportEventsToCsv, csvRows]);

  const handlePageChange = useCallback((page: number) => {
    if (hasFilters) {
      clientPagination.handlePageChange(page);
    } else {
      updateFilter("page", page === 1 ? "" : String(page));
    }
  }, [hasFilters, clientPagination, updateFilter]);

  const handleSort = useCallback((key: keyof EventWithClient) => {
    if (hasFilters) {
      clientPagination.handleSort(key);
    } else {
      const newOrder = urlSort === String(key) && urlOrder === "asc" ? "desc" : "asc";
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set("sort", String(key));
        next.set("order", newOrder);
        next.delete("page");
        return next;
      }, { replace: true });
    }
  }, [hasFilters, clientPagination, urlSort, urlOrder, setSearchParams]);

  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.unavailableDates.byRange(rangeStart, rangeEnd) });
  }, [queryClient, rangeStart, rangeEnd]);

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        title={t("events:list.delete_confirm.title")}
        description={t("events:list.delete_confirm.description")}
        confirmText={t("events:list.delete_confirm.confirm")}
        cancelText={t("events:list.delete_confirm.cancel")}
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />

      {/* Onboarding Tip Banner */}
      {showOnboarding && (
        <Card variant="glass" padding="sm" className="relative border-primary/30 flex items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="h-4.5 w-4.5 text-primary" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-text">
                {t("calendar:onboarding.title", { defaultValue: "¡Nuevo! Calendario unificado" })}
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                {t("calendar:onboarding.description", { defaultValue: "El calendario ahora está integrado dentro de Eventos. Elegí la vista que prefieras." })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissOnboarding}
            className="p-1.5 text-text-tertiary hover:text-text rounded-full hover:bg-surface-alt transition-colors"
            aria-label={t("common:action.close", { defaultValue: "Cerrar" })}
          >
            <X className="h-4 w-4" />
          </button>
        </Card>
      )}

      {/* Unified responsive toolbar (desktop sticky + mobile header), de-duped (#881) */}
      <EventsToolbar
        viewMode={viewMode}
        headerCount={headerCount}
        loading={loading}
        onToggleView={(mode) => {
          if (mode === "list") {
            updateFilter("view", "list");
          } else {
            // Switching to calendar clears the date range + page so the month
            // view isn't pinned to a stale chip selection.
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set("view", "calendar");
              next.delete("from");
              next.delete("to");
              next.delete("page");
              return next;
            }, { replace: true });
          }
        }}
        onExportIcal={handleExportIcal}
        isExportingIcal={isExportingIcal}
        onManageBlocks={() => {
          setContextMenuDate(undefined);
          setIsManagingBlocks(true);
        }}
        onExportCsv={handleExportCsv}
        csvRowCount={csvRows.length}
      />

      {/* Filters: search + period chips + custom dates + status chips */}
      <EventFiltersBar
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        dateFrom={dateFrom}
        dateTo={dateTo}
        viewMode={viewMode}
        onFilterChange={updateFilter}
        onSetDateRange={(range) => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set("from", range.from);
            next.set("to", range.to);
            next.delete("page");
            return next;
          }, { replace: true });
        }}
        onClearDateRange={() => {
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete("from");
            next.delete("to");
            next.delete("page");
            return next;
          }, { replace: true });
        }}
      />

      {/* Main Content Area */}
      {viewMode === "list" ? (
        <EventsTable
          loading={loading}
          paginatedEvents={paginatedEvents}
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          sortKey={sortKey}
          sortOrder={sortOrder}
          hasActiveFilters={hasActiveFilters}
          selection={selection}
          language={i18n.language}
          getRowActions={getRowActions}
          onSort={handleSort}
          onRowClick={(eventId) => navigate(`/events/${eventId}/summary`)}
          onRowContext={(eventId, x, y) => setCtxMenu({ x, y, eventId })}
          onToggleRow={selection.toggle}
          onToggleAll={selection.toggleAll}
          onPageChange={handlePageChange}
        />
      ) : (
        <EventsCalendarView
          loading={loading}
          hasRangeError={hasRangeError}
          eventsRange={filteredEventsRange}
          unavailableDates={unavailableDates}
          selectedEvents={selectedEvents}
          selectedUnavailable={selectedUnavailable}
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          dfnsLocale={dfnsLocale}
          onConfirmUnblock={() => setIsConfirmingUnblock(true)}
          onContextMenu={handleContextMenu}
          onRetry={handleRetry}
          onEventClick={(eventId) => navigate(`/events/${eventId}/summary`)}
        />
      )}

      {/* Block management dialog */}
      <UnavailableDatesModal
        isOpen={isManagingBlocks}
        onClose={() => {
          setIsManagingBlocks(false);
          setContextMenuDate(undefined);
        }}
        onSave={refreshUnavailableRange}
        onDelete={refreshUnavailableRange}
        createUnavailableDates={createUnavailableDates.mutateAsync}
        deleteUnavailableDate={deleteUnavailableDate.mutateAsync}
        initialDate={contextMenuDate}
      />

      {/* Unblock Confirmation Dialog */}
      {isConfirmingUnblock && selectedUnavailable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm">
          <Card variant="glass" padding="none" className="w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto h-14 w-14 bg-error/10 rounded-full flex items-center justify-center mb-4">
                <Unlock className="h-7 w-7 text-error" />
              </div>
              <h3 className="text-lg font-bold text-text mb-2">{t("calendar:unblock.title")}</h3>
              <p className="text-sm text-text-secondary mb-1">
                {selectedUnavailable.start_date === selectedUnavailable.end_date
                  ? format(parseLocalDate(selectedUnavailable.start_date), "d MMMM yyyy", { locale: dfnsLocale })
                  : `${format(parseLocalDate(selectedUnavailable.start_date), "d MMM", { locale: dfnsLocale })} — ${format(parseLocalDate(selectedUnavailable.end_date), "d MMM yyyy", { locale: dfnsLocale })}`}
              </p>
              {selectedUnavailable.reason && (
                <p className="text-xs text-text-tertiary italic mb-4">
                  {t("calendar:unblock.reason_prefix", { reason: selectedUnavailable.reason })}
                </p>
              )}
            </div>
            <div className="flex gap-3 p-4 border-t border-border bg-surface-alt/40">
              <button
                type="button"
                onClick={() => setIsConfirmingUnblock(false)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-text-secondary hover:text-text bg-surface hover:bg-surface-alt border border-border rounded-xl transition-colors active-ios-scale"
              >
                {t("calendar:action.cancel")}
              </button>
              <button
                type="button"
                onClick={handleUnblock}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-error hover:bg-error/90 rounded-xl transition-colors shadow-sm active-ios-scale"
              >
                {t("calendar:unblock.confirm")}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Bulk actions bar (#885) — desktop only, list view only */}
      {viewMode === "list" && (
        <BulkActionBar count={selection.count} onClear={selection.clear}>
          <Button variant="glass" size="sm" onClick={exportSelected}>
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            {t("common:action.download")}
          </Button>
          <Button variant="danger" size="sm" onClick={bulkDelete}>
            <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
            {t("common:action.delete")}
          </Button>
        </BulkActionBar>
      )}

      {/* Right-click context menu (#883) — list view rows only */}
      {ctxMenu && viewMode === "list" && (
        <ContextMenu
          position={{ x: ctxMenu.x, y: ctxMenu.y }}
          items={getRowActions(ctxMenu.eventId)}
          onClose={closeCtxMenu}
        />
      )}
    </div>
  );
};
