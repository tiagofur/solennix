import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { eventService } from "../../services/eventService";
import { Event } from "../../types/entities";
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
} from "lucide-react";
import { RowActionMenu } from "../../components/RowActionMenu";
import { exportToCsv } from "../../lib/exportCsv";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { logError } from "../../lib/errorHandler";
import Empty from "../../components/Empty";
import { useToast } from "../../hooks/useToast";
import { usePagination } from "../../hooks/usePagination";
import { Pagination } from "../../components/Pagination";
import { SkeletonTable } from "../../components/Skeleton";
import { StatusDropdown, EventStatus } from "../../components/StatusDropdown";

type EventWithClient = Event & { clients?: { name: string } | null };

type StatusFilter = "all" | EventStatus;

const STATUS_CHIPS: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Cotizado", value: "quoted" },
  { label: "Confirmado", value: "confirmed" },
  { label: "Completado", value: "completed" },
  { label: "Cancelado", value: "cancelled" },
];

export const EventList: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await eventService.getAll();
      setEvents(data || []);
    } catch (error) {
      logError("Error fetching events", error);
      addToast("Error al cargar los eventos. Verifica tu conexión y recarga la página.", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const requestDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setConfirmOpen(false);
    setPendingDeleteId(null);

    try {
      await eventService.delete(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      addToast("Evento eliminado correctamente.", "success");
    } catch (error) {
      logError("Error deleting event", error);
      addToast("Error al eliminar el evento.", "error");
    }
  };

  const handleStatusChange = (eventId: string, newStatus: EventStatus) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, status: newStatus } : e)),
    );
  };

  const filteredEvents = (events || []).filter((event) => {
    const clientName = event.clients?.name ?? "";
    const matchesSearch =
      clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.service_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.city ?? "").toLowerCase().includes(searchTerm.toLowerCase());
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
    handleSort,
    sortKey,
    sortOrder,
  } = usePagination({
    data: filteredEvents,
    itemsPerPage: 10,
    initialSortKey: "event_date",
    initialSortOrder: "desc",
  });

  const renderSortIcon = (key: keyof EventWithClient) => {
    if (sortKey !== key) return null;
    return sortOrder === "asc" ? (
      <ArrowUp className="inline h-3 w-3 ml-1" aria-hidden="true" />
    ) : (
      <ArrowDown className="inline h-3 w-3 ml-1" aria-hidden="true" />
    );
  };

  const getSortAriaSort = (
    key: keyof EventWithClient,
  ): "ascending" | "descending" | "none" => {
    if (sortKey !== key) return "none";
    return sortOrder === "asc" ? "ascending" : "descending";
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr + "T12:00:00"), "d 'de' MMM yyyy", {
        locale: es,
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (value: number) =>
    `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar evento"
        description="Se eliminarán todos los datos del evento, incluyendo pagos y archivos. Esta acción no se puede deshacer."
        confirmText="Eliminar permanentemente"
        cancelText="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-text tracking-tight">
          Eventos{" "}
          {!loading && events.length > 0 && (
            <span className="text-base font-semibold text-text-secondary">
              ({events.length})
            </span>
          )}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {events.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportToCsv(
                  "eventos",
                  [
                    "Fecha",
                    "Cliente",
                    "Tipo de Servicio",
                    "Personas",
                    "Estado",
                    "Total",
                    "Ciudad",
                  ],
                  events.map((e) => [
                    formatDate(e.event_date),
                    e.clients?.name ?? "",
                    e.service_type,
                    e.num_people,
                    e.status,
                    e.total_amount.toFixed(2),
                    e.city ?? "",
                  ]),
                )
              }
              className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
              aria-label="Exportar eventos a CSV"
            >
              <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              Exportar CSV
            </button>
          )}
          <Link
            to="/cotizacion-rapida"
            className="hidden lg:inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-bold rounded-xl text-text-secondary bg-card hover:bg-surface-alt shadow-sm transition-colors"
          >
            <Zap className="h-4 w-4 mr-2" aria-hidden="true" />
            Cotización Rápida
          </Link>
          <Link
            to="/events/new"
            className="hidden lg:inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02]"
          >
            <CalendarPlus className="h-5 w-5 mr-2" aria-hidden="true" />
            Nuevo Evento
          </Link>
        </div>
      </div>

      <div className="relative max-w-md">
        <label htmlFor="event-search" className="sr-only">
          Buscar eventos
        </label>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-text-secondary" aria-hidden="true" />
        </div>
        <input
          id="event-search"
          type="search"
          className="block w-full pl-10 pr-8 py-2 border border-border rounded-xl leading-5 bg-card text-text placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary sm:text-sm transition duration-150 ease-in-out"
          placeholder="Buscar eventos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Buscar eventos por cliente, servicio o ciudad"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setStatusFilter(chip.value)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              statusFilter === chip.value
                ? "bg-primary text-white border-primary"
                : "bg-card text-text-secondary border-border hover:border-primary/50 hover:text-primary"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="bg-card shadow-sm overflow-hidden rounded-2xl border border-border">
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
        ) : filteredEvents.length === 0 ? (
          <Empty
            icon={CalendarDays}
            title={
              searchTerm || statusFilter !== "all"
                ? "No se encontraron eventos"
                : "Sin eventos registrados"
            }
            description={
              searchTerm || statusFilter !== "all"
                ? "No hay eventos que coincidan. Prueba con otro estado o borrando el texto de búsqueda."
                : "Comienza creando tu primer evento."
            }
            action={
              !searchTerm && statusFilter === "all" ? (
                <Link
                  to="/events/new"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg transition-all hover:scale-[1.02]"
                >
                  <CalendarPlus className="h-5 w-5 mr-2" aria-hidden="true" />
                  Crear Evento
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table
              className="min-w-full divide-y divide-border"
              aria-label="Tabla de eventos"
            >
              <caption className="sr-only">
                Lista de eventos con {totalItems} resultados. Mostrando página{" "}
                {currentPage} de {totalPages}.
              </caption>
              <thead className="bg-surface-alt">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                    onClick={() => handleSort("event_date")}
                    aria-sort={getSortAriaSort("event_date")}
                  >
                    Fecha {renderSortIcon("event_date")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-text-secondary"
                  >
                    Cliente
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                    onClick={() => handleSort("service_type")}
                    aria-sort={getSortAriaSort("service_type")}
                  >
                    Servicio {renderSortIcon("service_type")}
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-text-secondary"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-semibold text-text-secondary cursor-pointer hover:bg-surface-alt/50 transition-colors"
                    onClick={() => handleSort("total_amount")}
                    aria-sort={getSortAriaSort("total_amount")}
                  >
                    Total {renderSortIcon("total_amount")}
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {paginatedEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="group hover:bg-surface-alt/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/events/${event.id}/summary`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-text">
                        {formatDate(event.event_date)}
                      </div>
                      {event.start_time && (
                        <div className="text-xs text-text-secondary">
                          {event.start_time}
                          {event.end_time ? ` – ${event.end_time}` : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-text">
                        {event.clients?.name ?? "—"}
                      </div>
                      {event.city && (
                        <div className="text-xs text-text-secondary truncate max-w-[180px]">
                          {event.city}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-text">
                        {event.service_type}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {event.num_people}{" "}
                        {event.num_people === 1 ? "persona" : "personas"}
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <StatusDropdown
                        eventId={event.id}
                        currentStatus={event.status as EventStatus}
                        onStatusChange={(newStatus) =>
                          handleStatusChange(event.id, newStatus)
                        }
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                      {formatCurrency(event.total_amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <RowActionMenu
                          items={[
                            {
                              label: "Ver Resumen",
                              icon: Eye,
                              onClick: () =>
                                navigate(`/events/${event.id}/summary`),
                            },
                            {
                              label: "Editar",
                              icon: Edit,
                              onClick: () =>
                                navigate(`/events/${event.id}/edit`),
                            },
                            {
                              label: "Eliminar",
                              icon: Trash2,
                              onClick: () => requestDelete(event.id),
                              variant: "destructive" as const,
                            },
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
        {!loading && filteredEvents.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={10}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};
