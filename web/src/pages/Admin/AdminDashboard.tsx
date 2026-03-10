import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Calendar,
  ShoppingBag,
  UserPlus,
  CreditCard,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Shield,
  ArrowRight,
  Crown,
  Activity,
  Percent,
  XCircle,
} from "lucide-react";
import {
  adminService,
  PlatformStats,
  SubscriptionOverview,
  AdminUser,
} from "@/services/adminService";
import { logError } from "@/lib/errorHandler";
import clsx from "clsx";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [subs, setSubs] = useState<SubscriptionOverview | null>(null);
  const [topUsers, setTopUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, subsData, usersData] = await Promise.all([
        adminService.getStats(),
        adminService.getSubscriptions(),
        adminService.getUsers(),
      ]);
      setStats(statsData);
      setSubs(subsData);
      const sorted = [...(usersData || [])].sort(
        (a, b) =>
          b.events_count +
          b.clients_count +
          b.products_count -
          (a.events_count + a.clients_count + a.products_count),
      );
      setTopUsers(sorted.slice(0, 5));
    } catch (err) {
      logError("Admin: failed to load stats", err);
      setError("Error al cargar las estadísticas. Intenta recargar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Derived metrics
  const paidUsers = (stats?.pro_users ?? 0) + (stats?.premium_users ?? 0);
  const conversionRate =
    stats && stats.total_users > 0
      ? ((paidUsers / stats.total_users) * 100).toFixed(1)
      : "0.0";
  const avgEventsPerUser =
    stats && stats.total_users > 0
      ? (stats.total_events / stats.total_users).toFixed(1)
      : "0.0";
  const churnRate =
    subs && subs.total_active + subs.total_canceled > 0
      ? (
          (subs.total_canceled / (subs.total_active + subs.total_canceled)) *
          100
        ).toFixed(1)
      : "0.0";

  const planDistribution = stats
    ? [
        {
          name: "Basic",
          value: stats.basic_users,
          color: "var(--color-text-tertiary)",
        },
        { name: "Pro", value: stats.pro_users, color: "var(--color-primary)" },
        {
          name: "Premium",
          value: stats.premium_users,
          color: "var(--color-info)",
        },
      ].filter((d) => d.value > 0)
    : [];

  const signupData = stats
    ? [
        {
          name: "Hoy",
          value: stats.new_users_today,
          color: "var(--color-success)",
        },
        {
          name: "Semana",
          value: stats.new_users_week,
          color: "var(--color-info)",
        },
        {
          name: "Mes",
          value: stats.new_users_month,
          color: "var(--color-warning)",
        },
      ]
    : [];

  const getPlanBadge = (plan: string) => {
    const styles: Record<string, string> = {
      basic: "bg-surface-alt text-text-secondary",
      pro: "bg-primary/10 text-primary",
      premium: "bg-purple-500/10 text-purple-500",
    };
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0",
          styles[plan] || styles.basic,
        )}
      >
        {(plan === "pro" || plan === "premium") && (
          <Crown className="h-3 w-3" />
        )}
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-linear-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Shield className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">
              Panel de Administración
            </h1>
            <p className="text-sm text-text-secondary">
              Vista general de la plataforma
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/users"
            className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors shadow-sm"
          >
            Gestionar Usuarios <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
          <button
            type="button"
            onClick={loadData}
            className="p-2 text-text-secondary hover:text-primary transition-colors"
            aria-label="Recargar estadísticas"
          >
            <RefreshCw
              className={clsx("h-5 w-5", loading && "animate-spin")}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {error && (
        <div
          className="bg-error/5 border-l-4 border-error p-4 rounded-r-xl"
          role="alert"
        >
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Total Usuarios */}
        <div className="bg-card rounded-3xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-info" />
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              Total Usuarios
            </p>
          </div>
          <p className="text-3xl font-black text-text">
            {loading ? "..." : (stats?.total_users ?? 0)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="text-xs bg-success/10 text-success px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <UserPlus className="h-3 w-3" />+
              {loading ? "..." : (stats?.new_users_today ?? 0)} hoy
            </span>
            <span className="text-xs text-text-secondary">
              +{loading ? "..." : (stats?.new_users_week ?? 0)} semana
            </span>
          </div>
        </div>

        {/* Usuarios Pagados */}
        <div
          className={clsx(
            "rounded-3xl border p-5 shadow-sm",
            !loading && parseFloat(conversionRate) >= 20
              ? "bg-primary/5 border-primary/20"
              : "bg-card border-border",
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <Crown
              className={clsx(
                "h-4 w-4",
                !loading && parseFloat(conversionRate) >= 20
                  ? "text-primary"
                  : "text-text-secondary",
              )}
            />
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              Usuarios Pagados
            </p>
          </div>
          <p className="text-3xl font-black text-text">
            {loading ? "..." : paidUsers}
          </p>
          <div className="mt-2">
            <span
              className={clsx(
                "text-xs px-1.5 py-0.5 rounded-md",
                !loading && parseFloat(conversionRate) >= 20
                  ? "bg-primary/10 text-primary"
                  : "bg-surface-alt text-text-secondary",
              )}
            >
              {loading ? "..." : conversionRate}% conversión
            </span>
          </div>
        </div>

        {/* Total Eventos */}
        <div className="bg-card rounded-3xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-success" />
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              Total Eventos
            </p>
          </div>
          <p className="text-3xl font-black text-text">
            {loading ? "..." : (stats?.total_events ?? 0)}
          </p>
          <p className="text-xs text-text-secondary mt-2">
            {loading ? "" : `~${avgEventsPerUser} por usuario`}
          </p>
        </div>

        {/* Clientes / Productos */}
        <div className="bg-card rounded-3xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="h-4 w-4 text-purple-500" />
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              Clientes / Productos
            </p>
          </div>
          <div className="flex items-end gap-1.5">
            <p className="text-3xl font-black text-text">
              {loading ? "..." : (stats?.total_clients ?? 0)}
            </p>
            <span className="text-xl text-text-secondary font-bold mb-0.5">
              /
            </span>
            <p className="text-3xl font-black text-text">
              {loading ? "..." : (stats?.total_products ?? 0)}
            </p>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            en toda la plataforma
          </p>
        </div>
      </div>

      {/* Platform Health */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border px-5 py-4 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Percent className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              Tasa de Conversión
            </p>
            <p className="text-2xl font-black text-text mt-0.5">
              {loading ? "..." : `${conversionRate}%`}
            </p>
            <p className="text-xs text-text-secondary">basic → plan pagado</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border px-5 py-4 shadow-sm flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              Eventos por Usuario
            </p>
            <p className="text-2xl font-black text-text mt-0.5">
              {loading ? "..." : avgEventsPerUser}
            </p>
            <p className="text-xs text-text-secondary">promedio plataforma</p>
          </div>
        </div>

        <div
          className={clsx(
            "rounded-2xl border px-5 py-4 shadow-sm flex items-center gap-4",
            !loading && parseFloat(churnRate) > 20
              ? "bg-error/5 border-error/20"
              : "bg-card border-border",
          )}
        >
          <div
            className={clsx(
              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
              !loading && parseFloat(churnRate) > 20
                ? "bg-error/10"
                : "bg-surface-alt",
            )}
          >
            <XCircle
              className={clsx(
                "h-5 w-5",
                !loading && parseFloat(churnRate) > 20
                  ? "text-error"
                  : "text-text-secondary",
              )}
            />
          </div>
          <div>
            <p className="text-xs text-text-secondary uppercase tracking-wide">
              Tasa Cancelación
            </p>
            <p
              className={clsx(
                "text-2xl font-black mt-0.5",
                !loading && parseFloat(churnRate) > 20
                  ? "text-error"
                  : "text-text",
              )}
            >
              {loading ? "..." : `${churnRate}%`}
            </p>
            <p className="text-xs text-text-secondary">
              subs canceladas vs total
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Plan Distribution Pie */}
        <div className="bg-card shadow-sm border border-border rounded-3xl p-6">
          <h3 className="text-base font-semibold text-text mb-4">
            Distribución de Planes
          </h3>
          <div className="h-56">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-text-tertiary" />
              </div>
            ) : planDistribution.length > 0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={1}
                minHeight={1}
              >
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                Sin datos disponibles
              </div>
            )}
          </div>
          <div className="flex justify-center gap-4 mt-2">
            {planDistribution.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center gap-1.5 text-xs text-text-secondary"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:{" "}
                <span className="font-semibold text-text">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signups Bar Chart */}
        <div className="bg-card shadow-sm border border-border rounded-3xl p-6">
          <h3 className="text-base font-semibold text-text mb-4">
            Nuevos Registros
          </h3>
          <div className="h-56">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-text-tertiary" />
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={1}
                minHeight={1}
              >
                <BarChart data={signupData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--color-border)"
                    opacity={0.5}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--color-text-tertiary)", fontSize: 12 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={48}>
                    {signupData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Subscription Status */}
        <div className="bg-card shadow-sm border border-border rounded-3xl p-6">
          <h3 className="text-base font-semibold text-text mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />
            Suscripciones
          </h3>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-text-tertiary" />
            </div>
          ) : subs ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-success/5 border border-success/20 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-success">
                    {subs.total_active}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Activas
                  </div>
                </div>
                <div className="bg-error/5 border border-error/20 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-error">
                    {subs.total_canceled}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Canceladas
                  </div>
                </div>
                <div className="bg-info/5 border border-info/20 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-info">
                    {subs.total_trialing}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">Trial</div>
                </div>
                <div className="bg-warning/5 border border-warning/20 rounded-2xl p-4 text-center">
                  <div className="text-2xl font-bold text-warning">
                    {subs.total_past_due}
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    Vencidas
                  </div>
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wider mb-3">
                  Por Proveedor
                </h4>
                <div className="space-y-2">
                  {[
                    {
                      name: "Stripe",
                      count: subs.stripe_count,
                      color: "bg-purple-500",
                    },
                    {
                      name: "Apple",
                      count: subs.apple_count,
                      color: "bg-text",
                    },
                    {
                      name: "Google",
                      count: subs.google_count,
                      color: "bg-success",
                    },
                  ].map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${p.color}`} />
                        <span className="text-text-secondary">{p.name}</span>
                      </div>
                      <span className="font-semibold text-text">{p.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-text-secondary text-sm">
              Sin datos de suscripciones
            </div>
          )}
        </div>
      </div>

      {/* Top Usuarios por Actividad */}
      <div className="bg-card shadow-sm border border-border rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-text">
              Top Usuarios por Actividad
            </h3>
          </div>
          <Link
            to="/admin/users"
            className="text-sm font-medium text-primary hover:text-primary-dark flex items-center gap-1 transition-colors"
          >
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-surface-alt animate-pulse"
              />
            ))}
          </div>
        ) : topUsers.length === 0 ? (
          <div className="text-center py-10">
            <Users className="h-9 w-9 text-text-secondary opacity-25 mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              No hay usuarios registrados aún.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topUsers.map((user, idx) => {
              const score =
                user.events_count + user.clients_count + user.products_count;
              const maxScore =
                topUsers[0].events_count +
                topUsers[0].clients_count +
                topUsers[0].products_count;
              const barPct =
                maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

              return (
                <div
                  key={user.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-surface-alt transition-colors group"
                >
                  <span className="text-xs font-bold text-text-secondary w-5 text-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="h-9 w-9 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-text truncate">
                        {user.name}
                      </p>
                      {getPlanBadge(user.plan)}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-surface-alt rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-secondary shrink-0">
                        <span title="Eventos">
                          <Calendar className="h-3 w-3 inline mr-0.5" />
                          {user.events_count}
                        </span>
                        <span title="Clientes">
                          <Users className="h-3 w-3 inline mr-0.5" />
                          {user.clients_count}
                        </span>
                        <span
                          className="font-bold text-text"
                          title="Actividad total"
                        >
                          {score} total
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resumen de Crecimiento */}
      <div className="bg-card shadow-sm border border-border rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h3 className="text-lg font-semibold text-text flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" aria-hidden="true" />
            Resumen de Crecimiento
          </h3>
          <Link
            to="/admin/users"
            className="text-sm font-medium text-primary hover:text-primary-dark flex items-center transition-colors"
          >
            Ver todos los usuarios <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-6 bg-surface-alt rounded-2xl border border-border">
            <div className="text-3xl font-bold text-success">
              {loading ? "..." : (stats?.new_users_today ?? 0)}
            </div>
            <div className="text-sm text-text-secondary mt-2">Nuevos hoy</div>
          </div>
          <div className="text-center p-6 bg-surface-alt rounded-2xl border border-border">
            <div className="text-3xl font-bold text-info">
              {loading ? "..." : (stats?.new_users_week ?? 0)}
            </div>
            <div className="text-sm text-text-secondary mt-2">
              Últimos 7 días
            </div>
          </div>
          <div className="text-center p-6 bg-surface-alt rounded-2xl border border-border">
            <div className="text-3xl font-bold text-primary">
              {loading ? "..." : (stats?.new_users_month ?? 0)}
            </div>
            <div className="text-sm text-text-secondary mt-2">
              Últimos 30 días
            </div>
          </div>
        </div>

        {/* Growth trend indicator */}
        {!loading && stats && (
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
            {stats.new_users_week >= stats.new_users_month / 4 ? (
              <>
                <TrendingUp className="h-4 w-4 text-success" />
                <p className="text-sm text-text-secondary">
                  Ritmo de crecimiento{" "}
                  <span className="font-semibold text-success">saludable</span>{" "}
                  — {stats.new_users_week} usuarios esta semana vs{" "}
                  {Math.round(stats.new_users_month / 4)} promedio semanal del
                  mes.
                </p>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-warning" />
                <p className="text-sm text-text-secondary">
                  Crecimiento{" "}
                  <span className="font-semibold text-warning">por debajo</span>{" "}
                  del promedio semanal del mes (
                  {Math.round(stats.new_users_month / 4)} usuarios).
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
