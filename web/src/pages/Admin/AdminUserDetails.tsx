import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Calendar,
  Layers,
  Activity,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminUser } from '@/hooks/queries/useAdminQueries';
import { useAdminAuditLogs } from '@/hooks/queries/useActivityQueries';
import { Pagination } from '@/components/Pagination';
import { format, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import clsx from 'clsx';

export const AdminUserDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation(['admin', 'common']);
  const dateLocale = i18n.language === 'es' ? es : enUS;

  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: user, isLoading: loadingUser, error: userError, refetch: refetchUser } = useAdminUser(id || '');
  const { data: auditResponse, isLoading: loadingAudit, error: auditError, refetch: refetchAudit } = useAdminAuditLogs(page, limit, id);

  const handleReload = () => {
    refetchUser();
    refetchAudit();
  };

  const loading = loadingUser || loadingAudit;
  const error = userError || auditError ? t('admin:users.details.error_loading') : null;

  const activityScore = user
    ? user.events_count + user.clients_count + user.products_count
    : 0;

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      user: 'bg-info/10 text-info border-info/20',
      team_member: 'bg-success/10 text-success border-success/20',
      assistant: 'bg-warning/10 text-warning border-warning/20',
      admin: 'bg-error/10 text-error border-error/20',
    };
    const labels: Record<string, string> = {
      user: t('admin:users.roles.user'),
      team_member: t('admin:users.roles.team_member'),
      assistant: t('admin:users.roles.assistant'),
      admin: t('admin:users.roles.admin'),
    };
    return (
      <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider', styles[role] || styles.user)}>
        {labels[role] || role}
      </span>
    );
  };

  const getActionStyles = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('create') || act.includes('add') || act.includes('register')) {
      return { iconBg: 'bg-success/10 text-success border-success/20', lineBg: 'bg-success/20' };
    }
    if (act.includes('delete') || act.includes('remove') || act.includes('block')) {
      return { iconBg: 'bg-error/10 text-error border-error/20', lineBg: 'bg-error/20' };
    }
    if (act.includes('update') || act.includes('edit') || act.includes('upgrade')) {
      return { iconBg: 'bg-warning/10 text-warning border-warning/20', lineBg: 'bg-warning/20' };
    }
    return { iconBg: 'bg-info/10 text-info border-info/20', lineBg: 'bg-info/20' };
  };

  // Safe paginated logs access
  const logs = auditResponse?.data || [];
  const totalItems = auditResponse?.total || 0;
  const totalPages = auditResponse?.total_pages || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/users"
            className="p-2 text-text-secondary hover:text-text hover:bg-surface-alt rounded-xl transition-colors"
            aria-label={t('admin:users.actions.back')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="h-10 w-10 bg-linear-to-br from-primary to-primary-light rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">{t('admin:users.details.title')}</h1>
            <p className="text-sm text-text-secondary">
              {user ? `${user.name} · ${user.email}` : loading ? t('admin:users.details.loading') : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReload}
            className="p-2 text-text-secondary hover:text-primary transition-colors"
            aria-label={t('admin:users.actions.reload')}
          >
            <RefreshCw className={clsx('h-5 w-5', loading && 'animate-spin')} aria-hidden="true" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-error/5 border-l-4 border-error p-4 rounded-r-xl" role="alert">
          <p className="text-sm text-error flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </p>
        </div>
      )}

      {loading && !user && (
        <div className="bg-card border border-border rounded-2xl p-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-text-tertiary mx-auto" />
          <p className="text-sm text-text-secondary mt-2">{t('admin:users.details.loading_user')}</p>
        </div>
      )}

      {user && (
        <>
          {/* Overview Profile Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-2xl shadow-sm shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold text-text flex items-center gap-2 flex-wrap">
                  {user.name}
                  {getRoleBadge(user.role)}
                  {user.account_status === 'blocked' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-error/10 text-error border border-error/20 uppercase tracking-wider">
                      {t('admin:users.details.blocked')}
                    </span>
                  )}
                </div>
                <div className="text-sm text-text-secondary">{user.email}</div>
                {user.business_name && (
                  <div className="text-xs text-text-tertiary font-medium">{t('admin:users.details.business', { business: user.business_name })}</div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="font-semibold text-text">{t('admin:users.details.plan_label')}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/25">
                  {user.plan === 'premium' ? t('admin:users.filters.pro') : user.plan === 'pro' ? t('admin:users.filters.pro') : t('admin:users.filters.basic')}
                </span>
                {user.plan_expires_at && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-warning/10 text-warning border border-warning/20">
                    {t('admin:users.details.gift')}
                  </span>
                )}
              </div>
              <div className="text-xs text-text-tertiary">
                {t('admin:users.details.created_at', { date: format(parseISO(user.created_at), 'd MMM yyyy', { locale: dateLocale }) })}
              </div>
            </div>
          </div>

          {/* Adoption Metrics Section */}
          <div>
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest block mb-4">
              {t('admin:users.details.adoption_metrics')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: t('admin:users.details.metric_events'), value: user.events_count, icon: Calendar, color: 'text-info bg-info/10 border-info/20' },
                { label: t('admin:users.details.metric_clients'), value: user.clients_count, icon: Users, color: 'text-success bg-success/10 border-success/20' },
                { label: t('admin:users.details.metric_products'), value: user.products_count, icon: Layers, color: 'text-warning bg-warning/10 border-warning/20' },
                { label: t('admin:users.details.metric_activity'), value: activityScore, icon: Activity, color: 'text-primary bg-primary/10 border-primary/20 font-extrabold' }
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{card.label}</span>
                      <div className={clsx('h-8 w-8 rounded-xl flex items-center justify-center border shrink-0', card.color)}>
                        <Icon className="h-4.5 w-4.5" />
                      </div>
                    </div>
                    <p className="text-3xl font-extrabold text-text tracking-tight">{card.value}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Audit Timeline Section without PII */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest block">
              {t('admin:users.details.timeline_title')}
            </h2>
            
            {loadingAudit && (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <RefreshCw className="h-6 w-6 animate-spin text-text-tertiary mx-auto" />
                <p className="text-xs text-text-secondary mt-2">{t('admin:users.details.updating_timeline')}</p>
              </div>
            )}

            {!loadingAudit && logs.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-12 text-center">
                <Clock className="h-10 w-10 text-text-tertiary mx-auto mb-2" />
                <p className="text-sm text-text-secondary">{t('admin:users.details.no_activity')}</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs">
                <div className="p-6">
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {logs.map((log: any, logIdx: number) => {
                        const style = getActionStyles(log.action);
                        const Icon = log.action.toLowerCase().includes('delete')
                          ? AlertTriangle
                          : log.action.toLowerCase().includes('create')
                            ? CheckCircle
                            : Clock;

                        return (
                          <li key={log.id}>
                            <div className="relative pb-8">
                              {logIdx !== logs.length - 1 && (
                                <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
                              )}
                              <div className="relative flex space-x-3">
                                <div>
                                  <span className={clsx(
                                    'h-10 w-10 rounded-xl flex items-center justify-center border shrink-0',
                                    style.iconBg
                                  )}>
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0 pt-1.5">
                                  <div className="text-sm font-semibold text-text">
                                    {log.details || `${log.action} ${log.resource_type}`}
                                  </div>
                                  <div className="text-xs text-text-secondary mt-1 flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium bg-surface-alt px-2 py-0.5 rounded-md border border-border/60">
                                      {t('admin:users.details.resource_type', { type: log.resource_type })}
                                    </span>
                                    <span>·</span>
                                    <span>{t('admin:users.details.action_type', { action: log.action })}</span>
                                    <span>·</span>
                                    <span>
                                      {format(parseISO(log.created_at), 'd MMM yyyy, HH:mm', { locale: dateLocale })}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  totalItems={totalItems}
                  itemsPerPage={limit}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
