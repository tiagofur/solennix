import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Users, UserPlus } from 'lucide-react';
import { QuickClientModal } from './QuickClientModal';

// Local type to avoid Supabase dependency
interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  total_events: number | null;
  total_spent: number | null;
}

interface EventGeneralInfoProps {
  clients: Client[];
  clientIdValue?: string;
  onClientCreated?: (client: Client) => void;
}

export const EventGeneralInfo: React.FC<EventGeneralInfoProps> = ({
  clients,
  clientIdValue,
  onClientCreated
}) => {
  const { register, formState: { errors } } = useFormContext();
  const [isQuickClientModalOpen, setIsQuickClientModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        {/* Cliente */}
        <div className="sm:col-span-3">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="client_id" className="block text-sm font-medium text-text-secondary">
              Cliente *
            </label>
            <button
              type="button"
              onClick={() => setIsQuickClientModalOpen(true)}
              className="inline-flex items-center text-xs font-medium text-brand-orange hover:text-orange-600"
              aria-label="Crear nuevo cliente rápidamente"
            >
              <UserPlus className="h-3 w-3 mr-1" aria-hidden="true" />
              Nuevo Cliente
            </button>
          </div>
          <div className="mt-1">
            <select
              id="client_id"
              {...register('client_id')}
              className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-brand-orange/20"
              aria-required="true"
              aria-invalid={errors.client_id ? "true" : "false"}
              aria-describedby={errors.client_id ? "client_id-error" : undefined}
            >
              <option value="">Seleccionar cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            {errors.client_id && (
              <p id="client_id-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.client_id.message as string}
              </p>
            )}
            {clientIdValue && (
              <div className="mt-2 text-xs text-text-secondary bg-surface-alt p-3 rounded-xl border border-border shadow-xs">
                {(() => {
                  const selectedClient = clients.find((c) => c.id === clientIdValue);
                  if (selectedClient) {
                    return (
                      <>
                        <span className="font-medium text-text-secondary">
                          Historial del Cliente:
                        </span>{' '}
                        {selectedClient.total_events} eventos realizados, Total gastado: $
                        {selectedClient.total_spent?.toFixed(2) || '0.00'}
                      </>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        </div>

        {onClientCreated && (
          <QuickClientModal
            isOpen={isQuickClientModalOpen}
            onClose={() => setIsQuickClientModalOpen(false)}
            onClientCreated={(client) => {
              onClientCreated(client as any);
            }}
          />
        )}

        {/* Fecha */}
        <div className="sm:col-span-3">
          <label htmlFor="event_date" className="block text-sm font-medium text-text-secondary">
            Fecha del Evento *
          </label>
          <div className="mt-1">
            <input
              id="event_date"
              type="date"
              {...register('event_date')}
              className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-brand-orange/20"
              aria-required="true"
              aria-invalid={errors.event_date ? "true" : "false"}
              aria-describedby={errors.event_date ? "event_date-error" : undefined}
            />
            {errors.event_date && (
              <p id="event_date-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.event_date.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Horarios */}
        <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-text-secondary">
              Hora de Inicio
            </label>
            <div className="mt-1">
              <input
                id="start_time"
                type="time"
                {...register('start_time')}
                className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>
          </div>
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-text-secondary">
              Hora de Fin
            </label>
            <div className="mt-1">
              <input
                id="end_time"
                type="time"
                {...register('end_time')}
                className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-brand-orange/20"
              />
            </div>
          </div>
        </div>

        {/* Tipo de Servicio */}
        <div className="sm:col-span-3">
          <label htmlFor="service_type" className="block text-sm font-medium text-text-secondary">
            Tipo de Servicio *
          </label>
          <div className="mt-1">
            <input
              id="service_type"
              type="text"
              {...register('service_type')}
              placeholder="Ej. Decoración, Banquete, Fotografía"
              className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-brand-orange/20"
              aria-required="true"
              aria-invalid={errors.service_type ? "true" : "false"}
              aria-describedby={errors.service_type ? "service_type-error" : undefined}
            />
            {errors.service_type && (
              <p id="service_type-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.service_type.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Número de Personas */}
        <div className="sm:col-span-3">
          <label htmlFor="num_people" className="block text-sm font-medium text-text-secondary">
            Número de Personas *
          </label>
          <div className="mt-1">
            <div className="relative rounded-xl shadow-xs">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Users className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                id="num_people"
                type="number"
                {...register('num_people')}
                className="block w-full rounded-xl border-border pl-10 focus:border-brand-orange focus:ring-brand-orange sm:text-sm p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-brand-orange/20"
                aria-required="true"
                aria-invalid={errors.num_people ? "true" : "false"}
                aria-describedby={errors.num_people ? "num_people-error" : undefined}
              />
            </div>
            {errors.num_people && (
              <p id="num_people-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.num_people.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Estado */}
        <div className="sm:col-span-3">
          <label htmlFor="status" className="block text-sm font-medium text-text-secondary">
            Estado *
          </label>
          <div className="mt-1">
            <select
              id="status"
              {...register('status')}
              className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-brand-orange/20"
              aria-required="true"
            >
              <option value="quoted">Cotizado</option>
              <option value="confirmed">Confirmado</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Ubicación */}
        <div className="sm:col-span-6">
          <label htmlFor="location" className="block text-sm font-medium text-text-secondary">
            Ubicación del Evento
          </label>
          <div className="mt-1">
            <input
              id="location"
              type="text"
              {...register('location')}
              placeholder="Dirección del evento (opcional, por defecto dirección del cliente)"
              className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>
        </div>

        <div className="sm:col-span-6">
          <label htmlFor="city" className="block text-sm font-medium text-text-secondary">
            Ciudad del Evento
          </label>
          <div className="mt-1">
            <input
              id="city"
              type="text"
              {...register('city')}
              placeholder="Ciudad del evento (para contrato)"
              className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
