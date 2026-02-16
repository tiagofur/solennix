import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Database } from '../../../types/supabase';
import { Users } from 'lucide-react';

type Client = Database['public']['Tables']['clients']['Row'];

interface EventGeneralInfoProps {
  clients: Client[];
  clientIdValue?: string;
}

export const EventGeneralInfo: React.FC<EventGeneralInfoProps> = ({ clients, clientIdValue }) => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        {/* Cliente */}
        <div className="sm:col-span-3">
          <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Cliente *
          </label>
          <div className="mt-1">
            <select
              {...register('client_id')}
              className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Seleccionar cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            {errors.client_id && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.client_id.message as string}
              </p>
            )}
            {clientIdValue && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded border dark:border-gray-600">
                {(() => {
                  const selectedClient = clients.find((c) => c.id === clientIdValue);
                  if (selectedClient) {
                    return (
                      <>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
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

        {/* Fecha */}
        <div className="sm:col-span-3">
          <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fecha del Evento *
          </label>
          <div className="mt-1">
            <input
              type="date"
              {...register('event_date')}
              className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {errors.event_date && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.event_date.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Horarios */}
        <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Hora de Inicio
            </label>
            <div className="mt-1">
              <input
                type="time"
                {...register('start_time')}
                className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Hora de Fin
            </label>
            <div className="mt-1">
              <input
                type="time"
                {...register('end_time')}
                className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Tipo de Servicio */}
        <div className="sm:col-span-3">
          <label htmlFor="service_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Tipo de Servicio *
          </label>
          <div className="mt-1">
            <input
              type="text"
              {...register('service_type')}
              placeholder="Ej. Barra de Churros"
              className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {errors.service_type && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.service_type.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Número de Personas */}
        <div className="sm:col-span-3">
          <label htmlFor="num_people" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Número de Personas *
          </label>
          <div className="mt-1">
            <div className="relative rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Users className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                {...register('num_people')}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 pl-10 focus:border-brand-orange focus:ring-brand-orange sm:text-sm p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            {errors.num_people && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {errors.num_people.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Estado */}
        <div className="sm:col-span-3">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Estado *
          </label>
          <div className="mt-1">
            <select
              {...register('status')}
              className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Ubicación del Evento
          </label>
          <div className="mt-1">
            <input
              type="text"
              {...register('location')}
              placeholder="Dirección del evento (opcional, por defecto dirección del cliente)"
              className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="sm:col-span-6">
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Ciudad del Evento
          </label>
          <div className="mt-1">
            <input
              type="text"
              {...register('city')}
              placeholder="Ciudad del evento (para contrato)"
              className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
