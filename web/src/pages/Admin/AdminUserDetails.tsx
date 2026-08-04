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
  Clock,
  Smartphone,
  Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAdminUser } from '@/hooks/queries/useAdminQueries';
import { useAdminAuditLogs } from '@/hooks/queries/useActivityQueries';
import { Pagination } from '@/components/Pagination';
import { formatAdminLogAction, formatAdminLogDetails } from '@/lib/adminAuditFormat';
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

  const formatLogAction = (action: string): string => formatAdminLogAction(t, action);
  const formatLogDetails = (details: string | null, action: string, resourceType: string): string =>
    formatAdminLogDetails(t, details, action, resourceType);

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
                <div className="flex items-center gap-1.5 mt-1 text-xs text-text-secondary">
                  <span className="font-semibold">{t('admin:users.details.registered_via', { defaultValue: 'Registro:' })}</span>
                  <span className="bg-surface border border-border px-1.5 py-0.5 rounded text-text font-bold uppercase tracking-wider text-[10px]">
                    {user.registration_platform || 'unknown'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <span className="font-semibold text-text">{t('admin:users.details.plan_label')}</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/25">
                  {user.plan === 'business'
                    ? t('admin:users.filters.business')
                    : user.plan === 'premium' || user.plan === 'pro'
                      ? t('admin:users.filters.pro')
                      : t('admin:users.filters.basic')}
                </span>
                {user.plan_expires_at && (
                  <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-warning/10 text-warning border border-warning/20">
                    {t('admin:users.details.gift')}
                  </span>
                )}
              </div>
              <div className="text-xs text-text-tertiary space-y-0.5">
                <div>
                  {t('admin:users.details.created_at', { date: format(parseISO(user.created_at), 'd MMM yyyy', { locale: dateLocale }) })}
                </div>
                <div>
                  {t('admin:users.details.last_login', {
                    defaultValue: 'Último login: {{date}}',
                    date: user.last_login_at
                      ? format(parseISO(user.last_login_at), 'd MMM yyyy, HH:mm', { locale: dateLocale })
                      : '—',
                  })}
                </div>
                <div>
                  {t('admin:users.details.last_active', {
                    defaultValue: 'Última actividad: {{date}}',
                    date: user.last_active_at
                      ? format(parseISO(user.last_active_at), 'd MMM yyyy, HH:mm', { locale: dateLocale })
                      : '—',
                  })}
                </div>
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

          {/* Platform Usage Details */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-widest block">
              {t('admin:users.details.platform_usage_title', { defaultValue: 'Plataformas de Uso' })}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['web', 'ios', 'android'].map((plat) => {
                const activity = user.platform_activity?.find((p: any) => p.platform === plat);
                const clicks = activity?.interaction_count ?? 0;
                const lastUsed = activity?.last_used_at 
                  ? format(parseISO(activity.last_used_at), 'd MMM yyyy, HH:mm', { locale: dateLocale })
                  : t('admin:users.details.never_used', { defaultValue: 'Sin registros' });

                const PlatformIcon = plat === 'web' ? Globe : Smartphone;
                const platColor = plat === 'web' 
                  ? 'text-primary bg-primary/10 border-primary/20' 
                  : plat === 'ios' 
                    ? 'text-success bg-success/10 border-success/20' 
                    : 'text-info bg-info/10 border-info/20';

                return (
                  <div key={plat} className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4">
                    <div className={clsx('h-12 w-12 rounded-2xl flex items-center justify-center border shrink-0', platColor)}>
                      <PlatformIcon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">{plat.toUpperCase()}</p>
                      <p className="text-lg font-black text-text mt-0.5">{clicks} {t('admin:users.details.interactions_count', { defaultValue: 'interacciones' })}</p>
                      <p className="text-xs text-text-secondary mt-1 truncate">
                        {t('admin:users.details.last_used', { defaultValue: 'Último uso:' })} {lastUsed}
                      </p>
                    </div>
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
                                    {formatLogDetails(log.details, log.action, log.resource_type)}
                                  </div>
                                  <div className="text-xs text-text-secondary mt-1 flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium bg-surface-alt px-2 py-0.5 rounded-md border border-border/60">
                                      {t('admin:users.details.resource_type', { type: log.resource_type })}
                                    </span>
                                    <span>·</span>
                                    <span>{t('admin:users.details.action_type', { action: formatLogAction(log.action) })}</span>
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
