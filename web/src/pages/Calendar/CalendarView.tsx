import React, { useEffect, useState, useCallback, useMemo } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { eventService } from "../../services/eventService";
import {
  unavailableDatesService,
  UnavailableDate,
} from "../../services/unavailableDatesService";
import { UnavailableDatesModal } from "./components/UnavailableDatesModal";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  Clock,
  MapPin,
  Phone,
  DollarSign as DollarIcon,
  Lock,
  Unlock,
} from "lucide-react";
import { useToast } from "../../hooks/useToast";
import { logError } from "../../lib/errorHandler";
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameDay,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { Event } from "../../types/entities";

type EventWithClient = Event & {
  client?: { name: string; phone: string };
};

// Parse a yyyy-MM-dd date string as LOCAL date (avoids UTC midnight shifting day in negative-offset timezones)
const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return startOfDay(new Date(y, m - 1, d));
};

function makeDayButton(
  onCtxMenu: (date: Date, e: React.MouseEvent) => void,
) {
  return function CustomDayButton({ day, ...props }: any) {
    return (
      <button
        {...props}
        onContextMenu={(e: React.MouseEvent<HTMLButtonElement>) => {
          e.preventDefault();
          onCtxMenu(day.date, e);
        }}
      />
    );
  };
}

export const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const normalizedToday = startOfDay(new Date());
  const { addToast } = useToast();
  const [events, setEvents] = useState<EventWithClient[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    normalizedToday,
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(
    startOfMonth(normalizedToday),
  );
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>(
    [],
  );
  const [isManagingBlocks, setIsManagingBlocks] = useState(false);
  const [isConfirmingUnblock, setIsConfirmingUnblock] = useState(false);
  const [contextMenuDate, setContextMenuDate] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  const fetchEvents = useCallback(async (date: Date) => {
    try {
      setLoading(true);
      setIsFetching(true);
      const start = startOfMonth(date);
      const endMonth = endOfMonth(date);

      const [eventsData, unavailableData] = await Promise.all([
        eventService.getByDateRange(
          format(start, "yyyy-MM-dd"),
          format(endMonth, "yyyy-MM-dd"),
        ),
        unavailableDatesService.getDates(
          format(start, "yyyy-MM-dd"),
          format(endMonth, "yyyy-MM-dd"),
        ),
      ]);

      setEvents((eventsData as EventWithClient[]) || []);
      setUnavailableDates(unavailableData || []);
    } catch (error) {
      logError("CalendarView:fetchEvents", error);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      if (!isMounted) return;
      await fetchEvents(currentMonth);
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [currentMonth, fetchEvents]);

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(startOfMonth(startOfDay(month)));
    setSelectedDate(undefined);
  };

  const goToToday = () => {
    const today = startOfDay(new Date());
    setCurrentMonth(startOfMonth(today));
    setSelectedDate(today);
  };

  const modifiers: { booked: Date[]; unavailable: Date[] } = {
    booked: (events || []).map((e: any) => parseLocalDate(e.event_date)),
    unavailable: (unavailableDates || []).flatMap((d: any) => {
      const dates: Date[] = [];
      const currentDate = parseLocalDate(d.start_date);
      const end = parseLocalDate(d.end_date);
      while (currentDate <= end) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return dates;
    }),
  };

  const selectedEvents = (events || []).filter(
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
      await unavailableDatesService.removeDate(selectedUnavailable.id);
      setUnavailableDates((prev) =>
        prev.filter((d) => d.id !== selectedUnavailable.id),
      );
      addToast("Fechas desbloqueadas exitosamente", "success");
      setSelectedDate(undefined);
    } catch (error) {
      console.error(error);
      addToast("Error al desbloquear las fechas", "error");
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

  const CustomDayButton = useMemo(
    () => makeDayButton(handleContextMenu),
    [handleContextMenu],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-text">Calendario</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setContextMenuDate(undefined);
              setIsManagingBlocks(true);
            }}
            className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text bg-surface hover:bg-surface-alt shadow-sm transition-colors"
            aria-label="Gestionar bloqueos de fechas"
          >
            <Lock className="h-4 w-4 mr-2" aria-hidden="true" />
            Gestionar Bloqueos
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
          >
            Hoy
          </button>
        </div>
      </div>

      <div
        className="relative flex flex-col xl:flex-row gap-8 fade-in"
        aria-busy={isFetching}
      >
        {isFetching && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-card/70 z-10 rounded-3xl"
            role="status"
            aria-label="Cargando eventos..."
          >
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
          </div>
        )}

        {/* Calendar Card */}
        <div className="bg-card shadow-sm rounded-3xl p-4 sm:p-6 xl:w-fit xl:shrink-0 border border-border transition-colors">
          <style>{`
          .rdp-root {
              --rdp-cell-size: 45px;
              --rdp-accent-color: var(--color-primary);
              --rdp-accent-background-color: color-mix(in srgb, var(--color-primary), transparent 90%);
              margin: 0;
              width: 100%;
          }
          .rdp-months {
              justify-content: center;
              width: 100%;
          }
          .rdp-month {
              width: 100%;
              max-width: 400px;
          }
          .rdp-table {
              width: 100%;
              max-width: 100%;
          }
          .rdp-selected .rdp-day_button:not([disabled]) {
              background-color: var(--rdp-accent-color) !important;
              font-weight: bold;
              color: white !important;
              border: 2px solid var(--rdp-accent-color) !important;
              border-radius: 50% !important;
          }
          .rdp-selected .rdp-day_button:hover:not([disabled]) {
              background-color: var(--color-primary-dark) !important;
              border-color: var(--color-primary-dark) !important;
          }
          .rdp-today:not(.rdp-selected) .rdp-day_button {
              font-weight: bold;
              color: var(--rdp-accent-color) !important;
              background-color: transparent !important;
              border: 2px solid var(--rdp-accent-color) !important;
              border-radius: 50% !important;
          }
          .rdp-day_button:hover:not([disabled]):not(.rdp-selected .rdp-day_button) {
              background-color: var(--rdp-background-color) !important;
              color: var(--rdp-accent-color) !important;
          }
          .rdp-day_button:focus-visible:not([disabled]) {
              outline: none !important;
              box-shadow: 0 0 0 2px var(--rdp-background-color), 0 0 0 4px var(--rdp-accent-color) !important;
          }
          .rdp-head_cell {
              text-transform: uppercase;
              font-size: 0.75rem;
              font-weight: 700;
              color: var(--color-text-secondary);
              padding-bottom: 1rem;
          }
          .rdp-nav_button {
              color: var(--color-primary);
          }
          .rdp-nav_button:hover {
              color: var(--color-primary-dark);
          }
          .rdp-caption_label {
              font-size: 1.125rem;
              font-weight: 700;
              color: var(--color-text);
              text-transform: capitalize;
          }
          .rdp-day {
              font-weight: 500;
              color: var(--color-text);
          }
          .rdp-day_outside {
              color: var(--color-text-tertiary) !important;
              opacity: 0.5;
          }
          /* Booked days (have events): orange circle with always-visible white text */
          .rdp-booked .rdp-day_button {
              background-color: var(--color-primary) !important;
              color: #ffffff !important;
              border-radius: 50% !important;
              font-weight: bold;
          }
          /* Selected booked day: add white ring so it's distinguishable from unselected booked */
          .rdp-selected.rdp-booked .rdp-day_button:not([disabled]) {
              background-color: var(--color-primary) !important;
              color: #ffffff !important;
              border: 2px solid #ffffff !important;
              box-shadow: 0 0 0 2px var(--color-primary) !important;
          }
          /* Unavailable days */
          .rdp-unavailable .rdp-day_button {
              background-color: var(--color-surface-alt) !important;
              color: var(--color-text-tertiary) !important;
              text-decoration: line-through;
          }
          .dark .rdp-unavailable .rdp-day_button {
               background-color: var(--color-surface-alt) !important;
               color: var(--color-text-tertiary) !important;
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
              booked: "rdp-booked",
              unavailable: "rdp-unavailable",
            }}
            className="flex justify-center"
            components={{ DayButton: CustomDayButton }}
          />
        </div>

        {/* Events for selected day */}
        <div className="bg-card shadow-sm rounded-3xl p-6 xl:flex-1 xl:min-w-0 border border-border flex flex-col transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-text">
              Eventos del{" "}
              {selectedDate
                ? format(selectedDate, "d 'de' MMMM", { locale: es })
                : "día"}
            </h2>
            {selectedEvents.length > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">
                {selectedEvents.length}{" "}
                {selectedEvents.length === 1 ? "Evento" : "Eventos"}
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
                  Fecha Bloqueada
                </p>
                <p className="text-text-secondary text-xs">
                  {selectedUnavailable.start_date ===
                  selectedUnavailable.end_date
                    ? format(
                        parseLocalDate(selectedUnavailable.start_date),
                        "d 'de' MMMM yyyy",
                        { locale: es },
                      )
                    : `${format(parseLocalDate(selectedUnavailable.start_date), "d MMM", { locale: es })} — ${format(parseLocalDate(selectedUnavailable.end_date), "d MMM yyyy", { locale: es })}`}
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
                  Desbloquear
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
                  No hay eventos para este día.
                </p>
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
                    aria-label={`Ver detalles del evento de ${event.client?.name} - ${event.service_type}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1 mr-2">
                        <h3 className="text-sm font-bold text-text group-hover:text-primary transition-colors truncate">
                          {event.client?.name}
                        </h3>
                        <p className="text-[10px] text-text-secondary font-medium uppercase tracking-tight">
                          {event.service_type}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          event.status === "confirmed"
                            ? "bg-status-confirmed/10 text-status-confirmed"
                            : event.status === "completed"
                              ? "bg-status-completed/10 text-status-completed"
                              : event.status === "cancelled"
                                ? "bg-status-cancelled/10 text-status-cancelled"
                                : "bg-status-quoted/10 text-status-quoted"
                        }`}
                      >
                        {event.status === "confirmed"
                          ? "Confirmado"
                          : event.status === "completed"
                            ? "Completado"
                            : event.status === "cancelled"
                              ? "Cancelado"
                              : "Cotizado"}
                      </span>
                    </div>

                    <div className="space-y-2.5 mt-auto">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center text-[11px] text-text-secondary">
                          <Clock
                            className="h-3.5 w-3.5 mr-1.5 text-primary opacity-70"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {event.start_time || "S/H"}
                            {event.start_time && event.end_time ? " - " : ""}
                            {event.end_time || ""}
                          </span>
                        </div>
                        <div className="flex items-center text-[11px] text-text-secondary">
                          <Users
                            className="h-3.5 w-3.5 mr-1.5 text-primary opacity-70"
                            aria-hidden="true"
                          />
                          <span>{event.num_people} pax</span>
                        </div>
                      </div>

                      {event.location && (
                        <div className="flex items-start text-[11px] text-text-secondary">
                          <MapPin
                            className="h-3.5 w-3.5 mr-1.5 mt-0.5 text-primary opacity-70 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="line-clamp-1">{event.location}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center text-[11px] text-text-secondary">
                          <Phone
                            className="h-3 w-3 mr-1"
                            aria-hidden="true"
                          />
                          <span>{event.client?.phone || "Sin tel."}</span>
                        </div>
                        <div className="flex items-center text-xs font-bold text-text">
                          <DollarIcon
                            className="h-3 w-3 mr-0.5 text-success"
                            aria-hidden="true"
                          />
                          {event.total_amount?.toLocaleString("es-MX", {
                            minimumFractionDigits: 0,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
        onSave={(newDate) => {
          setUnavailableDates((prev) => [...prev, newDate]);
        }}
        onDelete={(id) => {
          setUnavailableDates((prev) => prev.filter((d) => d.id !== id));
        }}
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
                Desbloquear Fechas
              </h3>
              <p className="text-sm text-text-secondary mb-1">
                {selectedUnavailable.start_date === selectedUnavailable.end_date
                  ? format(
                      parseLocalDate(selectedUnavailable.start_date),
                      "d 'de' MMMM yyyy",
                      { locale: es },
                    )
                  : `${format(parseLocalDate(selectedUnavailable.start_date), "d MMM", { locale: es })} — ${format(parseLocalDate(selectedUnavailable.end_date), "d MMM yyyy", { locale: es })}`}
              </p>
              {selectedUnavailable.reason && (
                <p className="text-xs text-text-tertiary italic mb-4">
                  {selectedUnavailable.reason}
                </p>
              )}
              {!selectedUnavailable.reason && <div className="mb-4" />}
              <p className="text-sm text-text-secondary">
                Estas fechas volverán a estar disponibles para eventos.
              </p>
            </div>
            <div className="flex gap-3 p-4 border-t border-border bg-surface-alt/50">
              <button
                type="button"
                onClick={() => setIsConfirmingUnblock(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text bg-surface-alt hover:bg-surface border border-border rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleUnblock}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-error hover:bg-error/90 rounded-xl transition-colors shadow-sm"
              >
                Desbloquear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
