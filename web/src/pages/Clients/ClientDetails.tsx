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
  Clock,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { logError } from "../../lib/errorHandler";
import { useToast } from "../../hooks/useToast";
import { ConfirmDialog } from "../../components/ConfirmDialog";

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
        className="text-center p-8 text-gray-900 dark:text-white"
        role="status"
        aria-live="polite"
      >
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
          className="mt-4 text-brand-orange hover:underline"
          aria-label="Volver a la lista de clientes"
        >
          Volver a clientes
        </button>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center p-8 text-gray-900 dark:text-white">
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
            className="mr-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
            aria-label="Volver a la lista de clientes"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {client.name}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            to={`/clients/${client.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-xs text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            aria-label="Editar información del cliente"
          >
            <Edit className="h-5 w-5 mr-2" aria-hidden="true" />
            Editar
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 shadow-xs"
            aria-label="Eliminar cliente permanentemente"
          >
            <Trash2 className="h-5 w-5 mr-2" aria-hidden="true" />
            Eliminar
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Información del Cliente
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Detalles personales y de contacto.
          </p>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <Phone className="h-4 w-4 mr-2" aria-hidden="true" /> Teléfono
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {client.phone}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <Mail className="h-4 w-4 mr-2" aria-hidden="true" /> Email
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {client.email || "No registrado"}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <MapPin className="h-4 w-4 mr-2" aria-hidden="true" /> Dirección
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {client.address || "No registrada"}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <DollarSign className="h-4 w-4 mr-2" aria-hidden="true" /> Total
                Gastado
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-semibold">
                ${(client.total_spent ?? 0).toFixed(2)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <FileText className="h-4 w-4 mr-2" aria-hidden="true" /> Notas
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {client.notes || "Sin notas adicionales."}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-sm overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Historial de Eventos
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Lista de eventos pasados y futuros.
            </p>
          </div>
          <Link
            to={`/events/new?clientId=${client.id}`}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-brand-orange hover:bg-orange-600"
          >
            Nuevo Evento
          </Link>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700">
          {events.length === 0 ? (
            <div className="px-4 py-5 sm:p-6 text-center text-gray-500 dark:text-gray-400">
              <Calendar
                className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-400"
                aria-hidden="true"
              />
              <p className="mt-2">
                No hay eventos registrados para este cliente.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {events.map((event) => (
                <li key={event.id}>
                  <Link
                    to={`/events/${event.id}/summary`}
                    className="block hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-brand-orange truncate">
                          {event.service_type}
                        </p>
                        <div className="ml-2 shrink-0 flex">
                          <p
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              event.status === "confirmed"
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : event.status === "completed"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  : event.status === "cancelled"
                                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                    : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            }`}
                          >
                            {event.status === "quoted"
                              ? "Cotizado"
                              : event.status === "confirmed"
                                ? "Confirmado"
                                : event.status === "completed"
                                  ? "Completado"
                                  : "Cancelado"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            <Calendar
                              className="shrink-0 mr-1.5 h-5 w-5 text-gray-400 dark:text-gray-400"
                              aria-hidden="true"
                            />
                            {format(
                              new Date(event.event_date),
                              "d 'de' MMMM, yyyy",
                              { locale: es },
                            )}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0 sm:ml-6">
                            <Clock
                              className="shrink-0 mr-1.5 h-5 w-5 text-gray-400 dark:text-gray-400"
                              aria-hidden="true"
                            />
                            {event.num_people} personas
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 dark:text-gray-400 sm:mt-0">
                          <DollarSign
                            className="shrink-0 mr-1.5 h-5 w-5 text-gray-400 dark:text-gray-400"
                            aria-hidden="true"
                          />
                          {(event.total_amount ?? 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
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
