import React from 'react';
import { CalendarDays, Clock3, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMyAssignments, useRespondAssignment } from '@/hooks/queries/useStaffQueries';
import type { TeamMemberAssignment } from '@/types/entities';
import {
  filterAssignments,
  formatEventDate,
  formatShiftLabel,
  teamStatusOptions,
  type TeamStatusFilter,
} from './teamMemberUtils';
import { TeamMemberPortalNav } from './components/TeamMemberPortalNav';

const statusBadgeClass: Record<TeamMemberAssignment['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  declined: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  cancelled: 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
};

const statusLabel = (status: TeamMemberAssignment['status'], t: ReturnType<typeof useTranslation>['t']) =>
  t(`team.status.${status}`, {
    defaultValue:
      status === 'pending'
        ? 'Pendiente'
        : status === 'confirmed'
          ? 'Confirmado'
          : status === 'declined'
            ? 'Rechazado'
            : 'Cancelado',
  });

export const TeamEventsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['common']);
  const { data: assignments = [], isLoading, isError, refetch } = useMyAssignments();
  const respondMutation = useRespondAssignment();
  const moneyFormatter = React.useMemo(
    () => new Intl.NumberFormat(i18n.language || 'es-MX', { style: 'currency', currency: 'MXN' }),
    [i18n.language],
  );

  const [statusFilter, setStatusFilter] = React.useState<TeamStatusFilter>('all');
  const [search, setSearch] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');

  const filtered = React.useMemo(
    () => filterAssignments(assignments, statusFilter, search, fromDate || undefined, toDate || undefined),
    [assignments, statusFilter, search, fromDate, toDate],
  );

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
        <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-text-secondary">
            {t('team.load_error', { defaultValue: 'No pudimos cargar tus eventos.' })}
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
    );
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-3">
          <h1 className="text-2xl font-bold text-text tracking-tight">
            {t('team.events_title', { defaultValue: 'Mis eventos' })}
          </h1>
          <p className="text-sm text-text-secondary">
            {t('team.events_subtitle', { defaultValue: 'Filtrá solo tus eventos asignados y revisá tu estado.' })}
          </p>
          <TeamMemberPortalNav />
        </header>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <label className="text-sm text-text-secondary">
              {t('team.filter.status', { defaultValue: 'Estado' })}
              <select
                className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TeamStatusFilter)}
              >
                {teamStatusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'all'
                      ? t('team.filter.all_status', { defaultValue: 'Todos' })
                      : statusLabel(option, t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-text-secondary">
              {t('team.filter.from', { defaultValue: 'Desde' })}
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </label>
            <label className="text-sm text-text-secondary">
              {t('team.filter.to', { defaultValue: 'Hasta' })}
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </label>
            <label className="text-sm text-text-secondary">
              {t('team.filter.search', { defaultValue: 'Buscar evento' })}
              <div className="mt-1 flex items-center rounded-xl border border-border bg-bg px-3">
                <Search className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                <input
                  type="search"
                  className="w-full border-0 bg-transparent px-2 py-2 text-sm text-text outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('team.filter.search_placeholder', { defaultValue: 'Nombre del evento' })}
                />
              </div>
            </label>
          </div>
        </section>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-text-secondary">
            {t('team.events_empty', { defaultValue: 'No hay eventos asignados con los filtros actuales.' })}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((assignment) => {
              const shift = formatShiftLabel(assignment, i18n.language, t);
              const isPending = assignment.status === 'pending';
              const isBusy = respondMutation.isPending;

              return (
                <article
                  key={assignment.event_staff_id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <h2 className="text-base font-semibold text-text">{assignment.event_name}</h2>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" aria-hidden="true" />
                          {formatEventDate(assignment.event_date, i18n.language)}
                        </span>
                        {shift ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-4 w-4" aria-hidden="true" />
                            {shift}
                          </span>
                        ) : null}
                        {assignment.fee_amount != null ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {t('team.fee', { defaultValue: 'Pago' })}: {moneyFormatter.format(assignment.fee_amount)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[assignment.status]}`}>
                      {statusLabel(assignment.status, t)}
                    </span>
                  </div>

                  {isPending ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => respondMutation.mutate({ id: assignment.event_staff_id, response: 'accept' })}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {t('team.accept', { defaultValue: 'Aceptar' })}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => respondMutation.mutate({ id: assignment.event_staff_id, response: 'decline' })}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                      >
                        {t('team.decline', { defaultValue: 'Rechazar' })}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
