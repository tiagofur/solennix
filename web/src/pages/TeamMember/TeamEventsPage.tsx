import React from 'react';
import { BellDot, CalendarDays, Clock3, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMarkMyTimelineRead, useMyAssignments, useMyTimeline, useRespondAssignment } from '@/hooks/queries/useStaffQueries';
import { useCreateUnavailableDates, useDeleteUnavailableDate, useUnavailableDatesByRange, useUpdateUnavailableDate } from '@/hooks/queries/useUnavailableDatesQueries';
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
  const navigate = useNavigate();
  const { data: assignments = [], isLoading, isError, refetch } = useMyAssignments();
  const { data: timeline = [] } = useMyTimeline(false, 8);
  const respondMutation = useRespondAssignment();
  const markTimelineRead = useMarkMyTimelineRead();
  const createUnavailableDate = useCreateUnavailableDates();
  const updateUnavailableDate = useUpdateUnavailableDate();
  const deleteUnavailableDate = useDeleteUnavailableDate();
  const moneyFormatter = React.useMemo(
    () => new Intl.NumberFormat(i18n.language || 'es-MX', { style: 'currency', currency: 'MXN' }),
    [i18n.language],
  );

  const [statusFilter, setStatusFilter] = React.useState<TeamStatusFilter>('all');
  const [search, setSearch] = React.useState('');
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [availabilityStart, setAvailabilityStart] = React.useState('');
  const [availabilityEnd, setAvailabilityEnd] = React.useState('');
  const [availabilityStartTime, setAvailabilityStartTime] = React.useState('');
  const [availabilityEndTime, setAvailabilityEndTime] = React.useState('');
  const [availabilityReason, setAvailabilityReason] = React.useState('');
  const [editingUnavailableId, setEditingUnavailableId] = React.useState<string | null>(null);

  const availabilityRange = React.useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear() - 1, 0, 1).toISOString().slice(0, 10);
    const end = new Date(now.getFullYear() + 1, 11, 31).toISOString().slice(0, 10);
    return { start, end };
  }, []);
  const { data: unavailableDates = [] } = useUnavailableDatesByRange(availabilityRange.start, availabilityRange.end);

  const filtered = React.useMemo(
    () => filterAssignments(assignments, statusFilter, search, fromDate || undefined, toDate || undefined),
    [assignments, statusFilter, search, fromDate, toDate],
  );

  const pendingAssignments = React.useMemo(
    () => assignments.filter((item) => item.status === 'pending'),
    [assignments],
  );

  const todayIso = React.useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const todayAssignments = React.useMemo(
    () => assignments.filter((item) => item.event_date === todayIso),
    [assignments, todayIso],
  );

  const next7Assignments = React.useMemo(() => {
    const todayDate = new Date(`${todayIso}T00:00:00`);
    return assignments
      .filter((item) => {
        const eventDate = new Date(`${item.event_date}T00:00:00`);
        const diffDays = Math.floor((eventDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays >= 1 && diffDays <= 7;
      })
      .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.event_name.localeCompare(b.event_name));
  }, [assignments, todayIso]);

  const goToTodayAgenda = () => {
    navigate('/team/calendar');
  };

  const reviewAssignments = () => {
    setStatusFilter('pending');
    setSearch('');
    setFromDate('');
    setToDate('');
    document.getElementById('team-pending-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const timelineLabel = (changeType: string) => {
    switch (changeType) {
      case 'location_changed':
        return t('team.timeline.location_changed', { defaultValue: 'Cambio de ubicación' });
      case 'role_changed':
        return t('team.timeline.role_changed', { defaultValue: 'Cambio de rol' });
      case 'shift_changed':
        return t('team.timeline.shift_changed', { defaultValue: 'Cambio de turno' });
      case 'status_changed':
        return t('team.timeline.status_changed', { defaultValue: 'Cambio de estado' });
      case 'assignment_added':
        return t('team.timeline.assignment_added', { defaultValue: 'Nueva asignación' });
      case 'assignment_removed':
        return t('team.timeline.assignment_removed', { defaultValue: 'Asignación removida' });
      default:
        return t('team.timeline.updated', { defaultValue: 'Actualización de asignación' });
    }
  };

  const openTimelineEvent = (changeId: string, eventStaffId: string, readAt?: string | null) => {
    if (!readAt) {
      markTimelineRead.mutate([changeId]);
    }
    navigate(`/team/calendar?eventStaffId=${encodeURIComponent(eventStaffId)}`);
  };

  const handleAvailabilitySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!availabilityStart || !availabilityEnd) {
      return;
    }
    const payload = {
      start_date: availabilityStart,
      end_date: availabilityEnd,
      start_time: availabilityStartTime || undefined,
      end_time: availabilityEndTime || undefined,
      reason: availabilityReason.trim() || undefined,
    };

    const onSuccess = () => {
      setAvailabilityStart('');
      setAvailabilityEnd('');
      setAvailabilityStartTime('');
      setAvailabilityEndTime('');
      setAvailabilityReason('');
      setEditingUnavailableId(null);
    };

    if (editingUnavailableId) {
      updateUnavailableDate.mutate({ id: editingUnavailableId, data: payload }, { onSuccess });
      return;
    }

    createUnavailableDate.mutate(payload, { onSuccess });
  };

  const startEditingAvailability = (item: { id: string; start_date: string; end_date: string; start_time?: string | null; end_time?: string | null; reason?: string }) => {
    setEditingUnavailableId(item.id);
    setAvailabilityStart(item.start_date);
    setAvailabilityEnd(item.end_date);
    setAvailabilityStartTime(item.start_time ?? '');
    setAvailabilityEndTime(item.end_time ?? '');
    setAvailabilityReason(item.reason ?? '');
  };

  const cancelEditingAvailability = () => {
    setEditingUnavailableId(null);
    setAvailabilityStart('');
    setAvailabilityEnd('');
    setAvailabilityStartTime('');
    setAvailabilityEndTime('');
    setAvailabilityReason('');
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
              {t('team.work_title', { defaultValue: 'Mi jornada' })}
            </h1>
            <p className="text-sm text-text-secondary">
              {t('team.work_subtitle', {
                defaultValue: 'Respondé pendientes y revisá toda tu agenda en una sola pantalla.',
              })}
            </p>
            <TeamMemberPortalNav />
          </header>

          <div className="rounded-2xl border border-border bg-card p-6">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-3">
          <h1 className="text-2xl font-bold text-text tracking-tight">
            {t('team.work_title', { defaultValue: 'Mi jornada' })}
          </h1>
          <p className="text-sm text-text-secondary">
            {t('team.work_subtitle', {
              defaultValue: 'Respondé pendientes y revisá toda tu agenda en una sola pantalla.',
            })}
          </p>
          <TeamMemberPortalNav />
        </header>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={goToTodayAgenda}
              className="inline-flex items-center rounded-xl border border-border bg-surface-alt px-4 py-2 text-sm font-medium text-text hover:bg-card"
            >
              {t('team.cta_today_agenda', { defaultValue: 'Ir a agenda de hoy' })}
            </button>
            <button
              type="button"
              onClick={reviewAssignments}
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              {t('team.cta_review_assignments', { defaultValue: 'Responder asignaciones' })}
            </button>
          </div>

          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
            {t('team.today_section_title', { defaultValue: 'Hoy' })}
          </h2>

          {todayAssignments.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">
              {t('team.today_empty', { defaultValue: 'No tenés asignaciones para hoy.' })}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {todayAssignments.map((assignment) => {
                const shift = formatShiftLabel(assignment, i18n.language, t);
                return (
                  <article
                    key={`today-${assignment.event_staff_id}`}
                    className="rounded-xl border border-border/70 bg-bg px-3 py-3"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-text">{assignment.event_name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
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
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-text-secondary">
            {t('team.next7_section_title', { defaultValue: 'Próximos 7 días' })}
          </h2>

          {next7Assignments.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">
              {t('team.next7_empty', { defaultValue: 'No hay asignaciones en los próximos 7 días.' })}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {next7Assignments.map((assignment) => {
                const shift = formatShiftLabel(assignment, i18n.language, t);
                return (
                  <article
                    key={`next7-${assignment.event_staff_id}`}
                    className="rounded-xl border border-border/70 bg-bg px-3 py-3"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-text">{assignment.event_name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
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
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="team-pending-section" className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              {t('team.pending_section_title', { defaultValue: 'Pendientes por responder' })}
            </h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              {pendingAssignments.length}
            </span>
          </div>

          {pendingAssignments.length === 0 ? (
            <p className="mt-3 text-sm text-text-secondary">
              {t('team.pending_empty', { defaultValue: 'No tenés invitaciones pendientes.' })}
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {pendingAssignments.map((assignment) => {
                const shift = formatShiftLabel(assignment, i18n.language, t);
                const isBusy = respondMutation.isPending;
                return (
                  <article
                    key={`pending-${assignment.event_staff_id}`}
                    className="rounded-xl border border-border/70 bg-bg px-3 py-3"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-text">{assignment.event_name}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-text-secondary">
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
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => respondMutation.mutate({ id: assignment.event_staff_id, response: 'accept' })}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {t('team.accept', { defaultValue: 'Aceptar' })}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => respondMutation.mutate({ id: assignment.event_staff_id, response: 'decline' })}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                        >
                          {t('team.decline', { defaultValue: 'Rechazar' })}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-secondary">
              {t('team.timeline.title', { defaultValue: 'Cambios recientes' })}
            </h2>
            <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-text-secondary">
              {timeline.filter((item) => !item.read_at).length}
            </span>
          </div>

          {timeline.length === 0 ? (
            <p className="text-sm text-text-secondary">
              {t('team.timeline.empty', { defaultValue: 'Sin cambios recientes en tus asignaciones.' })}
            </p>
          ) : (
            <div className="space-y-2">
              {timeline.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openTimelineEvent(item.id, item.event_staff_id, item.read_at)}
                  className="w-full rounded-xl border border-border/70 bg-bg px-3 py-3 text-left hover:border-border"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text">{item.event_name}</p>
                      <p className="text-xs text-text-secondary">
                        {timelineLabel(item.change_type)}
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        {formatEventDate(item.event_date, i18n.language)}
                      </p>
                    </div>
                    {!item.read_at ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        <BellDot className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('team.timeline.unread', { defaultValue: 'Nuevo' })}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
            {t('team.availability.title', { defaultValue: 'Mi disponibilidad' })}
          </h2>

          <form onSubmit={handleAvailabilitySubmit} className="grid gap-3 md:grid-cols-6">
            <label className="text-sm text-text-secondary">
              {t('team.availability.from', { defaultValue: 'Desde' })}
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"
                value={availabilityStart}
                onChange={(e) => setAvailabilityStart(e.target.value)}
                required
              />
            </label>
            <label className="text-sm text-text-secondary">
              {t('team.availability.to', { defaultValue: 'Hasta' })}
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"
                value={availabilityEnd}
                onChange={(e) => setAvailabilityEnd(e.target.value)}
                required
              />
            </label>
            <label className="text-sm text-text-secondary">
              {t('team.availability.start_time', { defaultValue: 'Hora inicio' })}
              <input
                type="time"
                className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"
                value={availabilityStartTime}
                onChange={(e) => setAvailabilityStartTime(e.target.value)}
              />
            </label>
            <label className="text-sm text-text-secondary">
              {t('team.availability.end_time', { defaultValue: 'Hora fin' })}
              <input
                type="time"
                className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"
                value={availabilityEndTime}
                onChange={(e) => setAvailabilityEndTime(e.target.value)}
              />
            </label>
            <label className="text-sm text-text-secondary md:col-span-2">
              {t('team.availability.reason', { defaultValue: 'Motivo (opcional)' })}
              <input
                type="text"
                className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"
                value={availabilityReason}
                onChange={(e) => setAvailabilityReason(e.target.value)}
                placeholder={t('team.availability.reason_placeholder', { defaultValue: 'Viaje, descanso, etc.' })}
              />
            </label>
            <div className="md:col-span-4">
              <button
                type="submit"
                disabled={createUnavailableDate.isPending || updateUnavailableDate.isPending}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {editingUnavailableId
                  ? t('team.availability.save_changes', { defaultValue: 'Guardar cambios' })
                  : t('team.availability.block_dates', { defaultValue: 'Bloquear fechas' })}
              </button>
              {editingUnavailableId ? (
                <button
                  type="button"
                  onClick={cancelEditingAvailability}
                  className="ml-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-alt"
                >
                  {t('common:actions.cancel', { defaultValue: 'Cancelar' })}
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-4 space-y-2">
            {unavailableDates.length === 0 ? (
              <p className="text-sm text-text-secondary">
                {t('team.availability.empty', { defaultValue: 'No tenés bloqueos cargados.' })}
              </p>
            ) : (
              unavailableDates
                .slice()
                .sort((a, b) => a.start_date.localeCompare(b.start_date))
                .map((item) => (
                  <article key={item.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-bg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-text">
                        {formatEventDate(item.start_date, i18n.language)} - {formatEventDate(item.end_date, i18n.language)}
                      </p>
                      {item.start_time && item.end_time ? (
                        <p className="text-xs text-text-secondary">
                          {item.start_time} - {item.end_time}
                        </p>
                      ) : null}
                      {item.reason ? <p className="text-xs text-text-secondary">{item.reason}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditingAvailability(item)}
                        className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-secondary hover:bg-surface-alt"
                      >
                        {t('team.availability.edit', { defaultValue: 'Editar' })}
                      </button>
                      <button
                        type="button"
                        disabled={deleteUnavailableDate.isPending}
                        onClick={() => deleteUnavailableDate.mutate(item.id)}
                        className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-secondary hover:bg-surface-alt disabled:opacity-60"
                      >
                        {t('team.availability.remove', { defaultValue: 'Eliminar' })}
                      </button>
                    </div>
                  </article>
                ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
            {t('team.agenda_section_title', { defaultValue: 'Mi agenda' })}
          </h2>
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
            {t('team.agenda_empty', { defaultValue: 'No hay asignaciones para los filtros actuales.' })}
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
