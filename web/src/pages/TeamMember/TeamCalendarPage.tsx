import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays } from 'lucide-react';
import { useMyAssignments } from '@/hooks/queries/useStaffQueries';
import type { TeamMemberAssignment } from '@/types/entities';
import {
  filterAssignments,
  formatEventDate,
  formatShiftLabel,
  type TeamStatusFilter,
  teamStatusOptions,
} from './teamMemberUtils';
import { TeamMemberPortalNav } from './components/TeamMemberPortalNav';

const toMonthInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const isInMonth = (dateIso: string, monthInput: string) => dateIso.startsWith(monthInput);

const byDate = (list: TeamMemberAssignment[]) => {
  const map = new Map<string, TeamMemberAssignment[]>();
  list.forEach((assignment) => {
    const existing = map.get(assignment.event_date) ?? [];
    existing.push(assignment);
    map.set(assignment.event_date, existing);
  });

  return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
};

export const TeamCalendarPage: React.FC = () => {
  const { t, i18n } = useTranslation(['common']);
  const { data: assignments = [], isLoading, isError, refetch } = useMyAssignments();

  const [month, setMonth] = React.useState(toMonthInput(new Date()));
  const [statusFilter, setStatusFilter] = React.useState<TeamStatusFilter>('all');

  const monthAssignments = React.useMemo(
    () => assignments.filter((item) => isInMonth(item.event_date, month)),
    [assignments, month],
  );

  const filtered = React.useMemo(
    () => filterAssignments(monthAssignments, statusFilter, ''),
    [monthAssignments, statusFilter],
  );

  const grouped = React.useMemo(() => byDate(filtered), [filtered]);

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
            {t('team.load_error', { defaultValue: 'No pudimos cargar tu calendario.' })}
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
            {t('team.calendar_title', { defaultValue: 'Calendario de trabajo' })}
          </h1>
          <p className="text-sm text-text-secondary">
            {t('team.calendar_subtitle', { defaultValue: 'Visualizá tus eventos asignados por fecha.' })}
          </p>
          <TeamMemberPortalNav />
        </header>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-text-secondary">
              {t('team.filter.month', { defaultValue: 'Mes' })}
              <input
                type="month"
                className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </label>
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
                      : t(`team.status.${option}`, {
                          defaultValue:
                            option === 'pending'
                              ? 'Pendiente'
                              : option === 'confirmed'
                                ? 'Confirmado'
                                : option === 'declined'
                                  ? 'Rechazado'
                                  : 'Cancelado',
                        })}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {grouped.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-text-secondary">
            {t('team.calendar_empty', { defaultValue: 'No hay eventos asignados para este mes y filtro.' })}
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([date, items]) => (
              <section key={date} className="rounded-2xl border border-border bg-card p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
                  {formatEventDate(date, i18n.language)}
                </h2>
                <div className="mt-3 space-y-2">
                  {items.map((assignment) => {
                    const shift = formatShiftLabel(assignment, i18n.language, t);
                    return (
                      <div
                        key={assignment.event_staff_id}
                        className="flex flex-col gap-1 rounded-xl border border-border/70 bg-bg px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-medium text-text">{assignment.event_name}</p>
                          {shift ? <p className="text-xs text-text-secondary">{shift}</p> : null}
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                          {t(`team.status.${assignment.status}`, {
                            defaultValue:
                              assignment.status === 'pending'
                                ? 'Pendiente'
                                : assignment.status === 'confirmed'
                                  ? 'Confirmado'
                                  : assignment.status === 'declined'
                                    ? 'Rechazado'
                                    : 'Cancelado',
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
