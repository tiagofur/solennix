import React, { useEffect, useState } from "react";
import { eventService } from "../services/eventService";
import { Event } from "../types/entities";
import { logError } from "../lib/errorHandler";
import { AlertCircle, CheckCircle, XCircle, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type EventWithClient = Event & {
  client?: { name: string } | null;
};

export const PendingEventsModal: React.FC = () => {
  const [pendingEvents, setPendingEvents] = useState<EventWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPendingEvents = async () => {
      try {
        setLoading(true);
        const data = await eventService.getAll();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const pastConfirmed = (data || []).filter((e) => {
          if (e.status !== "confirmed") return false;
          // Parse date assuming "YYYY-MM-DD" local format
          const eventDate = new Date(e.event_date + "T00:00:00");
          return eventDate < today;
        });

        if (pastConfirmed.length > 0) {
          setPendingEvents(pastConfirmed);
          setIsOpen(true);
        }
      } catch (err) {
        logError("Error loading pending events", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingEvents();
  }, []);

  const handleUpdateStatus = async (
    eventId: string,
    newStatus: "completed" | "cancelled",
  ) => {
    try {
      setUpdatingId(eventId);
      await eventService.update(eventId, { status: newStatus });
      setPendingEvents((prev) => {
        const updated = prev.filter((e) => e.id !== eventId);
        if (updated.length === 0) {
          setIsOpen(false);
        }
        return updated;
      });
    } catch (err) {
      logError(`Error updating event ${eventId}`, err);
    } finally {
      setUpdatingId(null);
    }
  };

  if (!isOpen || loading || pendingEvents.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
        />

        <div className="relative transform overflow-hidden rounded-3xl bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl border border-border">
          <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div
                className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-orange/20 sm:mx-0 sm:h-10 sm:w-10"
                aria-hidden="true"
              >
                <AlertCircle
                  className="h-6 w-6 text-brand-orange"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                <div className="flex justify-between items-center mb-2">
                  <h3
                    className="text-xl font-semibold leading-6 text-gray-900 dark:text-white"
                    id="modal-title"
                  >
                    Eventos Pendientes de Cierre
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-500 transition-colors"
                    aria-label="Cerrar modal"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Tienes {pendingEvents.length} evento(s) confirmados en una
                    fecha pasada. Por favor, marca si ya fueron completados o
                    cancelados.
                  </p>

                  <div className="max-h-96 overflow-y-auto pr-2 space-y-3">
                    {pendingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="border border-border rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface-alt/50"
                      >
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white truncate max-w-xs">
                            {event.client?.name || "Sin Cliente"} -{" "}
                            {event.service_type}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {format(
                              new Date(event.event_date + "T12:00:00"),
                              "dd 'de' MMMM, yyyy",
                              { locale: es },
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStatus(event.id, "completed")
                            }
                            disabled={updatingId === event.id}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-xl text-white bg-green-600 hover:bg-green-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:opacity-50"
                            aria-label={`Marcar evento como completado: ${event.client?.name || "Sin Cliente"} - ${event.service_type}`}
                          >
                            <CheckCircle
                              className="h-4 w-4 mr-1.5"
                              aria-hidden="true"
                            />{" "}
                            Completar
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateStatus(event.id, "cancelled")
                            }
                            disabled={updatingId === event.id}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-xl text-white bg-red-600 hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
                            aria-label={`Marcar evento como cancelado: ${event.client?.name || "Sin Cliente"} - ${event.service_type}`}
                          >
                            <XCircle
                              className="h-4 w-4 mr-1.5"
                              aria-hidden="true"
                            />{" "}
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-xs hover:bg-gray-50 dark:hover:bg-gray-700 sm:mt-0 sm:w-auto"
              onClick={() => setIsOpen(false)}
            >
              Cerrar por ahora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
