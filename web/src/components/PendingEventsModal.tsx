import React, { useEffect, useState } from "react";
import { eventService } from "../services/eventService";
import { Event } from "../types/entities";
import { logError } from "../lib/errorHandler";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Modal } from "./Modal";

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

  if (loading || pendingEvents.length === 0) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Eventos Pendientes de Cierre"
      maxWidth="lg"
      titleId="modal-title"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4 p-4 bg-warning/5 border border-warning/20 rounded-2xl">
          <div className="p-2 bg-warning/10 rounded-xl">
            <AlertCircle className="h-6 w-6 text-warning" aria-hidden="true" />
          </div>
          <p className="text-sm text-text-secondary leading-relaxed">
            Tienes <span className="font-bold text-text">{pendingEvents.length} evento(s)</span> confirmados en una
            fecha pasada. Por favor, marca si ya fueron completados o cancelados.
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {pendingEvents.map((event) => (
            <div
              key={event.id}
              className="border border-border rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-surface hover:border-primary/20 transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-text truncate group-hover:text-primary transition-colors">
                  {event.client?.name || "Sin Cliente"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-text-secondary">
                    {event.service_type}
                  </span>
                  <span className="text-text-tertiary">·</span>
                  <span className="text-sm text-text-secondary">
                    {format(
                      new Date(event.event_date + "T12:00:00"),
                      "dd 'de' MMMM, yyyy",
                      { locale: es },
                    )}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(event.id, "completed")}
                  disabled={updatingId === event.id}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-success text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-success/20 disabled:opacity-50"
                  aria-label={`Marcar evento como completado: ${event.client?.name || "Sin Cliente"} - ${event.service_type}`}
                >
                  <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  Completar
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(event.id, "cancelled")}
                  disabled={updatingId === event.id}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-error/10 text-error border border-error/20 text-sm font-bold rounded-xl hover:bg-error/20 transition-colors disabled:opacity-50"
                  aria-label={`Marcar evento como cancelado: ${event.client?.name || "Sin Cliente"} - ${event.service_type}`}
                >
                  <XCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                  Cancelar
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-border flex justify-end">
          <button
            type="button"
            className="px-6 py-2.5 rounded-xl bg-surface-alt text-text-secondary font-bold hover:bg-surface transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Cerrar por ahora
          </button>
        </div>
      </div>
    </Modal>
  );
};
