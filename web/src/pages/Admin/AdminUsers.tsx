import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  ArrowLeft, 
  Gift, 
  X, 
  Crown, 
  Calendar, 
  AlertTriangle, 
  Activity, 
  Shield, 
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminUsers, useUpgradeUser } from '@/hooks/queries/useAdminQueries';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { format, parseISO, isPast, differenceInDays } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import clsx from 'clsx';

// ─────────────────────────────────────────────────────────────────────────
// Internal Types & Constants
// ─────────────────────────────────────────────────────────────────────────

type PlanFilter = 'all' | 'basic' | 'pro' | 'premium';
type SortField = 'name' | 'plan' | 'activity' | 'created_at';
type SortDir = 'asc' | 'desc';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  business_name?: string;
  plan: string;
  role: string;
  plan_expires_at?: string;
  has_paid_subscription: boolean;
  events_count: number;
  clients_count: number;
  products_count: number;
  created_at: string;
}

interface GiftState {
  user: AdminUser;
  plan: 'pro' | 'premium';
  expiresAt: string;
  noExpiry: boolean;
}

const minGiftDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const SortIcon = ({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) => {
  if (sortField !== field) return null;
  return sortDir === 'asc' ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />;
};

export const AdminUsers: React.FC = () => {
  const { t, i18n } = useTranslation(['admin', 'common']);
  const dateLocale = i18n.language === 'es' ? es : enUS;
  const qc = useQueryClient();
  const { data: users = [], isLoading: loading, error: usersError } = useAdminUsers();
  const upgradeUser = useUpgradeUser();
  const error = usersError ? t('admin:users.errors.loading') : null;
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [gift, setGift] = useState<GiftState | null>(null);
  const [downgradeTarget, setDowngradeTarget] = useState<AdminUser | null>(null);
  const { addToast } = useToast();

  const activityScore = (u: AdminUser) =>
    u.events_count + u.clients_count + u.products_count;

  const getActivityBadge = (u: AdminUser) => {
    const score = activityScore(u);
    if (score === 0)
      return { label: t('admin:users.table.status.none'), cls: 'bg-surface-alt text-text-secondary' };
    if (score <= 5)
      return { label: t('admin:users.table.status.low'), cls: 'bg-info/10 text-info' };
    if (score <= 20)
      return { label: t('admin:users.table.status.medium'), cls: 'bg-warning/10 text-warning' };
    return { label: t('admin:users.table.status.high'), cls: 'bg-success/10 text-success' };
  };

  // Returns human-readable expiry label for a gift plan
  const getExpiryLabel = (expiresAt: string) => {
    const date = parseISO(expiresAt);
    if (isPast(date)) return { text: t('admin:users.table.expiry.expired'), cls: 'text-error', urgent: true };
    const days = differenceInDays(date, new Date());
    if (days === 0) return { text: t('admin:users.table.expiry.today'), cls: 'text-warning', urgent: true };
    if (days <= 7) return { text: t('admin:users.table.expiry.in_days', { count: days }), cls: 'text-warning', urgent: true };
    return {
      text: t('admin:users.table.expiry.until', { date: format(date, 'd MMM yy', { locale: dateLocale }) }),
      cls: 'text-text-secondary',
      urgent: false,
    };
  };

  const saving = upgradeUser.isPending ? (upgradeUser.variables?.id ?? null) : null;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'created_at' ? 'desc' : 'asc');
    }
  };

  const openGiftDialog = (user: AdminUser) => {
    setGift({
      user,
      plan: 'pro',
      expiresAt: minGiftDate(),
      noExpiry: false,
    });
  };

  const handleGiftConfirm = () => {
    if (!gift!.noExpiry && !gift!.expiresAt) {
      addToast(t('admin:users.gift_dialog.errors.select_date'), 'error');
      return;
    }

    const expiresAt = gift!.noExpiry ? null : gift!.expiresAt;
    const userName = gift!.user.name;
    const plan = gift!.plan;

    upgradeUser.mutate(
      { id: gift!.user.id, plan, expiresAt },
      {
        onSuccess: () => {
          const label = gift!.noExpiry
            ? t('admin:users.gift_dialog.messages.success_permanent', { name: userName, plan })
            : t('admin:users.gift_dialog.messages.success_temporary', { 
                name: userName, 
                plan, 
                date: format(parseISO(gift!.expiresAt!), 'd MMM yyyy', { locale: dateLocale }) 
              });
          addToast(label, 'success');
          setGift(null);
        },
      },
    );
  };

  const handleDowngrade = (user: AdminUser) => {
    setDowngradeTarget(user);
  };

  const handleDowngradeConfirm = () => {
    if (!downgradeTarget) return;
    const user = downgradeTarget;
    setDowngradeTarget(null);
    upgradeUser.mutate(
      { id: user.id, plan: 'basic', expiresAt: null },
      {
        onSuccess: () => addToast(t('admin:users.downgrade_dialog.success', { name: user.name }), 'success'),
      },
    );
  };

  const exportCSV = () => {
    const headers = [
      t('admin:users.csv.headers.name'), 
      t('admin:users.csv.headers.email'), 
      t('admin:users.csv.headers.business'), 
      t('admin:users.csv.headers.plan'), 
      t('admin:users.csv.headers.expires'), 
      t('admin:users.csv.headers.events'), 
      t('admin:users.csv.headers.clients'), 
      t('admin:users.csv.headers.products'), 
      t('admin:users.csv.headers.total_activity'), 
      t('admin:users.csv.headers.registration')
    ];
    const rows = filteredUsers.map((u) => [
      u.name,
      u.email,
      u.business_name || '',
      u.plan,
      u.plan_expires_at ? format(parseISO(u.plan_expires_at), 'dd/MM/yyyy') : '',
      u.events_count,
      u.clients_count,
      u.products_count,
      activityScore(u),
      format(parseISO(u.created_at), 'dd/MM/yyyy', { locale: dateLocale }),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(t('admin:users.csv.success', { count: filteredUsers.length }), 'success');
  };

  // Filter
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === '' ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.business_name &&
        user.business_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesPlan = planFilter === 'all' || user.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  // Sort
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;
    switch (sortField) {
      case 'name':      aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
      case 'plan':      aVal = a.plan; bVal = b.plan; break;
      case 'activity':  aVal = activityScore(a); bVal = activityScore(b); break;
      case 'created_at':
      default:          aVal = a.created_at; bVal = b.created_at;
    }
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const planCounts = {
    all: users.length,
    basic: users.filter((u) => u.plan === 'basic').length,
    pro: users.filter((u) => u.plan === 'pro').length,
    premium: users.filter((u) => u.plan === 'premium').length,
  };

  const getPlanBadge = (plan: string) => {
    const styles: Record<string, string> = {
      basic: 'bg-surface-alt text-text-secondary',
      pro: 'bg-primary/10 text-primary',
      premium: 'bg-primary/15 text-primary-dark',
    };
    const labels: Record<string, string> = {
      basic: t('admin:users.filters.basic'),
      pro: t('admin:users.filters.pro'),
      premium: t('admin:users.filters.pro'), // Display as Pro
    };
    return (
      <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold', styles[plan] || styles.basic)}>
        {(plan === 'pro' || plan === 'premium') && <Crown className="h-3 w-3" />}
        {labels[plan] || plan}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={!!downgradeTarget}
        title={t('admin:users.downgrade_dialog.title')}
        description={downgradeTarget ? t('admin:users.downgrade_dialog.description', { name: downgradeTarget.name, email: downgradeTarget.email }) : ''}
        confirmText={t('admin:users.downgrade_dialog.confirm')}
        cancelText={t('admin:users.downgrade_dialog.cancel')}
        onConfirm={handleDowngradeConfirm}
        onCancel={() => setDowngradeTarget(null)}
      />

      {/* Gift Plan Dialog */}
      {gift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-md p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-text">{t('admin:users.gift_dialog.title')}</h2>
                  <p className="text-sm text-text-secondary">{gift.user.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGift(null)}
                className="p-2 rounded-xl hover:bg-surface-alt text-text-secondary transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Plan a regalar (Hardcoded) */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">
                {t('admin:users.gift_dialog.plan_to_gift')}
              </label>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/40 bg-primary/10 text-primary text-sm font-semibold">
                <Crown className="h-4 w-4" />
                {t('admin:users.filters.pro')}
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">
                {t('admin:users.gift_dialog.valid_until')}
              </label>
              <div className="space-y-3">
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <input
                    type="date"
                    value={gift.expiresAt}
                    min={minGiftDate()}
                    disabled={gift.noExpiry}
                    onChange={(e) => setGift({ ...gift, expiresAt: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-border bg-surface-alt text-sm text-text focus:ring-2 focus:ring-primary focus:bg-card transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gift.noExpiry}
                    onChange={(e) => setGift({ ...gift, noExpiry: e.target.checked })}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm text-text-secondary">
                    {t('admin:users.gift_dialog.no_expiry')} <span className="text-xs text-text-secondary">{t('admin:users.gift_dialog.no_expiry_help')}</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Info note */}
            <div className="bg-warning/5 border border-warning/20 rounded-xl px-4 py-3 text-xs text-warning flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {gift.noExpiry
                  ? t('admin:users.gift_dialog.info_permanent')
                  : t('admin:users.gift_dialog.info_temporary')}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setGift(null)}
                className="flex-1 px-4 py-3 rounded-2xl border border-border text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors"
              >
                {t('admin:users.gift_dialog.cancel')}
              </button>
              <button
                type="button"
                onClick={handleGiftConfirm}
                disabled={saving === gift.user.id}
                className="flex-1 px-4 py-3 rounded-2xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving === gift.user.id ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="h-4 w-4" />
                )}
                {t('admin:users.gift_dialog.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-2 text-text-secondary hover:text-text hover:bg-surface-alt rounded-xl transition-colors"
            aria-label={t('admin:users.actions.back')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="h-10 w-10 bg-linear-to-br from-info to-info/80 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-info/20">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">{t('admin:users.title')}</h1>
            <p className="text-sm text-text-secondary">
              {t('admin:users.summary', { count: users.length })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            disabled={loading || filteredUsers.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-border bg-card text-text-secondary hover:bg-surface-alt hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            {t('admin:users.actions.export_csv')}
          </button>
          <button
            type="button"
            onClick={() => qc.invalidateQueries({ queryKey: queryKeys.admin.users })}
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

      {/* Stats chips */}
      {!loading && users.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {[
            { label: t('admin:users.stats.active'), value: users.filter((u) => activityScore(u) > 0).length, cls: 'bg-success/10 text-success border-success/20' },
            { label: t('admin:users.stats.no_activity'), value: users.filter((u) => activityScore(u) === 0).length, cls: 'bg-surface-alt text-text-secondary border-border' },
            { label: t('admin:users.stats.paid_sub'), value: users.filter((u) => u.has_paid_subscription).length, cls: 'bg-primary/10 text-primary border-primary/20' },
            { label: t('admin:users.stats.gifted_plans'), value: users.filter((u) => u.plan_expires_at && !isPast(parseISO(u.plan_expires_at))).length, cls: 'bg-warning/10 text-warning border-warning/20' },
          ].map((chip) => (
            <div key={chip.label} className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border', chip.cls)}>
              <span className="font-bold text-sm">{chip.value}</span>
              {chip.label}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-card shadow-sm border border-border rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('admin:users.filters.search_placeholder')}
              className="w-full rounded-2xl border-0 bg-surface-alt py-3 pl-12 pr-4 text-sm text-text placeholder-text-tertiary focus:ring-2 focus:ring-primary focus:bg-surface transition-all"
              aria-label={t('admin:users.filters.search_placeholder')}
            />
          </div>
          <div className="flex items-center gap-1 bg-surface-alt rounded-2xl p-1">
            <Filter className="h-4 w-4 text-text-secondary ml-2 mr-1" aria-hidden="true" />
            {(['all', 'basic', 'pro', 'premium'] as PlanFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setPlanFilter(filter)}
                className={clsx(
                  'px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                  planFilter === filter
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text hover:bg-surface',
                )}
              >
                {filter === 'all' ? t('admin:users.filters.all') : filter === 'basic' ? t('admin:users.filters.basic') : filter === 'pro' ? t('admin:users.filters.pro') : t('admin:users.filters.pro')}{' '}
                <span className="opacity-70">({planCounts[filter]})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card shadow-sm border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border" aria-label={t('admin:users.title')}>
            <thead className="bg-surface-alt">
              <tr>
                <th className="px-6 py-4 text-left">
                  <button type="button" onClick={() => handleSort('name')} className="flex items-center text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-text transition-colors">
                    {t('admin:users.table.user')} <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button type="button" onClick={() => handleSort('plan')} className="flex items-center text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-text transition-colors">
                    {t('admin:users.table.plan')} <SortIcon field="plan" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-text-secondary uppercase tracking-wider hidden md:table-cell">{t('admin:users.table.events')}</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-text-secondary uppercase tracking-wider hidden md:table-cell">{t('admin:users.table.clients')}</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-text-secondary uppercase tracking-wider hidden lg:table-cell">{t('admin:users.table.products')}</th>
                <th className="px-6 py-4 text-center hidden lg:table-cell">
                  <button type="button" onClick={() => handleSort('activity')} className="flex items-center mx-auto text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-text transition-colors">
                    {t('admin:users.table.activity')} <SortIcon field="activity" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-6 py-4 text-left hidden lg:table-cell">
                  <button type="button" onClick={() => handleSort('created_at')} className="flex items-center text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-text transition-colors">
                    {t('admin:users.table.created_at')} <SortIcon field="created_at" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">{t('admin:users.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-text-tertiary mx-auto" />
                    <p className="text-sm text-text-secondary mt-2">{t('admin:users.table.loading')}</p>
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Users className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
                    <p className="text-sm text-text-secondary">
                      {searchQuery || planFilter !== 'all'
                        ? t('admin:users.table.no_results')
                        : t('admin:users.table.no_users')}
                    </p>
                  </td>
                </tr>
              ) : (
                sortedUsers.map((user) => {
                  const badge = getActivityBadge(user);
                  const score = activityScore(user);
                  const isGifted = !!user.plan_expires_at && !user.has_paid_subscription;
                  const expiry = isGifted ? getExpiryLabel(user.plan_expires_at!) : null;

                  return (
                    <tr key={user.id} className="hover:bg-surface-alt/50 transition-colors">
                      {/* User info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-linear-to-br from-primary to-primary-light flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-text truncate flex items-center gap-1.5">
                              {user.name}
                              {user.role === 'admin' && (
                                <Shield className="h-3.5 w-3.5 text-error shrink-0" aria-label="Admin" />
                              )}
                            </div>
                            <div className="text-xs text-text-secondary truncate">{user.email}</div>
                            {user.business_name && (
                              <div className="text-xs text-text-tertiary truncate">{user.business_name}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <div className="flex items-center gap-1.5">
                            {getPlanBadge(user.plan)}
                            {isGifted && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-medium bg-warning/10 text-warning border border-warning/20">
                                <Gift className="h-3 w-3" />
                                {t('admin:users.table.gift')}
                              </span>
                            )}
                          </div>
                          {user.has_paid_subscription && (
                            <span className="text-xs text-success flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> {t('admin:users.table.paid')}
                            </span>
                          )}
                          {expiry && (
                            <span className={clsx('text-xs flex items-center gap-1', expiry.cls)}>
                              <Calendar className="h-3 w-3" />
                              {expiry.text}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Counts */}
                      <td className="px-6 py-4 text-center text-sm font-medium text-text hidden md:table-cell">{user.events_count}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-text hidden md:table-cell">{user.clients_count}</td>
                      <td className="px-6 py-4 text-center text-sm font-medium text-text hidden lg:table-cell">{user.products_count}</td>

                      {/* Activity */}
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex flex-col items-center gap-1">
                          <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold', badge.cls)}>
                            <Activity className="h-3 w-3" />
                            {badge.label}
                          </span>
                          {score > 0 && <span className="text-xs text-text-secondary">{score} pts</span>}
                        </div>
                      </td>

                      {/* Created at */}
                      <td className="px-6 py-4 text-sm text-text-secondary hidden lg:table-cell whitespace-nowrap">
                        {format(parseISO(user.created_at), "d MMM ''yy", { locale: dateLocale })}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Gift button: for basic users, or gifted users without paid sub */}
                          {!user.has_paid_subscription && user.plan === 'basic' && (
                            <button
                              type="button"
                              onClick={() => openGiftDialog(user)}
                              disabled={saving === user.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Regalar plan Pro o Premium con fecha de vencimiento"
                            >
                              {saving === user.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Gift className="h-3 w-3" />}
                              {t('admin:users.actions.gift')}
                            </button>
                          )}

                          {/* Extend/change gift for users already on a gifted plan */}
                          {!user.has_paid_subscription && (user.plan === 'pro' || user.plan === 'premium') && isGifted && (
                            <button
                              type="button"
                              onClick={() => openGiftDialog(user)}
                              disabled={saving === user.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-warning/10 text-warning hover:bg-warning hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Extender o cambiar el regalo"
                            >
                              {saving === user.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Gift className="h-3 w-3" />}
                              {t('admin:users.actions.edit_gift')}
                            </button>
                          )}

                          {/* Downgrade: only for gifted or permanent manual upgrades without paid sub */}
                          {!user.has_paid_subscription && (user.plan === 'pro' || user.plan === 'premium') && (
                            <button
                              type="button"
                              onClick={() => handleDowngrade(user)}
                              disabled={saving === user.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-alt text-text-secondary hover:bg-border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {saving === user.id && <RefreshCw className="h-3 w-3 animate-spin" />}
                              {t('admin:users.actions.downgrade')}
                            </button>
                          )}

                          {/* Paid subscription: no manual action allowed */}
                          {user.has_paid_subscription && (
                            <span className="text-xs text-text-tertiary italic" title={t('admin:users.actions.active_sub_help')}>
                              {t('admin:users.actions.active_sub')}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && sortedUsers.length > 0 && (
          <div className="px-6 py-3 bg-surface-alt border-t border-border flex items-center justify-between text-xs text-text-secondary">
            <span>
              {t('admin:users.table.footer.showing', { count: sortedUsers.length, filtered: sortedUsers.length, total: users.length })}
            </span>
            <span>
              {t('admin:users.table.footer.sorted_by')}{' '}
              <strong className="text-text">
                {sortField === 'name' ? t('admin:users.table.footer.fields.name') : sortField === 'plan' ? t('admin:users.table.footer.fields.plan') : sortField === 'activity' ? t('admin:users.table.footer.fields.activity') : t('admin:users.table.footer.fields.created_at')}
              </strong>{' '}
              ({sortDir === 'asc' ? '↑ asc' : '↓ desc'})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
