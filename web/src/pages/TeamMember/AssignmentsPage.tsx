import React from 'react';
import { CalendarDays, CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMyAssignments, useRespondAssignment } from '@/hooks/queries/useStaffQueries';
import type { AssignmentStatus } from '@/types/entities';
import { TeamMemberPortalNav } from './components/TeamMemberPortalNav';
import { formatEventDate, formatShiftLabel } from './teamMemberUtils';

const STATUS_STYLES: Record<AssignmentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  declined: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  cancelled: 'bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-200',
};

export const AssignmentsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['common']);
  const { data: assignments = [], isLoading, isError, refetch } = useMyAssignments();
  const respondMutation = useRespondAssignment();
  const moneyFormatter = React.useMemo(
    () => new Intl.NumberFormat(i18n.language || 'es-MX', { style: 'currency', currency: 'MXN' }),
    [i18n.language],
  );

  const pendingIds = new Set(
    assignments.filter((item) => item.status === 'pending').map((item) => item.event_staff_id),
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg px-4 py-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-8 w-52 animate-pulse rounded-xl bg-surface-alt" />
          <div className="h-24 w-full animate-pulse rounded-2xl bg-surface-alt" />
          <div className="h-24 w-full animate-pulse rounded-2xl bg-surface-alt" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-bg px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-text-secondary">
            {t('team.load_error', { defaultValue: 'No pudimos cargar tus asignaciones.' })}
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
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-text tracking-tight">
            {t('team.title', { defaultValue: 'Mis asignaciones' })}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {t('team.subtitle', { defaultValue: 'Aceptá o rechazá invitaciones para participar en eventos.' })}
          </p>
          <div className="mt-3">
            <TeamMemberPortalNav />
          </div>
        </header>

        {assignments.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-text-secondary">
              {t('team.empty', { defaultValue: 'Todavía no tenés asignaciones pendientes.' })}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => {
              const shift = formatShiftLabel(assignment, i18n.language, t);
              const isPending = assignment.status === 'pending';
              const isBusy = respondMutation.isPending && pendingIds.has(assignment.event_staff_id);
              return (
                <article
                  key={assignment.event_staff_id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-text">{assignment.event_name}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-4 w-4" aria-hidden="true" />
                          {formatEventDate(assignment.event_date, i18n.language)}
                        </span>
                        {shift ? <span>{shift}</span> : null}
                        {assignment.fee_amount != null ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            {t('team.fee', { defaultValue: 'Pago' })}: {moneyFormatter.format(assignment.fee_amount)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center self-start rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[assignment.status]}`}
                    >
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
                    <div className="mt-3 space-y-1 text-sm text-text-secondary">
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
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => respondMutation.mutate({ id: assignment.event_staff_id, response: 'accept' })}
                        className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t('team.accept', { defaultValue: 'Aceptar' })}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => respondMutation.mutate({ id: assignment.event_staff_id, response: 'decline' })}
                        className="inline-flex items-center rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                      >
                        <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                        {t('team.decline', { defaultValue: 'Rechazar' })}
                      </button>
                    </div>
                  ) : (
                    <div className="mt-4 inline-flex items-center gap-2 text-xs text-text-secondary">
                      <Clock3 className="h-4 w-4" aria-hidden="true" />
                      {t('team.closed_response', { defaultValue: 'Esta asignación ya no requiere respuesta.' })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
