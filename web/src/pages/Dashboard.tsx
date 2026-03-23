import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { eventService } from "../services/eventService";
import { inventoryService } from "../services/inventoryService";
import { paymentService } from "../services/paymentService";
import { Event, Payment, InventoryItem } from "../types/entities";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { es } from "date-fns/locale";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Calendar,
  DollarSign,
  Clock,
  RefreshCw,
  AlertTriangle,
  Package,
  FileCheck,
  ArrowRight,
  Plus,
  Users,
  TrendingUp,
} from "lucide-react";
import { logError } from "../lib/errorHandler";
import {
  getEventNetSales,
  getEventTaxAmount,
  getEventTotalCharged,
} from "../lib/finance";
import { PendingEventsModal } from "../components/PendingEventsModal";
import { OnboardingChecklist } from "../components/OnboardingChecklist";
import { UpgradeBanner } from "../components/UpgradeBanner";
import { usePlanLimits } from "../hooks/usePlanLimits";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type DashboardEvent = Event & {
  clients?: { name: string } | null;
};

// ── Skeleton loader ──────────────────────────────────────────────
function SkeletonKpi() {
  return (
    <div className="bg-card border border-border rounded-3xl p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-surface-alt shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 bg-surface-alt rounded w-2/3" />
          <div className="h-6 bg-surface-alt rounded w-1/2" />
          <div className="h-3 bg-surface rounded w-3/4" />
        </div>
      </div>
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; classes: string }> = {
  quoted:    { label: "Cotizado",    classes: "bg-status-quoted/10 text-status-quoted" },
  confirmed: { label: "Confirmado",  classes: "bg-status-confirmed/10 text-status-confirmed" },
  completed: { label: "Completado",  classes: "bg-status-completed/10 text-status-completed" },
  cancelled: { label: "Cancelado",   classes: "bg-status-cancelled/10 text-status-cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? { label: status, classes: "bg-surface-alt text-text-secondary" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub?: React.ReactNode;
}
function KpiCard({ icon: Icon, iconBg, iconColor, label, value, sub }: KpiCardProps) {
  return (
    <div className="bg-card shadow-sm hover:shadow-md border border-border rounded-3xl p-5 transition-all duration-300 hover:-translate-y-0.5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <dt className="text-xs font-semibold text-text-secondary uppercase tracking-wider leading-tight mb-1">
            {label}
          </dt>
          <dd className="text-xl font-black text-text tracking-tight">{value}</dd>
        </div>
      </div>
      {sub && <div className="text-xs text-text-secondary border-t border-border pt-3">{sub}</div>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const firstName = user?.name ? user.name.split(" ")[0] : "Usuario";

  const { isBasicPlan, canCreateEvent, eventsThisMonth, limit } = usePlanLimits();

  const [eventsThisMonthList, setEventsThisMonthList] = useState<DashboardEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DashboardEvent[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [netSalesThisMonth, setNetSalesThisMonth] = useState(0);
  const [cashCollectedThisMonth, setCashCollectedThisMonth] = useState(0);
  const [cashAppliedToThisMonthsEvents, setCashAppliedToThisMonthsEvents] = useState(0);
  const [vatCollectedThisMonth, setVatCollectedThisMonth] = useState(0);
  const [vatOutstandingThisMonth, setVatOutstandingThisMonth] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isLoading = loadingMonth || loadingUpcoming || loadingInventory;

  const fmt = (n: number) =>
    `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

  const loadDashboardData = () => {
    setError(null);
    setLoadingMonth(true);
    setLoadingUpcoming(true);
    setLoadingInventory(true);

    const today = new Date();
    const start = format(startOfMonth(today), "yyyy-MM-dd");
    const end = format(endOfMonth(today), "yyyy-MM-dd");

    // 1. Load Month Events
    eventService
      .getByDateRange(start, end)
      .then(async (data) => {
        setEventsThisMonthList(data || []);

        const realized = (data || []).filter(
          (e) => e.status === "confirmed" || e.status === "completed",
        );
        const netSales = realized.reduce((sum, event) => sum + getEventNetSales(event), 0);
        setNetSalesThisMonth(netSales);

        const eventIds = realized.map((e) => e.id);
        const payments = await paymentService.getByEventIds(eventIds);
        const paidByEvent: Record<string, number> = {};
        payments.forEach((p: Payment) => {
          paidByEvent[p.event_id] = (paidByEvent[p.event_id] || 0) + Number(p.amount || 0);
        });

        const cashApplied = Object.values(paidByEvent).reduce((sum, v) => sum + v, 0);
        setCashAppliedToThisMonthsEvents(cashApplied);

        const paymentsInMonth = await paymentService.getByPaymentDateRange(start, end);
        const cashInMonth = (paymentsInMonth || []).reduce(
          (sum: number, p: Payment) => sum + Number(p.amount || 0), 0,
        );
        setCashCollectedThisMonth(cashInMonth);

        const vatCollected = realized.reduce((sum, event) => {
          const totalCharged = getEventTotalCharged(event);
          const paid = paidByEvent[event.id] || 0;
          const ratio = totalCharged > 0 ? Math.min(paid / totalCharged, 1) : 0;
          return sum + getEventTaxAmount(event) * ratio;
        }, 0);
        setVatCollectedThisMonth(vatCollected);

        const vatOutstanding = realized.reduce((sum, event) => {
          const totalCharged = getEventTotalCharged(event);
          const paid = paidByEvent[event.id] || 0;
          const ratio = totalCharged > 0 ? Math.min(paid / totalCharged, 1) : 0;
          const vat = getEventTaxAmount(event);
          return sum + (vat - vat * ratio);
        }, 0);
        setVatOutstandingThisMonth(vatOutstanding);
      })
      .catch((err) => {
        logError("Error loading month events", err);
        setError("Error al cargar los datos del mes. Intenta recargar.");
      })
      .finally(() => setLoadingMonth(false));

    // 2. Load Upcoming Events
    eventService
      .getUpcoming(5)
      .then((data) => setUpcomingEvents(data || []))
      .catch((err) => {
        logError("Error loading upcoming events", err);
        setError("Error de conexión o permisos. Verifica tu sesión o intenta más tarde.");
      })
      .finally(() => setLoadingUpcoming(false));

    // 3. Load Inventory Alerts
    inventoryService
      .getAll()
      .then((data) => {
        const items = (data || []).filter((item) => item.minimum_stock > 0 && item.current_stock < item.minimum_stock);
        setLowStockCount(items.length);
        setLowStockItems(items.slice(0, 5));
      })
      .catch((err) => logError("Error loading inventory", err))
      .finally(() => setLoadingInventory(false));
  };

  useEffect(() => { loadDashboardData(); }, []);

  useEffect(() => {
    if (searchParams.has("session_id")) {
      checkAuth();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, checkAuth, setSearchParams]);

  // Chart data
  const chartData = React.useMemo(() => {
    if (!eventsThisMonthList.length) return [];
    const statusData = [
      { status: "quoted" as const,    name: "Cotizado",   value: 0, color: "var(--color-status-quoted)" },
      { status: "confirmed" as const, name: "Confirmado", value: 0, color: "var(--color-status-confirmed)" },
      { status: "completed" as const, name: "Completado", value: 0, color: "var(--color-status-completed)" },
      { status: "cancelled" as const, name: "Cancelado",  value: 0, color: "var(--color-status-cancelled)" },
    ];
    eventsThisMonthList.forEach((event) => {
      const bucket = statusData.find((s) => s.status === event.status);
      if (bucket) bucket.value += 1;
    });
    return statusData.filter((d) => d.value > 0);
  }, [eventsThisMonthList]);

  const financialComparisonData = React.useMemo(() => [
    { name: "Ventas Netas",    value: netSalesThisMonth,       color: "var(--color-success)" },
    { name: "Cobrado Real",    value: cashCollectedThisMonth,  color: "var(--color-primary)" },
    { name: "IVA por Cobrar",  value: vatOutstandingThisMonth, color: "var(--color-error)" },
  ], [netSalesThisMonth, cashCollectedThisMonth, vatOutstandingThisMonth]);

  const tooltipStyle = {
    borderRadius: "12px",
    border: "1px solid var(--color-border)",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
    backgroundColor: "var(--color-card)",
    color: "var(--color-text)",
    padding: "10px 14px",
  };

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-text tracking-tight">
            Hola, {firstName} 👋
          </h1>
          <p className="text-sm text-text-secondary mt-0.5 first-letter:uppercase">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/events/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all hover:scale-[1.02]"
            aria-label="Crear nuevo evento"
          >
            <Plus className="h-4 w-4" /> Evento
          </Link>
          <Link
            to="/clients/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 border border-border rounded-xl text-sm font-semibold text-text bg-card hover:bg-surface-alt transition-colors"
            aria-label="Crear nuevo cliente"
          >
            <Users className="h-4 w-4" /> Cliente
          </Link>
          <button
            type="button"
            onClick={loadDashboardData}
            className="p-2.5 rounded-xl border border-border bg-card text-text-secondary hover:text-primary hover:bg-surface-alt transition-colors"
            aria-label="Recargar datos del dashboard"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="flex items-start gap-3 bg-error/5 border border-error/30 text-error rounded-2xl p-4" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 text-sm">{error}</div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="text-xs font-bold underline underline-offset-2 shrink-0"
          >
            Recargar
          </button>
        </div>
      )}

      <OnboardingChecklist />

      {isBasicPlan && (
        <UpgradeBanner
          className="mb-6"
          type={!canCreateEvent ? "limit-reached" : "upsell"}
          currentUsage={eventsThisMonth}
          limit={limit}
        />
      )}

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {loadingMonth ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonKpi key={i} />)
        ) : (
          <>
            <KpiCard
              icon={TrendingUp}
              iconBg="bg-success/10"
              iconColor="text-success"
              label="Ventas netas"
              value={fmt(netSalesThisMonth)}
              sub="Eventos confirmados y completados"
            />
            <KpiCard
              icon={DollarSign}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              label="Cobrado (mes)"
              value={fmt(cashCollectedThisMonth)}
              sub={<>Aplicado a eventos: <span className="font-semibold text-text">{fmt(cashAppliedToThisMonthsEvents)}</span></>}
            />
            <KpiCard
              icon={FileCheck}
              iconBg="bg-info/10"
              iconColor="text-info"
              label="IVA cobrado"
              value={fmt(vatCollectedThisMonth)}
              sub="Proporcional al % pagado"
            />
            <KpiCard
              icon={AlertTriangle}
              iconBg="bg-error/10"
              iconColor="text-error"
              label="IVA pendiente"
              value={fmt(vatOutstandingThisMonth)}
              sub={<Link to="/calendar" className="font-semibold text-primary hover:underline">Ver eventos del mes</Link>}
            />
            <KpiCard
              icon={Calendar}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              label="Eventos este mes"
              value={String(eventsThisMonthList.length)}
              sub={<Link to="/calendar" className="font-semibold text-primary hover:underline">Ver calendario</Link>}
            />
            <KpiCard
              icon={Package}
              iconBg={lowStockCount > 0 ? "bg-error/10" : "bg-success/10"}
              iconColor={lowStockCount > 0 ? "text-error" : "text-success"}
              label="Alertas de stock"
              value={lowStockCount > 0 ? `${lowStockCount} ítems bajos` : "Todo en orden"}
              sub={<Link to="/inventory" className="font-semibold text-primary hover:underline">Ver inventario</Link>}
            />
          </>
        )}
      </div>

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Financial Comparison */}
        <div className="bg-card shadow-sm border border-border rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-text">Comparativa Financiera</h3>
            <span className="text-xs text-text-secondary bg-surface-alt px-3 py-1 rounded-full">Este mes</span>
          </div>
          <div className="h-72 w-full" role="img" aria-label="Gráfico de barras comparando ventas netas, cobrado real e IVA por cobrar">
            <ResponsiveContainer width="100%" height={288}>
              <BarChart data={financialComparisonData} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" opacity={0.5} />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
                  width={110}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString("es-MX")}`, "Monto"]}
                  contentStyle={tooltipStyle}
                  cursor={{ fill: "var(--color-surface-alt)" }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={28}>
                  {financialComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event Status */}
        <div className="bg-card shadow-sm border border-border rounded-3xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-text">Estado de Eventos</h3>
            <span className="text-xs text-text-secondary bg-surface-alt px-3 py-1 rounded-full">Este mes</span>
          </div>
          <div className="h-72 w-full" role="img" aria-label="Gráfico de barras con estados de eventos del mes">
            {loadingMonth ? (
              <div className="h-full flex items-center justify-center">
                <RefreshCw className="h-7 w-7 animate-spin text-border" aria-hidden="true" />
                <span className="sr-only">Cargando...</span>
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={288}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "var(--color-surface-alt)" }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar dataKey="value" name="Eventos" radius={[6, 6, 0, 0]} barSize={44}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-text-tertiary">
                <Calendar className="h-12 w-12 opacity-20" aria-hidden="true" />
                <p className="text-sm text-text-secondary">Sin datos para graficar este mes</p>
                <Link to="/events/new" className="text-xs font-semibold text-primary hover:underline">
                  Crear primer evento
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── LOW STOCK ── */}
        {lowStockItems.length > 0 && (
          <div className="bg-card shadow-sm border border-border rounded-3xl xl:col-span-2 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-base font-bold text-text flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-3.5 w-3.5 text-error" aria-hidden="true" />
                </span>
                Inventario crítico
                <span className="ml-1 text-xs font-semibold bg-error/10 text-error px-2 py-0.5 rounded-full">
                  {lowStockItems.length}
                </span>
              </h3>
              <Link to="/inventory" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                Ver todo <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border" aria-label="Inventario con stock crítico">
                <caption className="sr-only">{lowStockItems.length} ítems con stock crítico</caption>
                <thead className="bg-surface-alt">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Ítem</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Stock actual</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Mínimo</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">Acción</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-text">{item.ingredient_name}</div>
                        <div className="text-xs text-text-secondary">Unidad: {item.unit}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-error/10 text-error rounded-full text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                          {item.current_stock} {item.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {item.minimum_stock} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link to="/inventory" className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors">
                          Gestionar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── UPCOMING EVENTS ── */}
        <div className="bg-card shadow-sm border border-border rounded-3xl xl:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-base font-bold text-text">Próximos Eventos</h3>
            <Link to="/calendar" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {loadingUpcoming ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-surface-alt shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-surface-alt rounded w-1/3" />
                    <div className="h-3 bg-surface rounded w-1/4" />
                  </div>
                  <div className="w-14 h-5 bg-surface-alt rounded-full" />
                  <div className="w-20 h-3 bg-surface rounded" />
                  <div className="w-12 h-7 bg-surface-alt rounded-xl" />
                </div>
              ))}
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border" aria-label="Próximos eventos">
                <thead className="bg-surface-alt">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Fecha</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Cliente</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Estado</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Servicio / Personas</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      <span className="sr-only">Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {upcomingEvents.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-surface-alt/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/events/${event.id}/summary`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center justify-center bg-surface-alt border border-border rounded-xl w-11 h-11 shrink-0">
                            <span className="text-lg font-black leading-none text-text">
                              {format(new Date(event.event_date + "T12:00:00"), "d")}
                            </span>
                            <span className="text-[9px] font-semibold uppercase text-text-secondary leading-none mt-0.5">
                              {format(new Date(event.event_date + "T12:00:00"), "MMM", { locale: es })}
                            </span>
                          </div>
                          <div className="text-xs text-text-secondary capitalize">
                            {format(new Date(event.event_date + "T12:00:00"), "EEEE", { locale: es })}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                        {event.clients?.name ?? "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={event.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {event.service_type} · {event.num_people} pax
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <Link
                          to={`/events/${event.id}/summary`}
                          className="text-xs font-semibold text-primary hover:text-primary-dark transition-colors"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-surface-alt flex items-center justify-center">
                <Clock className="h-7 w-7 text-text-tertiary opacity-50" aria-hidden="true" />
              </div>
              <p className="text-sm text-text-secondary">No hay eventos próximos agendados</p>
              <Link to="/events/new" className="text-sm font-bold text-primary hover:underline">
                Agendar uno ahora →
              </Link>
            </div>
          )}
        </div>
      </div>

      <PendingEventsModal />
    </div>
  );
};
