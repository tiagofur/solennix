import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { DayPicker, type DayButtonProps } from "@daypicker/react";
import "@daypicker/react/style.css";
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

import {
  Search,
  Edit,
  Trash2,
  Download,
  CalendarDays,
  CalendarPlus,
  Zap,
  Eye,
  X,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Users,
  Clock,
  MapPin,
  Phone,
  DollarSign as DollarIcon,
  AlertTriangle,
  Calendar,
  Sparkles,
} from "lucide-react";

import { RowActionMenu } from "../../components/RowActionMenu";
import { exportToCsv } from "../../lib/exportCsv";
import { formatCurrency as libFormatCurrency } from "../../lib/finance";
import { parseLocalDate } from "../../lib/dateUtils";
import { buildBlockedDateList } from "../../lib/blockedDates";
import { dayPickerStyles } from "../../components/dayPickerStyles";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import Empty from "../../components/Empty";
import { usePagination } from "../../hooks/usePagination";
import { Pagination } from "../../components/Pagination";
import { SkeletonTable } from "../../components/Skeleton";
import { StatusDropdown, EventStatus } from "../../components/StatusDropdown";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";

import {
  useEvents,
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
import type { Event as EventType } from "../../types/entities";

type EventWithClient = EventType & { client?: { name: string; phone: string } | null };
type StatusFilter = "all" | EventStatus;
const ITEMS_PER_PAGE = 10;

const pickDateFnsLocale = (lang: string | undefined): Locale =>
  lang?.startsWith("en") ? enUS : es;

function makeDayButton(
  onCtxMenu: (date: Date, e: React.MouseEvent) => void,
  getDayInfo: (date: Date) => { dots: string[]; overflow: number },
  overflowLabel: (count: number) => string,
) {
  return function CustomDayButton({ day, children, ...props }: DayButtonProps) {
    const { dots, overflow } = getDayInfo(day.date);
    return (
      <button
        {...props}
        onContextMenu={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.preventDefault();
          onCtxMenu(day.date, e);
        }}
      >
        <span className="rdp-day-number">{children}</span>
        <span className="rdp-day-dots">
          {dots.map((status, i) => (
            <span
              key={i}
              className="rdp-day-dot"
              style={{ backgroundColor: `var(--color-status-${status})` }}
            />
          ))}
        </span>
        {overflow > 0 && (
          <span className="rdp-day-overflow">{overflowLabel(overflow)}</span>
        )}
      </button>
    );
  };
}

export const EventList: React.FC = () => {
  const { t, i18n } = useTranslation(["events", "calendar", "common"]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const deleteEvent = useDeleteEvent();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Normalized today
  const normalizedToday = startOfDay(new Date());
  const dfnsLocale = useMemo(() => pickDateFnsLocale(i18n.language), [i18n.language]);

  // Read URL parameters
  const viewMode = (searchParams.get("view") || "list") as "list" | "calendar";
  const searchTerm = searchParams.get("q") || "";
  const statusFilter = (searchParams.get("status") || "all") as StatusFilter;
  const dateFrom = searchParams.get("from") || "";
  const dateTo = searchParams.get("to") || "";
  const urlPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const urlSort = searchParams.get("sort") || "event_date";
  const urlOrder = (searchParams.get("order") || "desc") as "asc" | "desc";

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

  // Date picker period helpers
  const getPeriodRange = (period: "today" | "week" | "month") => {
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");

    if (period === "today") return { from: todayStr, to: todayStr };

    if (period === "week") {
      const day = today.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        from: format(monday, "yyyy-MM-dd"),
        to: format(sunday, "yyyy-MM-dd"),
      };
    }

    if (period === "month") {
      return {
        from: format(startOfMonth(today), "yyyy-MM-dd"),
        to: format(endOfMonth(today), "yyyy-MM-dd"),
      };
    }

    return { from: "", to: "" };
  };

  const getActivePeriod = (from: string, to: string) => {
    if (!from && !to) return "all";
    const today = new Date();
    const todayStr = format(today, "yyyy-MM-dd");
    if (from === todayStr && to === todayStr) return "today";

    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    if (from === format(monday, "yyyy-MM-dd") && to === format(sunday, "yyyy-MM-dd")) return "week";

    if (from === format(startOfMonth(today), "yyyy-MM-dd") && to === format(endOfMonth(today), "yyyy-MM-dd")) return "month";

    return "custom";
  };

  // Blocked dates calculation
  const { blockedDateList } = useMemo(
    () => ({ blockedDateList: buildBlockedDateList(unavailableDates) }),
    [unavailableDates],
  );

  const modifiers: { unavailable: Date[] } = { unavailable: blockedDateList };

  // Sync Calendar Month whenever date range changes via chips
  useEffect(() => {
    if (dateFrom && viewMode === "calendar") {
      const parsed = parseLocalDate(dateFrom);
      setCurrentMonth(startOfMonth(parsed));
      setSelectedDate(parsed);
    }
  }, [dateFrom, viewMode]);

  // Selected date info
  const selectedEvents = useMemo(() => {
    const filtered = statusFilter !== "all" 
      ? eventsRange.filter((e) => e.status === statusFilter)
      : eventsRange;
    if (!selectedDate) return filtered;
    return filtered.filter((e) => isSameDay(parseLocalDate(e.event_date), selectedDate));
  }, [eventsRange, selectedDate, statusFilter]);

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

  const dayInfoByDate = useMemo(() => {
    const map = new Map<string, { dots: string[]; total: number }>();
    const filtered = statusFilter !== "all" 
      ? eventsRange.filter((e) => e.status === statusFilter)
      : eventsRange;
    for (const event of filtered) {
      const existing = map.get(event.event_date) ?? { dots: [], total: 0 };
      existing.total += 1;
      if (existing.dots.length < 3) {
        existing.dots.push(event.status);
      }
      map.set(event.event_date, existing);
    }
    return map;
  }, [eventsRange, statusFilter]);

  const getDayInfo = useCallback(
    (date: Date): { dots: string[]; overflow: number } => {
      const info = dayInfoByDate.get(format(date, "yyyy-MM-dd"));
      if (!info) return { dots: [], overflow: 0 };
      const uniqueStatusCount = new Set(info.dots).size;
      const renderedDotsCount = Math.min(uniqueStatusCount, 3);
      return { dots: info.dots, overflow: Math.max(0, info.total - renderedDotsCount) };
    },
    [dayInfoByDate],
  );

  const overflowLabel = useCallback(
    (count: number) => t("calendar:overflow_more", { count }),
    [t],
  );

  const CustomDayButton = useMemo(
    () => makeDayButton(handleContextMenu, getDayInfo, overflowLabel),
    [handleContextMenu, getDayInfo, overflowLabel],
  );

  const statusLabel = (status: string): string => {
    switch (status) {
      case "confirmed": return t("events:list.status.confirmed");
      case "completed": return t("events:list.status.completed");
      case "cancelled": return t("events:list.status.cancelled");
      default: return t("events:list.status.quoted");
    }
  };

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
  const allEventsQuery = useEvents();

  const loading = viewMode === "list"
    ? (hasFilters ? searchQuery.isLoading : paginatedQuery.isLoading)
    : (eventsRangeFetching || unavailableFetching);

  const allEvents: EventWithClient[] = allEventsQuery.data ?? [];
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

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);
    deleteEvent.mutate(id);
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

  const currentPage = hasFilters ? clientPagination.currentPage : urlPage;
  const totalPages = hasFilters ? clientPagination.totalPages : paginatedQuery.data?.total_pages ?? 1;
  const totalItems = hasFilters ? clientPagination.totalItems : paginatedQuery.data?.total ?? 0;
  const headerCount = hasFilters ? filteredEvents.length : (paginatedQuery.data?.total ?? allEvents.length);

  const sortKey = hasFilters ? clientPagination.sortKey : urlSort;
  const sortOrder = hasFilters ? clientPagination.sortOrder : urlOrder;
  const dateLocale = i18n.language === "en" ? enUS : es;

  const statusChips: { label: string; value: StatusFilter }[] = useMemo(
    () => [
      { label: t("events:list.status.all"), value: "all" },
      { label: t("events:list.status.quoted"), value: "quoted" },
      { label: t("events:list.status.confirmed"), value: "confirmed" },
      { label: t("events:list.status.completed"), value: "completed" },
      { label: t("events:list.status.cancelled"), value: "cancelled" },
    ],
    [t],
  );

  const csvRows = hasFilters ? filteredEvents : allEvents;
  const hasActiveFilters = !!(searchTerm || statusFilter !== "all" || dateFrom || dateTo);



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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-text tracking-tight">
            {t("events:list.title")}{" "}
            {viewMode === "list" && !loading && headerCount > 0 && (
              <span className="text-base font-semibold text-text-secondary">
                ({headerCount})
              </span>
            )}
          </h1>
          
          {/* Segmented View Mode Toggle */}
          <div className="inline-flex rounded-xl bg-surface-alt/80 p-0.5 border border-border/60 backdrop-blur-xs">
            <button
              type="button"
              onClick={() => updateFilter("view", "list")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active-ios-scale ${
                viewMode === "list"
                  ? "bg-card text-text shadow-sm border border-border/30"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              {t("events:list.view_mode.list")}
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set("view", "calendar");
                  next.delete("from");
                  next.delete("to");
                  next.delete("page");
                  return next;
                }, { replace: true });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active-ios-scale ${
                viewMode === "calendar"
                  ? "bg-card text-text shadow-sm border border-border/30"
                  : "text-text-secondary hover:text-text"
              }`}
            >
              {t("events:list.view_mode.calendar")}
            </button>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2">
          {viewMode === "calendar" && (
            <>
              {/* Export .ics */}
              <Button
                variant="glass"
                size="md"
                onClick={handleExportIcal}
                disabled={isExportingIcal}
                className="active-ios-scale"
              >
                {isExportingIcal ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-text border-t-transparent mr-2" aria-hidden="true" />
                ) : (
                  <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                )}
                {t("calendar:export_ics")}
              </Button>

              {/* Manage Blocks */}
              <Button
                variant="glass"
                size="md"
                onClick={() => {
                  setContextMenuDate(undefined);
                  setIsManagingBlocks(true);
                }}
                className="active-ios-scale"
              >
                <Lock className="h-4 w-4 mr-2" aria-hidden="true" />
                {t("calendar:manage_blocks")}
              </Button>
            </>
          )}

          {viewMode === "list" && csvRows.length > 0 && (
            <button
              type="button"
              onClick={() =>
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
                  csvRows.map((e) => [
                    formatDate(e.event_date),
                    e.client?.name ?? "",
                    e.service_type,
                    e.num_people,
                    t(`events:list.status.${e.status as EventStatus}`),
                    formatCurrency(e.total_amount, e.currency),
                    e.city ?? "",
                  ]),
                )
              }
              className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
              aria-label={t("events:list.export_csv_aria")}
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              {t("events:list.export_csv")}
            </button>
          )}

          <Link
            to="/cotizacion-rapida"
            className="hidden lg:inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-bold rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
          >
            <Zap className="h-4 w-4 mr-2" aria-hidden="true" />
            {t("events:list.quick_quote")}
          </Link>
          <Link
            to="/events/new"
            className="hidden lg:inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02]"
          >
            <CalendarPlus className="h-5 w-5 mr-2" aria-hidden="true" />
            {t("events:list.new_event")}
          </Link>
        </div>
      </div>

      {/* Filters Area */}
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
            onChange={(e) => updateFilter("q", e.target.value)}
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
              onClick={() => updateFilter("q", "")}
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
              {([
                { label: t("events:list.period.today"), value: "today" },
                { label: t("events:list.period.week"), value: "week" },
                { label: t("events:list.period.month"), value: "month" },
                { label: t("events:list.period.custom"), value: "custom" },
              ] as const).map((chip) => {
                const active = getActivePeriod(dateFrom, dateTo) === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => {
                      if (chip.value === "custom") {
                        if (!dateFrom && !dateTo) {
                          const todayStr = format(new Date(), "yyyy-MM-dd");
                          updateFilter("from", todayStr);
                          updateFilter("to", todayStr);
                        }
                      } else {
                        const range = getPeriodRange(chip.value);
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev);
                          next.set("from", range.from);
                          next.set("to", range.to);
                          next.delete("page");
                          return next;
                        }, { replace: true });
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
              {getActivePeriod(dateFrom, dateTo) !== "all" && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.delete("from");
                      next.delete("to");
                      next.delete("page");
                      return next;
                    }, { replace: true });
                  }}
                  className="text-xs text-text-tertiary hover:text-error transition-colors ml-1 font-semibold"
                >
                  {t("common:action.clear", { defaultValue: "Limpiar" })}
                </button>
              )}
            </div>

            {/* Custom picker inputs (shown only when 'custom' is active) */}
            {getActivePeriod(dateFrom, dateTo) === "custom" && (
              <div className="flex items-center gap-1.5 animate-fade-in">
                <label htmlFor="date-from" className="sr-only">{t("events:list.date_filter.from")}</label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => updateFilter("from", e.target.value)}
                  className="text-xs border border-border rounded-lg px-2 py-1 bg-card text-text focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  aria-label={t("events:list.date_filter.from_aria")}
                />
                <span className="text-xs text-text-secondary">—</span>
                <label htmlFor="date-to" className="sr-only">{t("events:list.date_filter.to")}</label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => updateFilter("to", e.target.value)}
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
            onClick={() => updateFilter("status", chip.value)}
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

      {/* Main Content Area */}
      {viewMode === "list" ? (
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
              <table className="min-w-full divide-y divide-border" aria-label={t("events:list.table.aria")}>
                <caption className="sr-only">
                  {t("events:list.table.caption", { total: totalItems, page: currentPage, pages: totalPages })}
                </caption>
                <thead className="bg-surface-alt/55 border-b border-border">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                      onClick={() => handleSort("event_date")}
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
                      onClick={() => handleSort("service_type")}
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
                      onClick={() => handleSort("total_amount")}
                      aria-sort={getSortAriaSort("total_amount")}
                    >
                      {t("events:list.table.total")} {renderSortIcon("total_amount")}
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">{t("events:list.table.actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-border/60">
                  {paginatedEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="group hover:bg-surface-alt/40 cursor-pointer transition-colors"
                      onClick={() => navigate(`/events/${event.id}/summary`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-text">{formatDate(event.event_date)}</div>
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
                          <RowActionMenu
                            items={[
                              { label: t("events:list.actions.view_summary"), icon: Eye, onClick: () => navigate(`/events/${event.id}/summary`) },
                              { label: t("events:list.actions.edit"), icon: Edit, onClick: () => navigate(`/events/${event.id}/edit`) },
                              { label: t("events:list.actions.delete"), icon: Trash2, onClick: () => requestDelete(event.id), variant: "destructive" as const },
                            ]}
                          />
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
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={handlePageChange}
            />
          )}
        </Card>
      ) : (
        /* Calendar view grid/stack layout */
        <div className="relative flex flex-col xl:flex-row gap-8 fade-in" aria-busy={loading}>
          {hasRangeError && (
            <div role="alert" className="flex-1 flex items-center justify-between gap-3 px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm">
              <div className="flex items-center gap-2 text-error">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{t("calendar:error.load_failed")}</span>
              </div>
              <button type="button" onClick={handleRetry} className="text-error font-semibold hover:underline shrink-0">
                {t("calendar:error.retry")}
              </button>
            </div>
          )}

          {/* Calendar DayPicker Container */}
          <Card variant="glass" padding="md" className="xl:w-fit xl:shrink-0 flex justify-center relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-xs z-10 rounded-2xl" role="status">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
              </div>
            )}
            
            {dayPickerStyles}
            
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              modifiers={modifiers}
              modifiersClassNames={{ unavailable: "rdp-unavailable" }}
              className="flex justify-center"
              components={{ DayButton: CustomDayButton }}
              locale={dfnsLocale}
              labels={{
                labelPrevious: () => t("calendar:previous_month"),
                labelNext: () => t("calendar:next_month"),
              }}
            />
          </Card>

          {/* Selected Date events panel */}
          <Card variant="glass" padding="md" className="flex-1 min-w-0 flex flex-col justify-start relative min-h-[400px]">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/40 backdrop-blur-xs z-10 rounded-2xl" role="status">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
              </div>
            )}
            
            <div className="flex items-center justify-between mb-6 border-b border-border/60 pb-4">
              <h2 className="text-base font-black text-text">
                {selectedDate
                  ? format(selectedDate, "EEEE d MMMM", { locale: dfnsLocale }).replace(/^\w/, (c) => c.toUpperCase())
                  : format(currentMonth, "MMMM yyyy", { locale: dfnsLocale }).replace(/^\w/, (c) => c.toUpperCase())}
              </h2>
              {selectedEvents.length > 0 && (
                <span className="bg-primary/10 text-primary text-xs font-black px-2.5 py-0.5 rounded-full">
                  {selectedEvents.length} {selectedEvents.length === 1 ? t("events:list.table.people_one") : t("events:list.table.people_other")}
                </span>
              )}
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
              {selectedUnavailable ? (
                <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
                  <div className="h-16 w-16 bg-error/10 rounded-full flex items-center justify-center mb-4" aria-hidden="true">
                    <Lock className="h-8 w-8 text-error" aria-hidden="true" />
                  </div>
                  <p className="text-text font-bold text-sm mb-1">{t("calendar:blocked_dates.title")}</p>
                  <p className="text-text-secondary text-xs">
                    {selectedUnavailable.start_date === selectedUnavailable.end_date
                      ? format(parseLocalDate(selectedUnavailable.start_date), "d MMMM yyyy", { locale: dfnsLocale })
                      : `${format(parseLocalDate(selectedUnavailable.start_date), "d MMM", { locale: dfnsLocale })} — ${format(parseLocalDate(selectedUnavailable.end_date), "d MMM yyyy", { locale: dfnsLocale })}`}
                  </p>
                  {selectedUnavailable.reason && (
                    <p className="text-text-tertiary text-xs italic mt-2">{selectedUnavailable.reason}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsConfirmingUnblock(true)}
                    className="mt-4 text-error text-sm font-semibold hover:underline active-ios-scale"
                  >
                    {t("calendar:unblock.confirm")}
                  </button>
                </div>
              ) : selectedEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
                  <div className="h-16 w-16 bg-surface-alt/40 rounded-full flex items-center justify-center mb-4" aria-hidden="true">
                    <Calendar className="h-8 w-8 text-text-tertiary opacity-60" aria-hidden="true" />
                  </div>
                  <p className="text-text-secondary text-sm font-medium">
                    {selectedDate ? t("calendar:no_events_for_day") : t("calendar:no_events_for_month")}
                  </p>
                  <Link
                    to={selectedDate ? `/events/new?date=${format(selectedDate, "yyyy-MM-dd")}` : "/events/new"}
                    className="mt-4 inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors active-ios-scale"
                  >
                    {selectedDate ? t("calendar:create_event_for_date") : t("calendar:new_event")}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                  {selectedEvents.map((event) => (
                    <Card
                      key={event.id}
                      variant="glass"
                      padding="sm"
                      className="hover:border-primary/50 cursor-pointer transition-all active-ios-scale"
                      onClick={() => navigate(`/events/${event.id}/summary`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/events/${event.id}/summary`);
                        }
                      }}
                      aria-label={`${event.client?.name} - ${event.service_type}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="min-w-0 flex-1 mr-2">
                          <h3 className="text-sm font-bold text-text group-hover:text-primary transition-colors truncate">
                            {event.client?.name}
                          </h3>
                          <p className="text-xs text-text-secondary font-medium uppercase tracking-tight">
                            {event.service_type}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold shrink-0 ${
                            event.status === "confirmed"
                              ? "bg-status-confirmed/10 text-status-confirmed"
                              : event.status === "completed"
                                ? "bg-status-completed/10 text-status-completed"
                                : event.status === "cancelled"
                                  ? "bg-status-cancelled/10 text-status-cancelled"
                                  : "bg-status-quoted/10 text-status-quoted"
                          }`}
                        >
                          {statusLabel(event.status)}
                        </span>
                      </div>

                      <div className="space-y-2 mt-2 pt-2 border-t border-border/50">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center text-xs text-text-secondary">
                            <Clock className="h-3.5 w-3.5 mr-1.5 text-primary opacity-70" aria-hidden="true" />
                            <span className="truncate">
                              {event.start_time || "—"}
                              {event.start_time && event.end_time ? " - " : ""}
                              {event.end_time || ""}
                            </span>
                          </div>
                          <div className="flex items-center text-xs text-text-secondary">
                            <Users className="h-3.5 w-3.5 mr-1.5 text-primary opacity-70" aria-hidden="true" />
                            <span>{event.num_people} pax</span>
                          </div>
                        </div>

                        {event.location && (
                          <div className="flex items-start text-xs text-text-secondary">
                            <MapPin className="h-3.5 w-3.5 mr-1.5 mt-0.5 text-primary opacity-70 shrink-0" aria-hidden="true" />
                            <span className="line-clamp-1">{event.location}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/30">
                          <div className="flex items-center text-xs text-text-secondary">
                            <Phone className="h-3 w-3 mr-1" aria-hidden="true" />
                            <span>{event.client?.phone || "—"}</span>
                          </div>
                          <div className="flex items-center text-xs font-bold text-text">
                            <DollarIcon className="h-3 w-3 mr-0.5 text-success" aria-hidden="true" />
                            {event.total_amount?.toLocaleString(i18n.language === 'en' ? 'en-US' : 'es-MX', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  <Link
                    to={selectedDate ? `/events/new?date=${format(selectedDate, "yyyy-MM-dd")}` : "/events/new"}
                    className="flex items-center justify-center pt-2 text-xs text-text-tertiary hover:text-primary transition-colors active-ios-scale font-semibold"
                  >
                    + {t("calendar:new_event")}
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </div>
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
    </div>
  );
};
