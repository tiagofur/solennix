import React, { useMemo, useState } from "react";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Modal } from "./Modal";
import { useEvents, useUpdateEventStatus } from "../hooks/queries/useEventQueries";

export const PendingEventsModal: React.FC = () => {
  const { data: allEvents = [], isLoading: loading } = useEvents();
  const updateStatus = useUpdateEventStatus();
  const [dismissed, setDismissed] = useState(false);

  const pendingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allEvents.filter((e) => {
      if (e.status !== "confirmed") return false;
      const eventDate = new Date(e.event_date + "T00:00:00");
      return eventDate < today;
    });
  }, [allEvents]);

  const isOpen = !dismissed && pendingEvents.length > 0;
  const updatingId = updateStatus.isPending ? (updateStatus.variables?.id ?? null) : null;

  const handleUpdateStatus = (
    eventId: string,
    newStatus: "completed" | "cancelled",
  ) => {
    updateStatus.mutate({ id: eventId, status: newStatus });
  };

  if (loading || pendingEvents.length === 0) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setDismissed(true)}
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
            onClick={() => setDismissed(true)}
          >
            Cerrar por ahora
          </button>
        </div>
      </div>
    </Modal>
  );
};
