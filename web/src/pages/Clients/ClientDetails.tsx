import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { clientService } from "../../services/clientService";
import { eventService } from "../../services/eventService";
import { Client, Event } from "../../types/entities";
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
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { logError } from "../../lib/errorHandler";
import { useToast } from "../../hooks/useToast";
import { ConfirmDialog } from "../../components/ConfirmDialog";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  quoted: { label: "Cotizado", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20" },
  confirmed: { label: "Confirmado", className: "bg-brand-green/10 text-brand-green border-brand-green/20" },
  completed: { label: "Completado", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  cancelled: { label: "Cancelado", className: "bg-red-500/10 text-red-500 border-red-500/20" },
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.quoted;
  return (
    <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

export const ClientDetails: React.FC = () => {
  const { id } = useParams();
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" aria-hidden="true"></div>
        Cargando detalles...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-red-600 dark:text-red-400" role="alert">
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
      <div className="text-center p-8 text-text">
        Cliente no encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
            <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary font-bold mr-3" aria-hidden="true">
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
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors"
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
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-text-secondary flex items-center">
                <DollarSign className="h-4 w-4 mr-2" aria-hidden="true" /> Total
                Gastado
              </dt>
              <dd className="mt-1 text-sm text-text font-semibold">
                ${(client.total_spent ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
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
              <table className="min-w-full divide-y divide-border" aria-label="Historial de eventos del cliente">
                <thead className="bg-surface-alt">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Fecha</span>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Servicio
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden="true" /> Personas</span>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" aria-hidden="true" /> Total</span>
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
                        {format(new Date(event.event_date), "d MMM yyyy", { locale: es })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary">
                        {event.service_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {event.num_people}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={event.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                        ${(event.total_amount ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
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
