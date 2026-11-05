import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock3, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useUpcomingEvents } from '@/hooks/queries/useEventQueries';
import { useEventStaff } from '@/hooks/queries/useStaffQueries';
import { staffService } from '@/services/staffService';
import type { EventStaff } from '@/types/entities';
import { formatEventDate } from '../TeamMember/teamMemberUtils';
import { AssistantPortalNav } from './AssistantPortalNav';

const statusBadgeClass: Record<NonNullable<EventStaff['status']>, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  declined: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  cancelled: 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
};

export const AssistantAgendaPage: React.FC = () => {
  const { t, i18n } = useTranslation(['common']);
  const { eventId: eventIdParam } = useParams<{ eventId?: string }>();
  const { data: events = [], isLoading, isError, refetch } = useUpcomingEvents(20);

  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const activeEventId = eventIdParam ?? selectedEventId ?? events[0]?.id ?? null;

  React.useEffect(() => {
    if (eventIdParam) {
      setSelectedEventId(eventIdParam);
    }
  }, [eventIdParam]);

  const { data: eventStaff = [], isLoading: isLoadingStaff } = useEventStaff(activeEventId ?? undefined);
  const { data: summary } = useQuery({
    queryKey: ['assistant', 'event-staff-summary', activeEventId],
    queryFn: () => staffService.getEventStaffSummary(activeEventId!),
    enabled: !!activeEventId,
  });

  const activeEvent = events.find((event) => event.id === activeEventId) ?? null;

  const statusLabel = (status: EventStaff['status']): string => {
    switch (status) {
      case 'confirmed':
        return t('assistant.status.confirmed', { defaultValue: 'Confirmado' });
      case 'declined':
        return t('assistant.status.declined', { defaultValue: 'Rechazado' });
      case 'cancelled':
        return t('assistant.status.cancelled', { defaultValue: 'Cancelado' });
      default:
        return t('assistant.status.pending', { defaultValue: 'Pendiente' });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="h-8 w-44 animate-pulse rounded-xl bg-surface-alt" />
          <div className="h-24 w-full animate-pulse rounded-2xl bg-surface-alt" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-bg px-4 py-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="space-y-3">
            <h1 className="text-2xl font-bold text-text tracking-tight">
              {t('assistant.agenda_title', { defaultValue: 'Agenda de eventos' })}
            </h1>
            <AssistantPortalNav />
          </header>
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-text-secondary">
              {t('assistant.load_error', { defaultValue: 'No pudimos cargar la información.' })}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-4 inline-flex items-center rounded-xl border border-border bg-surface-alt px-4 py-2 text-sm font-medium text-text hover:bg-card"
            >
              {t('common:actions.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-3">
          <h1 className="text-2xl font-bold text-text tracking-tight">
            {t('assistant.agenda_title', { defaultValue: 'Agenda de eventos' })}
          </h1>
          <p className="text-sm text-text-secondary">
            {t('assistant.agenda_subtitle', {
              defaultValue: 'Próximos eventos y dotación de personal. Solo lectura.',
            })}
          </p>
          <AssistantPortalNav />
        </header>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            {t('assistant.upcoming_title', { defaultValue: 'Próximos eventos' })}
          </h2>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">
              {t('assistant.agenda_empty', { defaultValue: 'No hay próximos eventos.' })}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {events.map((event) => {
                const isActive = event.id === activeEventId;
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => setSelectedEventId(event.id)}
                    aria-pressed={isActive}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      isActive ? 'border-primary bg-primary/5' : 'border-border/70 bg-bg hover:border-border'
                    }`}
                  >
                    <span className="block text-sm font-semibold text-text">{event.service_type}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatEventDate(event.event_date, i18n.language)}
                      </span>
                      {event.start_time ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          {event.start_time}
                        </span>
                      ) : null}
                      {event.location || event.city ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {[event.location, event.city].filter(Boolean).join(', ')}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {activeEvent ? (
          <section className="rounded-2xl border border-border bg-card p-4" aria-live="polite">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              {t('assistant.staffing_title', { defaultValue: 'Dotación del evento' })}
            </h2>
            <p className="mt-1 text-sm font-semibold text-text">
              {activeEvent.service_type} · {formatEventDate(activeEvent.event_date, i18n.language)}
            </p>

            {summary ? (
              <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <div className="rounded-xl border border-border/70 bg-bg px-3 py-2">
                  <dt className="text-xs text-text-secondary">{t('assistant.summary.total', { defaultValue: 'Total' })}</dt>
                  <dd className="text-lg font-bold text-text">{summary.total}</dd>
                </div>
                <div className="rounded-xl border border-border/70 bg-bg px-3 py-2">
                  <dt className="text-xs text-text-secondary">{t('assistant.summary.confirmed', { defaultValue: 'Confirmados' })}</dt>
                  <dd className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{summary.confirmed}</dd>
                </div>
                <div className="rounded-xl border border-border/70 bg-bg px-3 py-2">
                  <dt className="text-xs text-text-secondary">{t('assistant.summary.pending', { defaultValue: 'Pendientes' })}</dt>
                  <dd className="text-lg font-bold text-amber-700 dark:text-amber-300">{summary.pending}</dd>
                </div>
                <div className="rounded-xl border border-border/70 bg-bg px-3 py-2">
                  <dt className="text-xs text-text-secondary">{t('assistant.summary.declined', { defaultValue: 'Rechazados' })}</dt>
                  <dd className="text-lg font-bold text-rose-700 dark:text-rose-300">{summary.declined}</dd>
                </div>
                <div className="rounded-xl border border-border/70 bg-bg px-3 py-2">
                  <dt className="text-xs text-text-secondary">{t('assistant.summary.cancelled', { defaultValue: 'Cancelados' })}</dt>
                  <dd className="text-lg font-bold text-text-secondary">{summary.cancelled}</dd>
                </div>
              </dl>
            ) : null}

            {isLoadingStaff ? (
              <div className="mt-3 h-16 animate-pulse rounded-xl bg-surface-alt" />
            ) : eventStaff.length === 0 ? (
              <p className="mt-3 text-sm text-text-secondary">
                {t('assistant.staffing_empty', { defaultValue: 'Este evento aún no tiene personal asignado.' })}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {eventStaff.map((member) => (
                  <li key={member.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-text truncate">{member.staff_name ?? '—'}</p>
                      {member.staff_role_label ? (
                        <p className="text-xs text-text-secondary">{member.staff_role_label}</p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${statusBadgeClass[member.status ?? 'pending']}`}
                    >
                      {statusLabel(member.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
};
