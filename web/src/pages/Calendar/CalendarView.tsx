import React, { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { eventService } from "../../services/eventService";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Calendar,
  Users,
  Clock,
  MapPin,
  Phone,
  DollarSign as DollarIcon,
  List as ListIcon,
  CalendarDays,
  Search,
  Filter,
  Download,
} from "lucide-react";
import { exportToCsv } from "../../lib/exportCsv";
import {
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  parseISO,
  isSameDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { logError } from "../../lib/errorHandler";
import { usePagination } from "../../hooks/usePagination";
import { Pagination } from "../../components/Pagination";
import Empty from "../../components/Empty";
import clsx from "clsx";
import { Event } from "../../types/entities";

type EventWithClient = Event & {
  client?: { name: string; phone: string };
};

export const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithClient[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");

  // List view state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (viewMode === "calendar") {
      fetchEvents(currentMonth);
    } else {
      fetchAllEvents();
    }
  }, [currentMonth, viewMode]);

  const fetchAllEvents = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const start = format(startOfMonth(subMonths(now, 6)), "yyyy-MM-dd");
      const end = format(endOfMonth(addMonths(now, 6)), "yyyy-MM-dd");
      const data = await eventService.getByDateRange(start, end);
      setEvents(data || []);
    } catch (error) {
      logError("Error fetching events for list", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (date: Date) => {
    try {
      setLoading(true);
      const start = format(startOfMonth(date), "yyyy-MM-dd");
      const end = format(endOfMonth(date), "yyyy-MM-dd");
      const data = await eventService.getByDateRange(start, end);
      setEvents(data || []);
    } catch (error) {
      logError("Error fetching events", error);
    } finally {
      setLoading(false);
    }
  };

  const modifiers = {
    booked: (events || []).map((e) => parseISO(e.event_date)),
  };

  const modifiersStyles = {
    booked: {
      fontWeight: "bold",
      backgroundColor: "#FF6B35", // Brand Orange
      color: "white",
      borderRadius: "50%",
    },
  };

  const selectedEvents = (events || []).filter(
    (e) => selectedDate && isSameDay(parseISO(e.event_date), selectedDate),
  );

  // Pagination for list view
  const filteredListEvents = (events || []).filter((event) => {
    const matchesSearch =
      event.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.service_type?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || event.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const {
    currentData: paginatedEvents,
    currentPage,
    totalPages,
    totalItems,
    handlePageChange,
  } = usePagination({
    data: filteredListEvents,
    itemsPerPage: 8,
    initialSortKey: "event_date",
    initialSortOrder: "desc", // Most recent first in list view
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">
            Eventos
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Gestiona tu agenda y el histórico de reservas.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {events.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const statusLabel = (s: string) =>
                  s === 'confirmed' ? 'Confirmado' : s === 'completed' ? 'Completado' : s === 'cancelled' ? 'Cancelado' : 'Cotizado';
                exportToCsv(
                  'eventos',
                  ['Fecha', 'Tipo de Servicio', 'Cliente', 'Personas', 'Status', 'Total', 'Ubicación'],
                  events.map(e => [
                    e.event_date,
                    e.service_type,
                    (e as any).client?.name || (e as any).clients?.name || '',
                    e.num_people,
                    statusLabel(e.status),
                    e.total_amount?.toFixed(2),
                    e.location,
                  ]),
                );
              }}
              className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
              aria-label="Exportar eventos a CSV"
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              CSV
            </button>
          )}
          <div
            className="flex bg-surface-alt p-1 rounded-xl border border-border"
            role="group"
            aria-label="Modo de visualización de eventos"
          >
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              aria-pressed={viewMode === "calendar"}
              aria-label="Ver eventos en calendario"
              className={clsx(
                "flex items-center px-3 py-1.5 text-sm font-medium rounded-xl transition-all",
                viewMode === "calendar"
                  ? "bg-card text-text shadow-sm"
                  : "text-text-secondary hover:text-text",
              )}
            >
              <CalendarDays className="h-4 w-4 mr-2" aria-hidden="true" />
              Calendario
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              aria-label="Ver eventos en lista"
              className={clsx(
                "flex items-center px-3 py-1.5 text-sm font-medium rounded-xl transition-all",
                viewMode === "list"
                  ? "bg-card text-text shadow-sm"
                  : "text-text-secondary hover:text-text",
              )}
            >
              <ListIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              Lista
            </button>
          </div>
          <Link
            to={`/events/new${viewMode === "calendar" && selectedDate ? `?date=${format(selectedDate, "yyyy-MM-dd")}` : ""}`}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-brand-orange hover:bg-orange-600 shadow-xs transition-colors"
            aria-label="Crear nuevo evento"
          >
            <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
            Nuevo Evento
          </Link>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 fade-in">
          {/* Calendar Card */}
          <div className="bg-card shadow-sm rounded-3xl p-4 sm:p-8 xl:col-span-3 border border-border transition-colors">
            <style>{`
            .rdp-root {
                --rdp-cell-size: 45px;
                --rdp-accent-color: #FF6B35;
                --rdp-accent-background-color: rgba(255, 107, 53, 0.1);
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
                background-color: #e55a2b !important; 
                border-color: #e55a2b !important;
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
                color: #6B7280;
                padding-bottom: 1rem;
            }
            .rdp-nav_button {
                color: #FF6B35;
            }
            .rdp-nav_button:hover {
                color: #e55a2b;
            }
            .rdp-caption_label {
                font-size: 1.125rem;
                font-weight: 700;
                color: #111827;
                text-transform: capitalize;
            }
            .rdp-day {
                font-weight: 500;
                color: #374151;
            }
            .rdp-day_outside {
                color: #9CA3AF !important;
                opacity: 0.5;
            }
            `}</style>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={es}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="flex justify-center"
            />
          </div>

          {/* Events List Card */}
          <div className="bg-card shadow-sm rounded-3xl p-6 xl:col-span-2 border border-border flex flex-col transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-text">
                Eventos del{" "}
                {selectedDate
                  ? format(selectedDate, "d 'de' MMMM", { locale: es })
                  : "día"}
              </h2>
              {selectedEvents.length > 0 && (
                <span className="bg-brand-orange/10 text-brand-orange text-xs font-bold px-2 py-1 rounded-full">
                  {selectedEvents.length}{" "}
                  {selectedEvents.length === 1 ? "Evento" : "Eventos"}
                </span>
              )}
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
              {selectedEvents.length === 0 ? (
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
                  <Link
                    to={`/events/new?date=${selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}`}
                    className="mt-4 text-brand-orange text-sm font-semibold hover:underline"
                    aria-label="Crear nuevo evento para este día"
                  >
                    Crear uno nuevo
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                  {selectedEvents.map((event) => (
                    <div
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      className="group border border-border rounded-2xl p-4 hover:border-brand-orange bg-surface hover:bg-surface-alt cursor-pointer transition-all shadow-sm flex flex-col h-full"
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
                          <h3 className="text-sm font-bold text-text group-hover:text-brand-orange transition-colors truncate">
                            {event.client?.name}
                          </h3>
                          <p className="text-[10px] text-text-secondary font-medium uppercase tracking-tight">
                            {event.service_type}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                            event.status === "confirmed"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : event.status === "completed"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : event.status === "cancelled"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
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
                              className="h-3.5 w-3.5 mr-1.5 text-brand-orange opacity-70"
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
                              className="h-3.5 w-3.5 mr-1.5 text-brand-orange opacity-70"
                              aria-hidden="true"
                            />
                            <span>{event.num_people} pax</span>
                          </div>
                        </div>

                        {event.location && (
                          <div className="flex items-start text-[11px] text-text-secondary">
                            <MapPin
                              className="h-3.5 w-3.5 mr-1.5 mt-0.5 text-brand-orange opacity-70 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="line-clamp-1">
                              {event.location}
                            </span>
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
                              className="h-3 w-3 mr-0.5 text-green-600"
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
      ) : (
        <div className="space-y-6 fade-in">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <label htmlFor="event-search" className="sr-only">
                Buscar eventos por cliente o servicio
              </label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                id="event-search"
                type="search"
                className="block w-full pl-10 pr-3 py-2 border border-border rounded-md leading-5 bg-card text-text placeholder-text-tertiary focus:outline-hidden focus:ring-brand-orange sm:text-sm"
                placeholder="Buscar por cliente o servicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Buscar eventos por cliente o servicio"
              />
            </div>
            <div className="relative">
              <label htmlFor="status-filter" className="sr-only">
                Filtrar eventos por estado
              </label>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <select
                id="status-filter"
                className="block w-full pl-10 pr-10 py-2 text-base border-border focus:outline-hidden focus:ring-brand-orange focus:border-brand-orange sm:text-sm rounded-md bg-card text-text"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filtrar eventos por estado"
              >
                <option value="all">Todos los estados</option>
                <option value="draft">Borrador / Cotizado</option>
                <option value="confirmed">Confirmado</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="bg-card shadow-sm overflow-hidden rounded-3xl border border-border">
            {loading ? (
              <div
                className="p-12 text-center text-gray-500 flex flex-col items-center"
                role="status"
                aria-live="polite"
              >
                <div
                  className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange mb-4"
                  aria-hidden="true"
                ></div>
                <span className="sr-only">Cargando eventos...</span>
                Cargando eventos...
              </div>
            ) : filteredListEvents.length === 0 ? (
              <Empty
                icon={CalendarDays}
                title="No se encontraron eventos"
                description={
                  searchTerm || statusFilter !== "all"
                    ? "Intenta ajustando los filtros."
                    : "Agrega tu primer evento."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table
                  className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
                  aria-label="Tabla de eventos"
                >
                  <caption className="sr-only">
                    Lista de eventos con {totalItems} resultados. Mostrando
                    página {currentPage} de {totalPages}.
                  </caption>
                  <thead className="bg-surface-alt">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Fecha
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Cliente / Tipo
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Horario / Lugar
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
                      >
                        Estado
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                      >
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {paginatedEvents.map((event) => (
                      <tr
                        key={event.id}
                        className="hover:bg-surface-alt cursor-pointer transition-colors"
                        onClick={() => navigate(`/events/${event.id}/summary`)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/events/${event.id}/summary`);
                          }
                        }}
                        aria-label={`Ver detalles del evento de ${event.client?.name} el ${format(parseISO(event.event_date), "d MMM yyyy", { locale: es })}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-text">
                            {format(parseISO(event.event_date), "d MMM yyyy", {
                              locale: es,
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-bold text-text">
                            {event.client?.name}
                          </div>
                          <div className="text-sm text-text-secondary capitalize">
                            {event.service_type} • {event.num_people} pax
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-text flex items-center">
                            <Clock
                              className="h-3 w-3 mr-1 text-text-secondary"
                              aria-hidden="true"
                            />
                            {event.start_time || "--"} a{" "}
                            {event.end_time || "--"}
                          </div>
                          <div className="text-sm text-text-secondary truncate max-w-[200px] flex items-center mt-1">
                            <MapPin
                              className="h-3 w-3 mr-1 text-text-secondary shrink-0"
                              aria-hidden="true"
                            />
                            {event.location || "Sin locación"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                              event.status === "confirmed"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : event.status === "completed"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : event.status === "cancelled"
                                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                          $
                          {event.total_amount?.toLocaleString("es-MX", {
                            minimumFractionDigits: 0,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && filteredListEvents.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={8}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
