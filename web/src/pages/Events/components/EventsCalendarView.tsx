import React, { useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { DayPicker, type DayButtonProps } from "@daypicker/react";
import "@daypicker/react/style.css";
import { format, type Locale } from "date-fns";

import { Card } from "../../../components/Card";
import { dayPickerStyles } from "../../../components/dayPickerStyles";
import { parseLocalDate } from "../../../lib/dateUtils";
import { buildBlockedDateList } from "../../../lib/blockedDates";
import { Lock, AlertTriangle, Calendar, Clock, Users, MapPin, Phone, DollarSign as DollarIcon } from "lucide-react";

import type { EventWithClient } from "./EventsTable";

/**
 * Calendar view branch of the Events page.
 *
 * Lifted from `EventList.tsx`. Mostly presentational: the parent owns the
 * range query hooks (`eventsRange`, `unavailableDates`, `rangeStart`/`rangeEnd`)
 * and the modal/error-handling state, and passes them in. The day-info map and
 * the `makeDayButton` custom renderer are computed HERE from `eventsRange` +
 * `statusFilter`, since they are pure derivations needed only by the calendar.
 */

/** Unavailable-date row shape (mirrors `UnavailableDate` schema). */
export type UnavailableDateRow = {
  id: string;
  start_date: string;
  end_date: string;
  reason?: string | null;
};

export interface EventsCalendarViewProps {
  loading: boolean;
  hasRangeError: boolean;
  /** Visible-range events (already filtered for status by the parent). */
  eventsRange: EventWithClient[];
  unavailableDates: UnavailableDateRow[];
  selectedEvents: EventWithClient[];
  selectedUnavailable?: UnavailableDateRow;
  /** Calendar month navigation + selection state (owned by the parent). */
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  /** date-fns locale for the current i18n language. */
  dfnsLocale: Locale;
  /** Open the unblock confirmation dialog. */
  onConfirmUnblock: () => void;
  /** Right-click a calendar day to open block management at that date. */
  onContextMenu: (date: Date, e: React.MouseEvent) => void;
  onRetry: () => void;
  /** Click a calendar event card to open its summary. */
  onEventClick: (eventId: string) => void;
}

/**
 * Build the custom DayButton renderer that shows status dots + an overflow
 * badge, and forwards right-clicks to block management. Moved verbatim from
 * `EventList.tsx`.
 */
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

export const EventsCalendarView: React.FC<EventsCalendarViewProps> = ({
  loading,
  hasRangeError,
  eventsRange,
  unavailableDates,
  selectedEvents,
  selectedUnavailable,
  currentMonth,
  setCurrentMonth,
  selectedDate,
  setSelectedDate,
  dfnsLocale,
  onConfirmUnblock,
  onContextMenu,
  onRetry,
  onEventClick,
}) => {
  const { t, i18n } = useTranslation(["events", "calendar"]);

  // Blocked dates for the calendar modifiers (pure derivation from props).
  const { blockedDateList } = useMemo(
    () => ({ blockedDateList: buildBlockedDateList(unavailableDates) }),
    [unavailableDates],
  );
  const modifiers: { unavailable: Date[] } = { unavailable: blockedDateList };

  // Per-day status dots + overflow (pure derivation from eventsRange).
  const dayInfoByDate = useMemo(() => {
    const map = new Map<string, { dots: string[]; total: number }>();
    for (const event of eventsRange) {
      const existing = map.get(event.event_date) ?? { dots: [], total: 0 };
      existing.total += 1;
      if (existing.dots.length < 3) {
        existing.dots.push(event.status);
      }
      map.set(event.event_date, existing);
    }
    return map;
  }, [eventsRange]);

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
    () => makeDayButton(onContextMenu, getDayInfo, overflowLabel),
    [onContextMenu, getDayInfo, overflowLabel],
  );

  const statusLabel = (status: string): string => {
    switch (status) {
      case "confirmed": return t("events:list.status.confirmed");
      case "completed": return t("events:list.status.completed");
      case "cancelled": return t("events:list.status.cancelled");
      default: return t("events:list.status.quoted");
    }
  };

  return (
    <div className="relative flex flex-col xl:flex-row gap-8 fade-in" aria-busy={loading}>
      {hasRangeError && (
        <div role="alert" className="flex-1 flex items-center justify-between gap-3 px-4 py-3 bg-error/10 border border-error/30 rounded-xl text-sm">
          <div className="flex items-center gap-2 text-error">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t("calendar:error.load_failed")}</span>
          </div>
          <button type="button" onClick={onRetry} className="text-error font-semibold hover:underline shrink-0">
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
                onClick={onConfirmUnblock}
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
                  onClick={() => onEventClick(event.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onEventClick(event.id);
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
  );
};

export default EventsCalendarView;
