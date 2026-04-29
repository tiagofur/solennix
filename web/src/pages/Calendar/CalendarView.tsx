import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DayPicker, type DayButtonProps } from "react-day-picker";
import "react-day-picker/style.css";
import { useTranslation } from "react-i18next";
import { UnavailableDatesModal } from "./components/UnavailableDatesModal";
import { Link, useNavigate } from "react-router-dom";
import { useEventsByDateRange } from "../../hooks/queries/useEventQueries";
import {
  useCreateUnavailableDates,
  useDeleteUnavailableDate,
  useUnavailableDatesByRange,
} from "../../hooks/queries/useUnavailableDatesQueries";
import { queryKeys } from "../../hooks/queries/queryKeys";
import {
  Calendar,
  CalendarDays,
  Users,
  Clock,
  MapPin,
  Phone,
  DollarSign as DollarIcon,
  Lock,
  Unlock,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "../../hooks/useToast";
import { logError } from "../../lib/errorHandler";
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameDay,
  startOfDay,
  type Locale,
} from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Event } from "../../types/entities";

type EventWithClient = Event & {
  client?: { name: string; phone: string };
};

// Parse a yyyy-MM-dd date string as LOCAL date (avoids UTC midnight shifting day in negative-offset timezones)
const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return startOfDay(new Date(y, m - 1, d));
};

/**
 * Pick the date-fns locale that matches i18next's current language.
 * Falls back to Spanish so monthly date labels don't suddenly flip to
 * English for unsupported locales. `lang` is optional because the
 * i18next instance may not have resolved a language yet in some
 * test environments where the config module isn't initialized.
 */
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

export const CalendarView: React.FC = () => {
  /// REFACTOR FASE 7C — Calendario simplificado (vista grilla + gestión disponibilidad)
  /// Vista lista eliminada → funcionalidad migrada a sección "Eventos" con filtros
  /// Toolbar centralizado ahora solo en topbar global; FAB global para crear evento/Quick Quote

  const { t, i18n } = useTranslation("calendar");
  const dfnsLocale = useMemo(() => pickDateFnsLocale(i18n.language), [i18n.language]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const normalizedToday = startOfDay(new Date());
  const { addToast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    normalizedToday,
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(
    startOfMonth(normalizedToday),
  );
  const [isManagingBlocks, setIsManagingBlocks] = useState(false);
  const [isConfirmingUnblock, setIsConfirmingUnblock] = useState(false);
  const [contextMenuDate, setContextMenuDate] = useState<string | undefined>();

  // Month boundaries as yyyy-MM-dd strings — used as both query args and
  // React Query keys, so caching is automatic per month.
  const rangeStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const rangeEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: eventsData, isLoading: eventsLoading, isFetching: eventsFetching, error: eventsError } =
    useEventsByDateRange(rangeStart, rangeEnd);
  const { data: unavailableData, isLoading: unavailableLoading, isFetching: unavailableFetching, error: unavailableError } =
    useUnavailableDatesByRange(rangeStart, rangeEnd);
  const createUnavailableDates = useCreateUnavailableDates();
  const deleteUnavailableDate = useDeleteUnavailableDate();

  const events = useMemo(
    () => ((eventsData as EventWithClient[] | undefined) ?? []),
    [eventsData],
  );
  const unavailableDates = useMemo(
    () => (unavailableData ?? []),
    [unavailableData],
  );

  const loading = eventsLoading || unavailableLoading;
  const isFetching = eventsFetching || unavailableFetching;

  // Filtered event list respects the active status chip. Filtering
  // happens client-side from the cached React Query data — no refetch,
  // matching iOS & Android behavior.
  // FASE 7C: status filter removed (moved to Events section), filteredEvents = events
  const filteredEvents = events;

  // Surface query errors via toast (once per transition).
  useEffect(() => {
    if (eventsError) logError("CalendarView:events", eventsError);
    if (unavailableError) logError("CalendarView:unavailable", unavailableError);
  }, [eventsError, unavailableError]);

  const hasError = !!eventsError || !!unavailableError;

  const handleRetry = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.events.all,
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.unavailableDates.byRange(rangeStart, rangeEnd),
    });
  }, [queryClient, rangeStart, rangeEnd]);

  // Invalidate both month windows whenever a mutation changes availability,
  // so the UI stays in sync without a manual refresh.
  const refreshUnavailableRange = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.unavailableDates.byRange(rangeStart, rangeEnd),
    });
  }, [queryClient, rangeStart, rangeEnd]);

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(startOfMonth(startOfDay(month)));
    setSelectedDate(undefined);
  };

  const goToToday = () => {
    const today = startOfDay(new Date());
    setCurrentMonth(startOfMonth(today));
    setSelectedDate(today);
  };

  // Pre-compute a Set of "YYYY-MM-DD" strings covering every blocked day
  // in the current month view. Previously we iterated each range
  // day-by-day inside `modifiers` (O(ranges × days)) and re-built an
  // array of Date objects; now we build a Set once and expose both the
  // Date[] needed by react-day-picker's `modifiers` and a fast lookup
  // via the Set itself.
  const { blockedDateList } = useMemo(() => {
    const set = new Set<string>();
    const list: Date[] = [];
    for (const d of unavailableDates) {
      const current = parseLocalDate(d.start_date);
      const end = parseLocalDate(d.end_date);
      while (current <= end) {
        const key = format(current, "yyyy-MM-dd");
        if (!set.has(key)) {
          set.add(key);
          list.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
    }
    return { blockedDateList: list };
  }, [unavailableDates]);

  const modifiers: { unavailable: Date[] } = { unavailable: blockedDateList };

  const selectedEvents = (filteredEvents || []).filter(
    (e) =>
      selectedDate && isSameDay(parseLocalDate(e.event_date), selectedDate),
  );

  const selectedUnavailable = unavailableDates.find((d) => {
    const start = parseLocalDate(d.start_date);
    const end = parseLocalDate(d.end_date);
    return selectedDate && selectedDate >= start && selectedDate <= end;
  });

  const handleUnblock = async () => {
    if (!selectedUnavailable) return;
    try {
      await deleteUnavailableDate.mutateAsync(selectedUnavailable.id);
      refreshUnavailableRange();
      addToast(t("unblock.confirm"), "success");
      setSelectedDate(undefined);
    } catch (error) {
      logError("CalendarView:handleUnblock", error);
      addToast(t("error.unblock_failed"), "error");
    } finally {
      setIsConfirmingUnblock(false);
    }
  };

  const handleContextMenu = useCallback(
    (date: Date, e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenuDate(format(date, "yyyy-MM-dd"));
      setIsManagingBlocks(true);
    },
    [],
  );

  // Group events by date into { dots: [up to 3 statuses], total count } so
  // the CustomDayButton can render both the dots and a +N overflow badge.
  const dayInfoByDate = useMemo(() => {
    const map = new Map<string, { dots: string[]; total: number }>();
    for (const event of filteredEvents) {
      const existing = map.get(event.event_date) ?? { dots: [], total: 0 };
      existing.total += 1;
      if (existing.dots.length < 3) {
        existing.dots.push(event.status);
      }
      map.set(event.event_date, existing);
    }
    return map;
  }, [filteredEvents]);

  const getDayInfo = useCallback(
    (date: Date): { dots: string[]; overflow: number } => {
      const info = dayInfoByDate.get(format(date, "yyyy-MM-dd"));
      if (!info) return { dots: [], overflow: 0 };
      /// CORREGIDO BUG OVERFLOW — Antes restaba siempre 3 (incorrecto cuando <3 eventos únicos)
      /// Fórmula corregida: totalEvents - min(unique_statuses_count, 3)
      /// Ejemplos:
      ///   • 5 eventos × "confirmed" → 1 dot azul → overflow = 4
      ///   • 2 confirmed + 3 quoted = 2 dots (azul+gris) → overflow = 0
      const uniqueStatusCount = new Set(info.dots).size;
      const renderedDotsCount = Math.min(uniqueStatusCount, 3);
      return { dots: info.dots, overflow: Math.max(0, info.total - renderedDotsCount) };
    },
    [dayInfoByDate],
  );

  const overflowLabel = useCallback(
    (count: number) => t("overflow_more", { count }),
    [t],
  );

  const CustomDayButton = useMemo(
    () => makeDayButton(handleContextMenu, getDayInfo, overflowLabel),
    [handleContextMenu, getDayInfo, overflowLabel],
  );

  const statusLabel = (status: string): string => {
    switch (status) {
      case "confirmed": return t("status.confirmed");
      case "completed": return t("status.completed");
      case "cancelled": return t("status.cancelled");
      default: return t("status.quoted");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">{t("title")}</h1>
         <div className="flex items-center gap-3 flex-wrap">
           {/* Botón gestionar bloqueos */}
           <button
             type="button"
             onClick={() => {
               setContextMenuDate(undefined);
               setIsManagingBlocks(true);
             }}
             className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text bg-surface hover:bg-surface-alt shadow-sm transition-colors"
             aria-label={t("manage_blocks")}
           >
             <Lock className="h-4 w-4 mr-2" aria-hidden="true" />
             {t("manage_blocks")}
           </button>

           {/* Botón Hoy */}
           <button
             type="button"
             onClick={goToToday}
             className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02]"
             aria-label={t("today")}
           >
             <CalendarDays className="h-4 w-4 mr-2" aria-hidden="true" />
             {t("today")}
           </button>
         </div>
       </div>

       {/* REFACTOR FASE 7C — Eliminado filtros de estado (pertenecen a sección Eventos) */}

      {/* Inline error banner with retry — React Query already retried on its
          own, so this is the user-visible recovery affordance for a sticky
          network failure. */}
      {hasError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm"
        >
          <div className="flex items-center gap-2 text-error">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t("error.load_failed")}</span>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="text-error font-semibold hover:underline shrink-0"
          >
            {t("error.retry")}
          </button>
        </div>
      )}

      <div
        className="relative flex flex-col xl:flex-row gap-8 fade-in"
        aria-busy={isFetching}
      >
        {isFetching && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-card/70 z-10 rounded-2xl"
            role="status"
            aria-label={loading ? t("title") : undefined}
          >
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          </div>
        )}

        {/* Calendar Card */}
        <div className="bg-card shadow-sm rounded-2xl p-4 sm:p-6 xl:w-fit xl:shrink-0 border border-border transition-colors">
          <style>{`
          .rdp-root {
              --rdp-cell-size: 45px;
              --rdp-accent-color: var(--color-primary);
              --rdp-accent-background-color: color-mix(in srgb, var(--color-primary), transparent 90%);
              margin: 0;
              width: 100%;
          }
          .rdp-months { justify-content: center; width: 100%; }
          .rdp-month { width: 100%; max-width: 400px; }
          .rdp-table { width: 100%; max-width: 100%; }
          .rdp-head_cell {
              text-transform: uppercase;
              font-size: 0.75rem;
              font-weight: 700;
              color: var(--color-text-secondary);
              padding-bottom: 1rem;
          }
          .rdp-nav_button { color: var(--color-primary); }
          .rdp-nav_button:hover { color: var(--color-primary-dark); }
          .rdp-caption_label {
              font-size: 1.125rem;
              font-weight: 700;
              color: var(--color-text);
              text-transform: capitalize;
          }
          /* Day button: flex column to hold number circle + status dots + overflow caption */
          .rdp-day_button {
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: flex-start !important;
              height: 56px !important;
              width: var(--rdp-cell-size) !important;
              padding: 5px 0 0 !important;
              background: transparent !important;
              border: none !important;
              border-radius: 0 !important;
              gap: 2px;
              cursor: pointer;
          }
          .rdp-day_button:disabled { cursor: default; opacity: 0.4; }
          .rdp-day_button:focus-visible {
              outline: none !important;
              box-shadow: 0 0 0 2px var(--rdp-background-color), 0 0 0 4px var(--rdp-accent-color) !important;
              border-radius: 4px !important;
          }
          /* Inner number circle — receives selection/today ring */
          .rdp-day-number {
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              font-size: 0.875rem;
              font-weight: 500;
              color: var(--color-text);
              flex-shrink: 0;
              transition: background-color 0.15s;
          }
          .rdp-selected .rdp-day-number {
              background-color: var(--color-primary) !important;
              color: #ffffff !important;
              font-weight: bold;
          }
          .rdp-today:not(.rdp-selected) .rdp-day-number {
              border: 2px solid var(--color-primary);
              color: var(--color-primary);
              font-weight: bold;
          }
          .rdp-day_button:hover:not([disabled]) .rdp-day-number {
              background-color: var(--rdp-accent-background-color);
              color: var(--color-primary);
          }
          .rdp-selected .rdp-day_button:hover:not([disabled]) .rdp-day-number {
              filter: brightness(0.9);
          }
          /* Outside-month days */
          .rdp-day_outside .rdp-day-number {
              color: var(--color-text-tertiary) !important;
              opacity: 0.4;
          }
          /* Blocked dates */
          .rdp-unavailable .rdp-day-number {
              background-color: var(--color-surface-alt) !important;
              color: var(--color-text-tertiary) !important;
              text-decoration: line-through;
          }
          /* Status dots row */
          .rdp-day-dots {
              display: flex;
              gap: 2px;
              align-items: center;
              justify-content: center;
              height: 6px;
              min-height: 6px;
          }
          .rdp-day-dot {
              width: 5px;
              height: 5px;
              border-radius: 50%;
              flex-shrink: 0;
          }
          /* "+N más" overflow badge — subtle caption under the dots for
             days with more events than the 3 rendered status colors. */
          .rdp-day-overflow {
              font-size: 9px;
              line-height: 1;
              color: var(--color-text-secondary);
              font-weight: 500;
          }
          `}</style>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={handleMonthChange}
            modifiers={modifiers}
            modifiersClassNames={{
              unavailable: "rdp-unavailable",
            }}
            className="flex justify-center"
            components={{ DayButton: CustomDayButton }}
            locale={dfnsLocale}
            labels={{
              labelPrevious: () => t("previous_month"),
              labelNext: () => t("next_month"),
            }}
          />
        </div>

        {/* Events for selected day */}
        <div className="bg-card shadow-sm rounded-2xl p-6 xl:flex-1 xl:min-w-0 border border-border flex flex-col transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text">
              {selectedDate
                ? format(selectedDate, "EEEE d MMMM", { locale: dfnsLocale }).replace(/^\w/, (c) => c.toUpperCase())
                : t("select_date")}
            </h2>
            {selectedEvents.length > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                {selectedEvents.length}
              </span>
            )}
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
            {selectedUnavailable ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-center"
                role="status"
              >
                <div
                  className="h-16 w-16 bg-error/10 rounded-full flex items-center justify-center mb-4"
                  aria-hidden="true"
                >
                  <Lock className="h-8 w-8 text-error" aria-hidden="true" />
                </div>
                <p className="text-text font-semibold text-sm mb-1">
                  {t("blocked_dates.title")}
                </p>
                <p className="text-text-secondary text-xs">
                  {selectedUnavailable.start_date ===
                  selectedUnavailable.end_date
                    ? format(
                        parseLocalDate(selectedUnavailable.start_date),
                        "d MMMM yyyy",
                        { locale: dfnsLocale },
                      )
                    : `${format(parseLocalDate(selectedUnavailable.start_date), "d MMM", { locale: dfnsLocale })} — ${format(parseLocalDate(selectedUnavailable.end_date), "d MMM yyyy", { locale: dfnsLocale })}`}
                </p>
                {selectedUnavailable.reason && (
                  <p className="text-text-tertiary text-xs italic mt-2">
                    {selectedUnavailable.reason}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setIsConfirmingUnblock(true)}
                  className="mt-4 text-error text-sm font-semibold hover:underline"
                >
                  {t("unblock.confirm")}
                </button>
              </div>
            ) : selectedEvents.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-center"
                role="status"
              >
                <div
                  className="h-16 w-16 bg-surface-alt rounded-full flex items-center justify-center mb-4"
                  aria-hidden="true"
                >
                  <Calendar
                    className="h-8 w-8 text-text-tertiary"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-text-secondary text-sm font-medium">
                  {t("no_events_for_day")}
                </p>
                {selectedDate && (
                  <Link
                    to={`/events/new?date=${format(selectedDate, "yyyy-MM-dd")}`}
                    className="mt-4 inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
                  >
                    {t("create_event_for_date")}
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                {selectedEvents.map((event) => (
                  <div
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    className="group border border-border rounded-2xl p-4 hover:border-primary bg-surface hover:bg-surface-alt cursor-pointer transition-all shadow-sm flex flex-col h-full"
                    onClick={() => navigate(`/events/${event.id}/summary`)}
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

                    <div className="space-y-2.5 mt-auto">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center text-xs text-text-secondary">
                          <Clock
                            className="h-3.5 w-3.5 mr-1.5 text-primary opacity-70"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {event.start_time || "—"}
                            {event.start_time && event.end_time ? " - " : ""}
                            {event.end_time || ""}
                          </span>
                        </div>
                        <div className="flex items-center text-xs text-text-secondary">
                          <Users
                            className="h-3.5 w-3.5 mr-1.5 text-primary opacity-70"
                            aria-hidden="true"
                          />
                          <span>{event.num_people} pax</span>
                        </div>
                      </div>

                      {event.location && (
                        <div className="flex items-start text-xs text-text-secondary">
                          <MapPin
                            className="h-3.5 w-3.5 mr-1.5 mt-0.5 text-primary opacity-70 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center text-xs text-text-secondary">
                          <Phone
                            className="h-3 w-3 mr-1"
                            aria-hidden="true"
                          />
                          <span>{event.client?.phone || "—"}</span>
                        </div>
                        <div className="flex items-center text-xs font-bold text-text">
                          <DollarIcon
                            className="h-3 w-3 mr-0.5 text-success"
                            aria-hidden="true"
                          />
                          {/* MXN amounts always use es-MX thousand separators
                              (comma) regardless of app language — the business
                              is Mexico-based and users recognize that format
                              on their bank statements. 
                              Update: Unifying with dashboard logic for consistency. */}
                          {event.total_amount?.toLocaleString(i18n.language === 'en' ? 'en-US' : 'es-MX', {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {selectedDate && (
                  <Link
                    to={`/events/new?date=${format(selectedDate, "yyyy-MM-dd")}`}
                    className="flex items-center justify-center pt-2 text-xs text-text-tertiary hover:text-primary transition-colors"
                  >
                    + {t("new_event")}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manage Blocks Modal */}
      <UnavailableDatesModal
        isOpen={isManagingBlocks}
        onClose={() => {
          setIsManagingBlocks(false);
          setContextMenuDate(undefined);
        }}
        onSave={() => {
          refreshUnavailableRange();
        }}
        onDelete={() => {
          refreshUnavailableRange();
        }}
        createUnavailableDates={createUnavailableDates.mutateAsync}
        deleteUnavailableDate={deleteUnavailableDate.mutateAsync}
        initialDate={contextMenuDate}
      />

      {/* Unblock Confirmation Modal */}
      {isConfirmingUnblock && selectedUnavailable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fallback-bg">
          <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl border border-border overflow-hidden fade-in">
            <div className="p-6 text-center">
              <div className="mx-auto h-14 w-14 bg-error/10 rounded-full flex items-center justify-center mb-4">
                <Unlock className="h-7 w-7 text-error" />
              </div>
              <h3 className="text-lg font-bold text-text mb-2">
                {t("unblock.title")}
              </h3>
              <p className="text-sm text-text-secondary mb-1">
                {selectedUnavailable.start_date === selectedUnavailable.end_date
                  ? format(
                      parseLocalDate(selectedUnavailable.start_date),
                      "d MMMM yyyy",
                      { locale: dfnsLocale },
                    )
                  : `${format(parseLocalDate(selectedUnavailable.start_date), "d MMM", { locale: dfnsLocale })} — ${format(parseLocalDate(selectedUnavailable.end_date), "d MMM yyyy", { locale: dfnsLocale })}`}
              </p>
              {selectedUnavailable.reason && (
                <p className="text-xs text-text-tertiary italic mb-4">
                  {t("unblock.reason_prefix", { reason: selectedUnavailable.reason })}
                </p>
              )}
              {!selectedUnavailable.reason && <div className="mb-4" />}
            </div>
            <div className="flex gap-3 p-4 border-t border-border bg-surface-alt/50">
              <button
                type="button"
                onClick={() => setIsConfirmingUnblock(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text bg-surface-alt hover:bg-surface border border-border rounded-xl transition-colors"
              >
                {t("action.cancel")}
              </button>
              <button
                type="button"
                onClick={handleUnblock}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-error hover:bg-error/90 rounded-xl transition-colors shadow-sm"
              >
                {t("unblock.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
