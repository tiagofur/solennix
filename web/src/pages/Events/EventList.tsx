import React, { useState, useMemo, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import Empty from "../../components/Empty";
import { usePagination } from "../../hooks/usePagination";
import { Pagination } from "../../components/Pagination";
import { SkeletonTable } from "../../components/Skeleton";
import { StatusDropdown, EventStatus } from "../../components/StatusDropdown";
import {
  useEvents,
  useEventsPaginated,
  useDeleteEvent,
  useEventSearch,
} from "../../hooks/queries/useEventQueries";
import type { EventSearchFilters } from "../../services/eventService";

type EventWithClient = Event & { client?: { name: string } | null };

type StatusFilter = "all" | EventStatus;

const STATUS_CHIPS: { label: string; value: StatusFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Cotizado", value: "quoted" },
  { label: "Confirmado", value: "confirmed" },
  { label: "Completado", value: "completed" },
  { label: "Cancelado", value: "cancelled" },
];

const ITEMS_PER_PAGE = 10;

export const EventList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const deleteEvent = useDeleteEvent();

  // Read filters & pagination from URL (persistent, shareable)
  const searchTerm = searchParams.get("q") || "";
  const statusFilter = (searchParams.get("status") || "all") as StatusFilter;
  const dateFrom = searchParams.get("from") || "";
  const dateTo = searchParams.get("to") || "";
  const urlPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const urlSort = searchParams.get("sort") || "event_date";
  const urlOrder = (searchParams.get("order") || "desc") as "asc" | "desc";

  // Determine if any filter is active — when it is, we hit the backend's
  // advanced FTS endpoint (`GET /api/events/search`) which owns the filter
  // logic across service_type, location, city, client name (fuzzy), status
  // and date range. When no filter is active, fall back to the normal
  // paginated listing.
  const hasFilters = !!(searchTerm || statusFilter !== "all" || dateFrom || dateTo);

  // Server-side paginated query (used when no filters active)
  const paginatedQuery = useEventsPaginated({
    page: urlPage,
    limit: ITEMS_PER_PAGE,
    sort: urlSort,
    order: urlOrder,
  });

  // Server-side advanced search (used when any filter is active). The
  // backend rejects empty-filter requests with 400, so the hook guards
  // with `enabled: hasAnyFilter`.
  const searchFilters: EventSearchFilters = useMemo(() => {
    const filters: EventSearchFilters = {};
    if (searchTerm) filters.q = searchTerm;
    if (statusFilter !== "all") filters.status = statusFilter;
    if (dateFrom) filters.from = dateFrom;
    if (dateTo) filters.to = dateTo;
    return filters;
  }, [searchTerm, statusFilter, dateFrom, dateTo]);
  const searchQuery = useEventSearch(searchFilters);

  // Full fetch still needed for the CSV export / header totals when the
  // user clears the filters. This is bounded by the user's own data and
  // is already cached by React Query.
  const allEventsQuery = useEvents();

  // Pick the right loading state
  const loading = hasFilters ? searchQuery.isLoading : paginatedQuery.isLoading;

  // All events (for CSV export & header count when no filters are active)
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
      // Reset to page 1 when changing filters (not when changing page itself)
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

  // Server-side filtered results (when filters are active) come directly
  // from the FTS endpoint; we don't re-filter client-side. The backend
  // enforces a hard LIMIT 50 on the result set — a known constraint that
  // will be revisited once the endpoint grows pagination support.
  const filteredEvents: EventWithClient[] = hasFilters
    ? (searchQuery.data ?? [])
    : [];

  // Client-side pagination (only used when filters are active)
  const clientPagination = usePagination({
    data: filteredEvents,
    itemsPerPage: ITEMS_PER_PAGE,
    initialSortKey: "event_date",
    initialSortOrder: "desc",
  });

  // Unified pagination values
  const paginatedEvents: EventWithClient[] = hasFilters
    ? clientPagination.currentData
    : paginatedQuery.data?.data ?? [];

  const currentPage = hasFilters ? clientPagination.currentPage : urlPage;
  const totalPages = hasFilters
    ? clientPagination.totalPages
    : paginatedQuery.data?.total_pages ?? 1;
  const totalItems = hasFilters
    ? clientPagination.totalItems
    : paginatedQuery.data?.total ?? 0;

  // For the header count, show total from server when no filters
  const headerCount = hasFilters ? filteredEvents.length : (paginatedQuery.data?.total ?? allEvents.length);

  const sortKey = hasFilters ? clientPagination.sortKey : urlSort;
  const sortOrder = hasFilters ? clientPagination.sortOrder : urlOrder;

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
        next.delete("page"); // reset to page 1 on sort change
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
          {!loading && headerCount > 0 && (
            <span className="text-base font-semibold text-text-secondary">
              ({headerCount})
            </span>
          )}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {allEvents.length > 0 && (
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
                  allEvents.map((e) => [
                    formatDate(e.event_date),
                    e.client?.name ?? "",
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
          onChange={(e) => updateFilter("q", e.target.value)}
          aria-label="Buscar eventos por cliente, servicio o ciudad"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => updateFilter("q", "")}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-secondary hover:text-text transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => updateFilter("status", chip.value)}
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

        <div className="flex items-center gap-2 ml-auto">
          <label htmlFor="date-from" className="sr-only">Desde</label>
          <input
            id="date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => updateFilter("from", e.target.value)}
            className="text-xs border border-border rounded-lg px-2 py-1 bg-card text-text focus:ring-2 focus:ring-primary/20 focus:border-primary"
            aria-label="Filtrar desde fecha"
          />
          <span className="text-xs text-text-secondary">—</span>
          <label htmlFor="date-to" className="sr-only">Hasta</label>
          <input
            id="date-to"
            type="date"
            value={dateTo}
            onChange={(e) => updateFilter("to", e.target.value)}
            className="text-xs border border-border rounded-lg px-2 py-1 bg-card text-text focus:ring-2 focus:ring-primary/20 focus:border-primary"
            aria-label="Filtrar hasta fecha"
          />
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => { updateFilter("from", ""); updateFilter("to", ""); }}
              className="text-xs text-text-secondary hover:text-error transition-colors"
              aria-label="Limpiar filtro de fechas"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
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
        ) : paginatedEvents.length === 0 ? (
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
                        {event.client?.name ?? "—"}
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
        {!loading && paginatedEvents.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
};
