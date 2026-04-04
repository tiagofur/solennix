import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  ArrowLeft,
  Shield,
  Crown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Filter,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
  Gift,
  X,
  Calendar,
} from 'lucide-react';
import { adminService, AdminUser } from '@/services/adminService';
import { logError } from '@/lib/errorHandler';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import clsx from 'clsx';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

type PlanFilter = 'all' | 'basic' | 'pro' | 'premium';
type SortField = 'name' | 'plan' | 'activity' | 'created_at';
type SortDir = 'asc' | 'desc';

const SortIcon = ({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) => {
  if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-text-secondary/50 ml-1" />;
  return sortDir === 'asc'
    ? <ArrowUp className="h-3.5 w-3.5 text-primary ml-1" />
    : <ArrowDown className="h-3.5 w-3.5 text-primary ml-1" />;
};

interface GiftState {
  user: AdminUser;
  plan: 'pro' | 'premium';
  expiresAt: string; // YYYY-MM-DD
  noExpiry: boolean;
}

const activityScore = (u: AdminUser) =>
  u.events_count + u.clients_count + u.products_count;

const getActivityBadge = (u: AdminUser) => {
  const score = activityScore(u);
  if (score === 0)
    return { label: 'Sin actividad', cls: 'bg-surface-alt text-text-secondary' };
  if (score <= 5)
    return { label: 'Baja', cls: 'bg-info/10 text-info' };
  if (score <= 20)
    return { label: 'Media', cls: 'bg-warning/10 text-warning' };
  return { label: 'Alta', cls: 'bg-success/10 text-success' };
};

// Returns human-readable expiry label for a gift plan
const getExpiryLabel = (expiresAt: string) => {
  const date = parseISO(expiresAt);
  if (isPast(date)) return { text: 'Expirado', cls: 'text-error', urgent: true };
  const days = differenceInDays(date, new Date());
  if (days === 0) return { text: 'Expira hoy', cls: 'text-warning', urgent: true };
  if (days <= 7) return { text: `Expira en ${days}d`, cls: 'text-warning', urgent: true };
  return {
    text: `Hasta ${format(date, 'd MMM yy', { locale: es })}`,
    cls: 'text-text-secondary',
    urgent: false,
  };
};

// Minimum date for the gift picker (tomorrow)
const minGiftDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [saving, setSaving] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [gift, setGift] = useState<GiftState | null>(null);
  const [downgradeTarget, setDowngradeTarget] = useState<AdminUser | null>(null);
  const { addToast } = useToast();

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getUsers();
      setUsers(data);
    } catch (err) {
      logError('Admin: failed to load users', err);
      setError('Error al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

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

  const handleGiftConfirm = async () => {
    if (!gift!.noExpiry && !gift!.expiresAt) {
      addToast('Selecciona una fecha de vencimiento o marca "Sin vencimiento".', 'error');
      return;
    }

    setSaving(gift!.user.id);
    try {
      const expiresAt = gift!.noExpiry ? null : gift!.expiresAt;
      const updated = await adminService.upgradeUser(gift!.user.id, gift!.plan, expiresAt);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === gift!.user.id
            ? { ...u, plan: updated.plan, plan_expires_at: updated.plan_expires_at }
            : u,
        ),
      );
      const label = gift!.noExpiry
        ? `${gift!.user.name} ahora tiene plan ${gift!.plan} (permanente) ✓`
        : `${gift!.user.name} tiene plan ${gift!.plan} hasta ${format(parseISO(gift!.expiresAt!), 'd MMM yyyy', { locale: es })} ✓`;
      addToast(label, 'success');
      setGift(null);
    } catch (err: unknown) {
      logError('Admin: failed to gift plan', err);
      addToast(err instanceof Error ? err.message : 'Error al asignar el plan.', 'error');
    } finally {
      setSaving(null);
    }
  };

  const handleDowngrade = (user: AdminUser) => {
    setDowngradeTarget(user);
  };

  const handleDowngradeConfirm = async () => {
    if (!downgradeTarget) return;
    const user = downgradeTarget;
    setDowngradeTarget(null);
    setSaving(user.id);
    try {
      const updated = await adminService.upgradeUser(user.id, 'basic', null);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, plan: updated.plan, plan_expires_at: null }
            : u,
        ),
      );
      addToast(`${user.name} ahora tiene plan Basic ✓`, 'success');
    } catch (err: unknown) {
      logError('Admin: failed to downgrade user', err);
      addToast(err instanceof Error ? err.message : 'Error al actualizar el plan.', 'error');
    } finally {
      setSaving(null);
    }
  };

  const exportCSV = () => {
    const headers = ['Nombre', 'Email', 'Negocio', 'Plan', 'Vence', 'Eventos', 'Clientes', 'Productos', 'Actividad Total', 'Registro'];
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
      format(parseISO(u.created_at), 'dd/MM/yyyy', { locale: es }),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`${filteredUsers.length} usuarios exportados`, 'success');
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
    return (
      <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold', styles[plan] || styles.basic)}>
        {(plan === 'pro' || plan === 'premium') && <Crown className="h-3 w-3" />}
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={!!downgradeTarget}
        title="Rebajar plan"
        description={downgradeTarget ? `¿Rebajar a ${downgradeTarget.name} (${downgradeTarget.email}) al plan Basic?` : ''}
        confirmText="Rebajar"
        cancelText="Cancelar"
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
                  <h2 className="text-lg font-bold text-text">Regalar plan</h2>
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
                Plan a regalar
              </label>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/40 bg-primary/10 text-primary text-sm font-semibold">
                <Crown className="h-4 w-4" />
                Pro
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">
                Válido hasta
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
                    Sin vencimiento <span className="text-xs text-text-secondary">(permanente hasta que pague)</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Info note */}
            <div className="bg-warning/5 border border-warning/20 rounded-xl px-4 py-3 text-xs text-warning flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                {gift.noExpiry
                  ? 'Plan permanente hasta que el usuario adquiera una suscripción de pago.'
                  : 'Al vencer, el plan regresa a Basic automáticamente. El usuario deberá suscribirse para continuar.'}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setGift(null)}
                className="flex-1 px-4 py-3 rounded-2xl border border-border text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors"
              >
                Cancelar
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
                Confirmar regalo
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
            aria-label="Volver al panel de admin"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="h-10 w-10 bg-linear-to-br from-info to-info/80 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-info/20">
            <Users className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Gestión de Usuarios</h1>
            <p className="text-sm text-text-secondary">
              {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
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
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={loadUsers}
            className="p-2 text-text-secondary hover:text-primary transition-colors"
            aria-label="Recargar usuarios"
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
            { label: 'Activos (con actividad)', value: users.filter((u) => activityScore(u) > 0).length, cls: 'bg-success/10 text-success border-success/20' },
            { label: 'Sin actividad', value: users.filter((u) => activityScore(u) === 0).length, cls: 'bg-surface-alt text-text-secondary border-border' },
            { label: 'Con suscripción pagada', value: users.filter((u) => u.has_paid_subscription).length, cls: 'bg-primary/10 text-primary border-primary/20' },
            { label: 'Planes regalo activos', value: users.filter((u) => u.plan_expires_at && !isPast(parseISO(u.plan_expires_at))).length, cls: 'bg-warning/10 text-warning border-warning/20' },
          ].map((chip) => (
            <div key={chip.label} className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border', chip.cls)}>
              <span className="font-black text-sm">{chip.value}</span>
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
              placeholder="Buscar por nombre, email o negocio..."
              className="w-full rounded-2xl border-0 bg-surface-alt py-3 pl-12 pr-4 text-sm text-text placeholder-text-tertiary focus:ring-2 focus:ring-primary focus:bg-surface transition-all"
              aria-label="Buscar usuarios"
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
                {filter === 'all' ? 'Todos' : filter.charAt(0).toUpperCase() + filter.slice(1)}{' '}
                <span className="opacity-70">({planCounts[filter]})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card shadow-sm border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border" aria-label="Tabla de usuarios">
            <thead className="bg-surface-alt">
              <tr>
                <th className="px-6 py-4 text-left">
                  <button type="button" onClick={() => handleSort('name')} className="flex items-center text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-text transition-colors">
                    Usuario <SortIcon field="name" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button type="button" onClick={() => handleSort('plan')} className="flex items-center text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-text transition-colors">
                    Plan <SortIcon field="plan" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-6 py-4 text-center text-xs font-medium text-text-secondary uppercase tracking-wider hidden md:table-cell">Eventos</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-text-secondary uppercase tracking-wider hidden md:table-cell">Clientes</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-text-secondary uppercase tracking-wider hidden lg:table-cell">Productos</th>
                <th className="px-6 py-4 text-center hidden lg:table-cell">
                  <button type="button" onClick={() => handleSort('activity')} className="flex items-center mx-auto text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-text transition-colors">
                    Actividad <SortIcon field="activity" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-6 py-4 text-left hidden lg:table-cell">
                  <button type="button" onClick={() => handleSort('created_at')} className="flex items-center text-xs font-medium text-text-secondary uppercase tracking-wider hover:text-text transition-colors">
                    Registro <SortIcon field="created_at" sortField={sortField} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <RefreshCw className="h-8 w-8 animate-spin text-text-tertiary mx-auto" />
                    <p className="text-sm text-text-secondary mt-2">Cargando usuarios...</p>
                  </td>
                </tr>
              ) : sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <Users className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
                    <p className="text-sm text-text-secondary">
                      {searchQuery || planFilter !== 'all'
                        ? 'No se encontraron usuarios con esos filtros.'
                        : 'No hay usuarios registrados aún.'}
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
                                Regalo
                              </span>
                            )}
                          </div>
                          {user.has_paid_subscription && (
                            <span className="text-xs text-success flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Pagado
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
                        {format(parseISO(user.created_at), "d MMM ''yy", { locale: es })}
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
                              Regalar
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
                              Editar regalo
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
                              Rebajar
                            </button>
                          )}

                          {/* Paid subscription: no manual action allowed */}
                          {user.has_paid_subscription && (
                            <span className="text-xs text-text-tertiary italic" title="Suscripción pagada activa — gestionada por el proveedor de pagos">
                              Suscripción activa
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
              Mostrando {sortedUsers.length} de {users.length} usuario{users.length !== 1 ? 's' : ''}
            </span>
            <span>
              Ordenado por{' '}
              <strong className="text-text">
                {sortField === 'name' ? 'nombre' : sortField === 'plan' ? 'plan' : sortField === 'activity' ? 'actividad' : 'registro'}
              </strong>{' '}
              ({sortDir === 'asc' ? '↑ asc' : '↓ desc'})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
