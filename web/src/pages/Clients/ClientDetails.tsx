import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { clientService } from "@/services/clientService";
import { eventService } from "@/services/eventService";
import { Client, Event } from "@/types/entities";
import {
  ArrowLeft,
  Edit,
  Calendar,
  DollarSign,
  MapPin,
  Phone,
  Mail,
  FileText,
  Users,
  Trash2,
} from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { logError } from "@/lib/errorHandler";
import { useToast } from "@/hooks/useToast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StatusDropdown, EventStatus } from "@/components/StatusDropdown";


export const ClientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (id) {
      loadClient(id);
    }
  }, [id]);

  const loadClient = async (clientId: string) => {
    try {
      setLoading(true);
      const [clientData, eventsData] = await Promise.all([
        clientService.getById(clientId),
        eventService.getByClientId(clientId),
      ]);
      setClient(clientData);
      setEvents(eventsData || []);
    } catch (err) {
      logError("Error fetching client details", err);
      setError("Error al cargar los datos del cliente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClient = async () => {
    if (!id) return;
    try {
      await clientService.delete(id);
      addToast("Cliente eliminado correctamente.", "success");
      navigate("/clients");
    } catch (error) {
      logError("Error deleting client", error);
      addToast("Error al eliminar el cliente.", "error");
    } finally {
      setConfirmDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex justify-center items-center h-64 p-8 text-text-secondary"
        role="status"
        aria-live="polite"
      >
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"
          aria-hidden="true"
        ></div>
        Cargando detalles...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-error" role="alert">
          {error}
        </p>
        <button
          type="button"
          onClick={() => navigate("/clients")}
          className="mt-4 text-primary hover:underline"
          aria-label="Volver a la lista de clientes"
        >
          Volver a clientes
        </button>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center p-8 text-text">Cliente no encontrado</div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'Clientes', href: '/clients' }, { label: client.name }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate("/clients")}
            className="mr-4 p-2 rounded-full hover:bg-surface-alt text-text-secondary transition-colors"
            aria-label="Volver a la lista de clientes"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          {client.photo_url ? (
            <img
              src={client.photo_url}
              alt={client.name}
              className="h-10 w-10 rounded-full object-cover mr-3"
            />
          ) : (
            <div
              className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold mr-3"
              aria-hidden="true"
            >
              {client.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-black tracking-tight text-text">
            {client.name}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            to={`/clients/${client.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-border rounded-xl shadow-sm text-sm font-medium text-text-secondary bg-card hover:bg-surface-alt transition-colors"
            aria-label="Editar información del cliente"
          >
            <Edit className="h-5 w-5 mr-2" aria-hidden="true" />
            Editar
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-error/20 text-sm font-medium rounded-xl text-error bg-error/5 hover:bg-error/10 transition-colors"
            aria-label="Eliminar cliente permanentemente"
          >
            <Trash2 className="h-5 w-5 mr-2" aria-hidden="true" />
            Eliminar
          </button>
        </div>
      </div>

      <div className="bg-card shadow-sm overflow-hidden rounded-3xl border border-border">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-semibold text-text">
            Información del Cliente
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Detalles personales y de contacto.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border-t border-border">
          <div className="px-4 py-4 text-center">
            <p className="text-2xl font-black text-text">
              {client.total_events ?? 0}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">Eventos</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-2xl font-black text-text">
              $
              {(client.total_spent ?? 0).toLocaleString("es-MX", {
                minimumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">Total gastado</p>
          </div>
          <div className="px-4 py-4 text-center">
            <p className="text-2xl font-black text-text">
              {client.total_events
                ? `$${Math.round((client.total_spent ?? 0) / client.total_events).toLocaleString("es-MX")}`
                : "—"}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              Promedio por evento
            </p>
          </div>
        </div>
        <div className="border-t border-border px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-text-secondary flex items-center">
                <Phone className="h-4 w-4 mr-2" aria-hidden="true" /> Teléfono
              </dt>
              <dd className="mt-1 text-sm">
                {client.phone ? (
                  <a
                    href={`tel:${client.phone}`}
                    className="text-primary hover:text-primary/80 transition-colors"
                    aria-label={`Llamar a ${client.name} al ${client.phone}`}
                  >
                    {client.phone}
                  </a>
                ) : (
                  <span className="text-text">No registrado</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-text-secondary flex items-center">
                <Mail className="h-4 w-4 mr-2" aria-hidden="true" /> Email
              </dt>
              <dd className="mt-1 text-sm">
                {client.email ? (
                  <a
                    href={`mailto:${client.email}`}
                    className="text-primary hover:text-primary/80 transition-colors"
                    aria-label={`Enviar email a ${client.name} a ${client.email}`}
                  >
                    {client.email}
                  </a>
                ) : (
                  <span className="text-text">No registrado</span>
                )}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-text-secondary flex items-center">
                <MapPin className="h-4 w-4 mr-2" aria-hidden="true" /> Dirección
              </dt>
              <dd className="mt-1 text-sm text-text">
                {client.address || "No registrada"}
              </dd>
            </div>
            {client.city && (
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-text-secondary flex items-center">
                  <MapPin className="h-4 w-4 mr-2" aria-hidden="true" /> Ciudad
                </dt>
                <dd className="mt-1 text-sm text-text">{client.city}</dd>
              </div>
            )}
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-text-secondary flex items-center">
                <DollarSign className="h-4 w-4 mr-2" aria-hidden="true" /> Total
                Gastado
              </dt>
              <dd className="mt-1 text-sm text-text font-semibold">
                $
                {(client.total_spent ?? 0).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                })}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-text-secondary flex items-center">
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" /> Notas
              </dt>
              <dd className="mt-1 text-sm text-text">
                {client.notes || "Sin notas adicionales."}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-card shadow-sm overflow-hidden rounded-3xl border border-border">
        <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg leading-6 font-semibold text-text">
              Historial de Eventos
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-text-secondary">
              Lista de eventos pasados y futuros.
            </p>
          </div>
          <Link
            to={`/events/new?clientId=${client.id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl text-white premium-gradient shadow-sm transition-colors"
          >
            Nuevo Evento
          </Link>
        </div>
        <div className="border-t border-border">
          {events.length === 0 ? (
            <div className="px-4 py-5 sm:p-6 text-center text-text-secondary">
              <Calendar
                className="mx-auto h-12 w-12 text-text-secondary"
                aria-hidden="true"
              />
              <p className="mt-2">
                No hay eventos registrados para este cliente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="min-w-full divide-y divide-border"
                aria-label="Historial de eventos del cliente"
              >
                <thead className="bg-surface-alt">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                        Fecha
                      </span>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                    >
                      Servicio
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                        Personas
                      </span>
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                    >
                      Estado
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                    >
                      <span className="flex items-center gap-1">
                        <DollarSign
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />{" "}
                        Total
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-surface-alt/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/events/${event.id}/summary`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {format(
                          new Date(event.event_date + "T12:00:00"),
                          "d MMM yyyy",
                          { locale: es },
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                        <Link
                          to={`/events/${event.id}/summary`}
                          className="hover:underline"
                        >
                          {event.service_type}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {event.num_people} pax
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <StatusDropdown
                          eventId={event.id}
                          currentStatus={event.status as EventStatus}
                          onStatusChange={(newStatus) => {
                            setEvents((prev) =>
                              prev.map((ev) =>
                                ev.id === event.id ? { ...ev, status: newStatus } : ev,
                              ),
                            );
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                        $
                        {(event.total_amount ?? 0).toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Eliminar Cliente"
        description="¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer y se perderán todos los datos asociados (aunque los eventos existentes se mantendrán, ya no estarán vinculados a este cliente)."
        confirmText="Eliminar permanentemente"
        cancelText="Cancelar"
        onConfirm={handleDeleteClient}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
