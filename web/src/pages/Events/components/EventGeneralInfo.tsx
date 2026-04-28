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

interface UnavailableDate {
  id: string;
  start_date: string;
  end_date: string;
  reason?: string;
}

interface EventGeneralInfoProps {
  clients: Client[];
  clientIdValue?: string;
  onClientCreated?: (client: Client) => void;
  unavailableDates?: UnavailableDate[];
}

import { useTranslation } from 'react-i18next';

export const EventGeneralInfo: React.FC<EventGeneralInfoProps> = ({
  clients,
  clientIdValue,
  onClientCreated,
  unavailableDates,
}) => {
  const { t, i18n } = useTranslation(['events', 'common']);
  const moneyLocale = i18n.language === 'en' ? 'en-US' : 'es-MX';
  const { register, formState: { errors }, watch } = useFormContext();
  const [isQuickClientModalOpen, setIsQuickClientModalOpen] = useState(false);
  const selectedDate = watch('event_date');

  const isDateUnavailable = (date: string) => {
    if (!unavailableDates || !date) return false;
    const dateObj = new Date(date);
    return unavailableDates.some(range => {
      const start = new Date(range.start_date);
      const end = new Date(range.end_date);
      return dateObj >= start && dateObj <= end;
    });
  };

  const unavailable = isDateUnavailable(selectedDate);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
        {/* Cliente */}
        <div className="sm:col-span-3">
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="client_id" className="block text-sm font-medium text-text-secondary">
              {t('events:general.client')} *
            </label>
            <button
              type="button"
              onClick={() => setIsQuickClientModalOpen(true)}
              className="inline-flex items-center text-xs font-medium text-primary hover:text-primary/80"
              aria-label={t('events:general.new_client_aria')}
            >
              <UserPlus className="h-3 w-3 mr-1" aria-hidden="true" />
              {t('events:general.new_client')}
            </button>
          </div>
          <div className="mt-1">
            <select
              id="client_id"
              {...register('client_id')}
              className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-primary/20"
              aria-required="true"
              aria-invalid={errors.client_id ? "true" : "false"}
              aria-describedby={errors.client_id ? "client_id-error" : undefined}
            >
              <option value="">{t('events:general.select_client')}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            {errors.client_id && (
              <p id="client_id-error" className="mt-2 text-sm text-error" role="alert">
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
                          {t('events:general.client_history')}
                        </span>{' '}
                        {selectedClient.total_events} {t('events:general.events_performed')}, {t('events:general.total_spent')} $
                        {selectedClient.total_spent?.toLocaleString(moneyLocale, { minimumFractionDigits: 2 }) || '0.00'}
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
            {t('events:general.event_date')} *
          </label>
          <div className="mt-1">
            <input
              id="event_date"
              type="date"
              {...register('event_date')}
              className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-primary/20"
              aria-required="true"
              aria-invalid={errors.event_date ? "true" : "false"}
              aria-describedby={errors.event_date ? "event_date-error" : undefined}
            />
            {errors.event_date && (
              <p id="event_date-error" className="mt-2 text-sm text-error" role="alert">
                {errors.event_date.message as string}
              </p>
            )}
            {unavailable && (
              <p className="mt-2 text-sm text-error" role="alert">
                {t('events:general.date_unavailable')}
              </p>
            )}
          </div>
        </div>

        {/* Horarios */}
        <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-text-secondary">
              {t('events:general.start_time')}
            </label>
            <div className="mt-1">
              <input
                id="start_time"
                type="time"
                {...register('start_time')}
                className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-text-secondary">
              {t('events:general.end_time')}
            </label>
            <div className="mt-1">
              <input
                id="end_time"
                type="time"
                {...register('end_time')}
                className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
        </div>

        {/* Tipo de Servicio */}
        <div className="sm:col-span-3">
          <label htmlFor="service_type" className="block text-sm font-medium text-text-secondary">
            {t('events:general.service_type')} *
          </label>
          <div className="mt-1">
            <input
              id="service_type"
              type="text"
              {...register('service_type')}
              placeholder={t('events:general.service_placeholder')}
              className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-primary/20"
              aria-required="true"
              aria-invalid={errors.service_type ? "true" : "false"}
              aria-describedby={errors.service_type ? "service_type-error" : undefined}
            />
            {errors.service_type && (
              <p id="service_type-error" className="mt-2 text-sm text-error" role="alert">
                {errors.service_type.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Número de Personas */}
        <div className="sm:col-span-3">
          <label htmlFor="num_people" className="block text-sm font-medium text-text-secondary">
            {t('events:general.num_people')} *
          </label>
          <div className="mt-1">
            <div className="relative rounded-xl shadow-xs">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Users className="h-5 w-5 text-text-secondary" aria-hidden="true" />
              </div>
              <input
                id="num_people"
                type="number"
                {...register('num_people')}
                className="block w-full rounded-xl border-border pl-10 focus:border-primary focus:ring-primary sm:text-sm p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-primary/20"
                aria-required="true"
                aria-invalid={errors.num_people ? "true" : "false"}
                aria-describedby={errors.num_people ? "num_people-error" : undefined}
              />
            </div>
            {errors.num_people && (
              <p id="num_people-error" className="mt-2 text-sm text-error" role="alert">
                {errors.num_people.message as string}
              </p>
            )}
          </div>
        </div>

        {/* Estado */}
        <div className="sm:col-span-3">
          <label htmlFor="status" className="block text-sm font-medium text-text-secondary">
            {t('events:general.status')} *
          </label>
          <div className="mt-1">
            <select
              id="status"
              {...register('status')}
              className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-primary/20"
              aria-required="true"
            >
              <option value="quoted">{t('events:general.status_options.quoted')}</option>
              <option value="confirmed">{t('events:general.status_options.confirmed')}</option>
              <option value="completed">{t('events:general.status_options.completed')}</option>
              <option value="cancelled">{t('events:general.status_options.cancelled')}</option>
            </select>
          </div>
        </div>

        {/* Ubicación */}
        <div className="sm:col-span-6">
          <label htmlFor="location" className="block text-sm font-medium text-text-secondary">
            {t('events:general.location')}
          </label>
          <div className="mt-1">
            <input
              id="location"
              type="text"
              {...register('location')}
              placeholder={t('events:general.location_placeholder')}
              className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="sm:col-span-6">
          <label htmlFor="city" className="block text-sm font-medium text-text-secondary">
            {t('events:general.city')}
          </label>
          <div className="mt-1">
            <input
              id="city"
              type="text"
              {...register('city')}
              placeholder={t('events:general.city_placeholder')}
              className="shadow-xs rounded-xl p-2 border bg-card text-text border-border transition-shadow focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
