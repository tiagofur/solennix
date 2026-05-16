import React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CheckCircle2, Clock3, Search, XCircle } from 'lucide-react';
import { format, isSameDay, startOfDay, startOfMonth, type Locale } from 'date-fns';
import { enUS, es } from 'date-fns/locale';
import { useMyAssignments, useRespondAssignment } from '@/hooks/queries/useStaffQueries';
import type { TeamMemberAssignment } from '@/types/entities';
import {
  filterAssignments,
  formatEventDate,
  formatShiftLabel,
  type TeamStatusFilter,
  teamStatusOptions,
} from './teamMemberUtils';
import { TeamMemberPortalNav } from './components/TeamMemberPortalNav';

const parseLocalDate = (dateIso: string): Date => {
  const [year, month, day] = dateIso.split('-').map(Number);
  return startOfDay(new Date(year, month - 1, day));
};

const pickDateFnsLocale = (lang: string | undefined): Locale =>
  lang?.startsWith('en') ? enUS : es;

const statusBadgeClass: Record<TeamMemberAssignment['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  declined: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  cancelled: 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
};

export const TeamCalendarPage: React.FC = () => {
  const { t, i18n } = useTranslation(['common']);
  const dfnsLocale = React.useMemo(() => pickDateFnsLocale(i18n.language), [i18n.language]);
  const { data: assignments = [], isLoading, isError, refetch } = useMyAssignments();
  const respondMutation = useRespondAssignment();
  const moneyFormatter = React.useMemo(
    () => new Intl.NumberFormat(i18n.language || 'es-MX', { style: 'currency', currency: 'MXN' }),
    [i18n.language],
  );

  const today = React.useMemo(() => startOfDay(new Date()), []);
  const [currentMonth, setCurrentMonth] = React.useState<Date>(startOfMonth(today));
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(today);
  const [statusFilter, setStatusFilter] = React.useState<TeamStatusFilter>('all');
  const [search, setSearch] = React.useState('');

  const filtered = React.useMemo(
    () => filterAssignments(assignments, statusFilter, search),
    [assignments, statusFilter, search],
  );

  const dayInfoByDate = React.useMemo(() => {
    const map = new Map<string, { dots: TeamMemberAssignment['status'][]; total: number }>();
    filtered.forEach((item) => {
      const existing = map.get(item.event_date) ?? { dots: [], total: 0 };
      existing.total += 1;
      if (!existing.dots.includes(item.status) && existing.dots.length < 3) {
        existing.dots.push(item.status);
      }
      map.set(item.event_date, existing);
    });
    return map;
  }, [filtered]);

  const selectedDayAssignments = React.useMemo(
    () => filtered.filter((item) => selectedDate && isSameDay(parseLocalDate(item.event_date), selectedDate)),
    [filtered, selectedDate],
  );

  const pendingIds = React.useMemo(
    () => new Set(assignments.filter((item) => item.status === 'pending').map((item) => item.event_staff_id)),
    [assignments],
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
        <div className="mx-auto max-w-5xl space-y-6">
          <header className="space-y-3">
            <h1 className="text-2xl font-bold text-text tracking-tight">
              {t('team.calendar_title', { defaultValue: 'Calendario de trabajo' })}
            </h1>
            <p className="text-sm text-text-secondary">
              {t('team.calendar_subtitle', { defaultValue: 'Usá un calendario real para planear tu carga de trabajo.' })}
            </p>
            <TeamMemberPortalNav />
          </header>

          <div className="rounded-2xl border border-border bg-card p-6">
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
            {t('team.calendar_subtitle', { defaultValue: 'Usá un calendario real para planear tu carga de trabajo.' })}
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

            <label className="text-sm text-text-secondary md:col-span-3">
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

        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <section className="rounded-2xl border border-border bg-card p-4">
            <style>{`
              .team-rdp .rdp-day_button {
                position: relative;
              }
              .team-rdp .team-rdp-dot-row {
                position: absolute;
                bottom: 4px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 2px;
              }
              .team-rdp .team-rdp-dot {
                width: 5px;
                height: 5px;
                border-radius: 999px;
              }
            `}</style>

            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
                {format(currentMonth, 'MMMM yyyy', { locale: dfnsLocale })}
              </p>
              <button
                type="button"
                onClick={() => {
                  const now = startOfDay(new Date());
                  setCurrentMonth(startOfMonth(now));
                  setSelectedDate(now);
                }}
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface-alt"
              >
                {t('team.today', { defaultValue: 'Hoy' })}
              </button>
            </div>

            <DayPicker
              mode="single"
              month={currentMonth}
              selected={selectedDate}
              onSelect={setSelectedDate}
              onMonthChange={(month) => setCurrentMonth(startOfMonth(startOfDay(month)))}
              showOutsideDays
              locale={dfnsLocale}
              className="team-rdp"
              components={{
                DayButton: ({ day, children, ...props }) => {
                  const key = format(day.date, 'yyyy-MM-dd');
                  const info = dayInfoByDate.get(key);
                  return (
                    <button {...props}>
                      {children}
                      {info && info.total > 0 ? (
                        <span className="team-rdp-dot-row" aria-hidden="true">
                          {info.dots.map((status, index) => (
                            <span
                              key={`${status}-${index}`}
                              className="team-rdp-dot"
                              style={{
                                backgroundColor:
                                  status === 'pending'
                                    ? '#d97706'
                                    : status === 'confirmed'
                                      ? '#059669'
                                      : status === 'declined'
                                        ? '#e11d48'
                                        : '#64748b',
                              }}
                            />
                          ))}
                        </span>
                      ) : null}
                    </button>
                  );
                },
              }}
            />

            <p className="mt-3 text-xs text-text-secondary">
              {t('team.calendar_legend', {
                defaultValue: 'Puntos por día indican asignaciones (estado filtrado).',
              })}
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
                {selectedDate
                  ? format(selectedDate, 'EEEE d MMMM yyyy', { locale: dfnsLocale })
                  : t('team.select_day', { defaultValue: 'Seleccioná un día' })}
              </h2>
              {selectedDate ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {selectedDayAssignments.length}
                </span>
              ) : null}
            </div>

            {selectedDayAssignments.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-bg px-4 py-8 text-center text-sm text-text-secondary">
                {t('team.calendar_day_empty', { defaultValue: 'No hay asignaciones para este día con los filtros activos.' })}
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayAssignments.map((assignment) => {
                  const shift = formatShiftLabel(assignment, i18n.language, t);
                  const isPending = assignment.status === 'pending';
                  const isBusy = respondMutation.isPending && pendingIds.has(assignment.event_staff_id);

                  return (
                    <article
                      key={assignment.event_staff_id}
                      className="rounded-xl border border-border/70 bg-bg px-3 py-3"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-text">{assignment.event_name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                              {formatEventDate(assignment.event_date, i18n.language)}
                            </span>
                            {shift ? (
                              <span className="inline-flex items-center gap-1">
                                <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                {shift}
                              </span>
                            ) : null}
                            {assignment.fee_amount != null ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                                {t('team.fee', { defaultValue: 'Pago' })}: {moneyFormatter.format(assignment.fee_amount)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[assignment.status]}`}>
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

                      {(assignment.role_override || assignment.notes) && (
                        <div className="mt-2 space-y-1 text-xs text-text-secondary">
                          {assignment.role_override ? (
                            <p>
                              <span className="font-medium text-text">{t('team.role', { defaultValue: 'Rol' })}:</span>{' '}
                              {assignment.role_override}
                            </p>
                          ) : null}
                          {assignment.notes ? (
                            <p>
                              <span className="font-medium text-text">{t('team.notes', { defaultValue: 'Notas' })}:</span>{' '}
                              {assignment.notes}
                            </p>
                          ) : null}
                        </div>
                      )}

                      {isPending ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => respondMutation.mutate({ id: assignment.event_staff_id, response: 'accept' })}
                            className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                            {t('team.accept', { defaultValue: 'Aceptar' })}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => respondMutation.mutate({ id: assignment.event_staff_id, response: 'decline' })}
                            className="inline-flex items-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                          >
                            <XCircle className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                            {t('team.decline', { defaultValue: 'Rechazar' })}
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-text-secondary">
            {t('team.calendar_empty', { defaultValue: 'No hay asignaciones para los filtros activos.' })}
          </div>
        ) : null}
      </div>
    </div>
  );
};
