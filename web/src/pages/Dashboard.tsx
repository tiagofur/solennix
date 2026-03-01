import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { eventService } from "../services/eventService";
import { inventoryService } from "../services/inventoryService";
import { paymentService } from "../services/paymentService";
import { Event, Payment, InventoryItem } from "../types/entities";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  Calendar,
  DollarSign,
  Clock,
  RefreshCw,
  AlertTriangle,
  Package,
  FileCheck,
  ArrowRight,
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

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const firstName = user?.name ? user.name.split(" ")[0] : "Usuario";

  const { isBasicPlan, canCreateEvent, eventsThisMonth, limit } =
    usePlanLimits();

  const [eventsThisMonthList, setEventsThisMonthList] = useState<DashboardEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DashboardEvent[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [netSalesThisMonth, setNetSalesThisMonth] = useState(0);
  const [cashCollectedThisMonth, setCashCollectedThisMonth] = useState(0);
  const [cashAppliedToThisMonthsEvents, setCashAppliedToThisMonthsEvents] =
    useState(0);
  const [vatCollectedThisMonth, setVatCollectedThisMonth] = useState(0);
  const [vatOutstandingThisMonth, setVatOutstandingThisMonth] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = () => {
    setError(null);
    setLoadingMonth(true);
    setLoadingUpcoming(true);
    setLoadingInventory(true);

    const today = new Date();
    const start = format(startOfMonth(today), "yyyy-MM-dd");
    const end = format(endOfMonth(today), "yyyy-MM-dd");
    const startDate = start;
    const endDate = end;

    // 1. Load Month Events
    eventService
      .getByDateRange(start, end)
      .then(async (data) => {
        setEventsThisMonthList(data || []);

        const realized = (data || []).filter(
          (e) => e.status === "confirmed" || e.status === "completed",
        );
        const netSales = realized.reduce(
          (sum, event) => sum + getEventNetSales(event),
          0,
        );
        setNetSalesThisMonth(netSales);

        const eventIds = realized.map((e) => e.id);
        const payments = await paymentService.getByEventIds(eventIds);
        const paidByEvent: Record<string, number> = {};
        payments.forEach((p: Payment) => {
          paidByEvent[p.event_id] =
            (paidByEvent[p.event_id] || 0) + Number(p.amount || 0);
        });

        const cashApplied = Object.values(paidByEvent).reduce(
          (sum, v) => sum + v,
          0,
        );
        setCashAppliedToThisMonthsEvents(cashApplied);

        const paymentsInMonth = await paymentService.getByPaymentDateRange(
          startDate,
          endDate,
        );
        const cashInMonth = (paymentsInMonth || []).reduce(
          (sum: number, p: Payment) => sum + Number(p.amount || 0),
          0,
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
      .then((data) => {
        setUpcomingEvents(data || []);
      })
      .catch((err) => {
        logError("Error loading upcoming events", err);
        setError(
          "Error de conexión o permisos. Verifica tu sesión o intenta más tarde.",
        );
      })
      .finally(() => setLoadingUpcoming(false));

    // 3. Load Inventory Alerts
    inventoryService
      .getAll()
      .then((data) => {
        const items = (data || []).filter(
          (item) => item.current_stock <= item.minimum_stock,
        );
        setLowStockCount(items.length);
        setLowStockItems(items.slice(0, 5)); // Just the top 5 alerts
      })
      .catch((err) => {
        logError("Error loading inventory", err);
      })
      .finally(() => setLoadingInventory(false));
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Prepare Chart Data (Weekly aggregation for the current month)
  const chartData = React.useMemo(() => {
    if (!eventsThisMonthList.length) return [];

    const statusData = [
      {
        status: "quoted" as const,
        name: "Cotizado",
        value: 0,
        color: "#9CA3AF",
      },
      {
        status: "confirmed" as const,
        name: "Confirmado",
        value: 0,
        color: "#3B82F6",
      },
      {
        status: "completed" as const,
        name: "Completado",
        value: 0,
        color: "#10B981",
      },
      {
        status: "cancelled" as const,
        name: "Cancelado",
        value: 0,
        color: "#EF4444",
      },
    ];

    eventsThisMonthList.forEach((event) => {
      const bucket = statusData.find((s) => s.status === event.status);
      if (bucket) bucket.value += 1;
    });

    return statusData.filter((d) => d.value > 0);
  }, [eventsThisMonthList]);

  const financialComparisonData = React.useMemo(() => {
    return [
      { name: "Ventas Netas", value: netSalesThisMonth, color: "#10B981" },
      { name: "Cobrado Real", value: cashCollectedThisMonth, color: "#F97316" },
      {
        name: "IVA por Cobrar",
        value: vatOutstandingThisMonth,
        color: "#EF4444",
      },
    ];
  }, [netSalesThisMonth, cashCollectedThisMonth, vatOutstandingThisMonth]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">
            Hola, {firstName}
          </h1>
          <p className="text-sm text-text-secondary first-letter:uppercase">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link
            to="/events/new"
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors"
            aria-label="Crear nuevo evento"
          >
            + Evento
          </Link>
          <Link
            to="/clients/new"
            className="hidden sm:inline-flex items-center justify-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-text bg-card hover:bg-surface-alt transition-colors"
            aria-label="Crear nuevo cliente"
          >
            + Cliente
          </Link>
          <button
            type="button"
            onClick={loadDashboardData}
            className="p-2 text-text-secondary hover:text-primary transition-colors"
            aria-label="Recargar datos del dashboard"
          >
            <RefreshCw
              className={`h-5 w-5 ${
                loadingMonth || loadingUpcoming || loadingInventory
                  ? "animate-spin"
                  : ""
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {error && (
        <div
          className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4"
          role="alert"
        >
          <div className="flex justify-between items-center">
            <div className="flex">
              <div className="shrink-0">
                <AlertTriangle
                  className="h-5 w-5 text-red-400"
                  aria-hidden="true"
                />
              </div>
              <div className="ml-3">
                <p className="text-sm text-error">
                  {error}
                </p>
              </div>
            </div>
            <span className="text-sm font-medium text-error">
              Intenta recargar los datos.
            </span>
          </div>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6">
        {/* Ventas netas (devengadas) */}
        <div className="bg-card shadow-sm hover:shadow-md border border-border rounded-3xl transition-all duration-300 flex flex-col group hover:-translate-y-0.5 overflow-hidden">
          <div className="p-5 flex-1">
            <div className="flex items-center">
              <div className="shrink-0">
                <div
                  className="h-10 w-10 bg-success/10 rounded-full flex items-center justify-center text-success"
                  aria-hidden="true"
                >
                  <DollarSign className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-text-secondary uppercase tracking-wider leading-tight">
                    Ventas netas
                  </dt>
                  <dd>
                    <div className="text-xl font-bold text-text mt-1">
                      {loadingMonth
                        ? "..."
                        : `$${netSalesThisMonth.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}`}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-surface-alt px-5 py-3 transition-colors mt-auto border-t border-border">
            <div className="text-xs">
              <span className="text-text-secondary">
                Confirmados/Completados
              </span>
            </div>
          </div>
        </div>

        {/* Cobrado (cash) */}
        <div className="bg-card shadow-sm hover:shadow-md border border-border rounded-3xl transition-all duration-300 flex flex-col group hover:-translate-y-0.5 overflow-hidden">
          <div className="p-5 flex-1">
            <div className="flex items-center">
              <div className="shrink-0">
                <div
                  className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary"
                  aria-hidden="true"
                >
                  <DollarSign className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-text-secondary uppercase tracking-wider leading-tight">
                    Cobrado (mes)
                  </dt>
                  <dd>
                    <div className="text-xl font-bold text-text mt-1">
                      {loadingMonth
                        ? "..."
                        : `$${cashCollectedThisMonth.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}`}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-surface-alt px-5 py-3 transition-colors mt-auto border-t border-border">
            <div className="text-xs text-text-secondary">
              Aplicado a eventos:{" "}
              <span className="font-medium text-text">
                {loadingMonth
                  ? "..."
                  : `$${cashAppliedToThisMonthsEvents.toLocaleString("es-MX", {
                      minimumFractionDigits: 2,
                    })}`}
              </span>
            </div>
          </div>
        </div>

        {/* IVA cobrado */}
        <div className="bg-card shadow-sm hover:shadow-md border border-border rounded-3xl transition-all duration-300 flex flex-col group hover:-translate-y-0.5 overflow-hidden">
          <div className="p-5 flex-1">
            <div className="flex items-center">
              <div className="shrink-0">
                <div
                  className="h-10 w-10 bg-info/10 rounded-full flex items-center justify-center text-info"
                  aria-hidden="true"
                >
                  <FileCheck className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-text-secondary uppercase tracking-wider leading-tight">
                    IVA cobrado
                  </dt>
                  <dd>
                    <div className="text-xl font-bold text-text mt-1">
                      {loadingMonth
                        ? "..."
                        : `$${vatCollectedThisMonth.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}`}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-surface-alt px-5 py-3 transition-colors mt-auto border-t border-border">
            <div className="text-xs">
              <span className="text-text-secondary">
                Proporcional al % pagado
              </span>
            </div>
          </div>
        </div>

        {/* IVA por cobrar */}
        <div className="bg-card shadow-sm hover:shadow-md border border-border rounded-3xl transition-all duration-300 flex flex-col group hover:-translate-y-0.5 overflow-hidden">
          <div className="p-5 flex-1">
            <div className="flex items-center">
              <div className="shrink-0">
                <div
                  className="h-10 w-10 bg-error/10 rounded-full flex items-center justify-center text-error"
                  aria-hidden="true"
                >
                  <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-text-secondary uppercase tracking-wider leading-tight">
                    IVA pendiente
                  </dt>
                  <dd>
                    <div className="text-xl font-bold text-text mt-1">
                      {loadingMonth
                        ? "..."
                        : `$${vatOutstandingThisMonth.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}`}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-surface-alt px-5 py-3 transition-colors mt-auto border-t border-border">
            <div className="text-xs">
              <Link
                to="/calendar"
                className="font-medium text-primary hover:text-primary-dark transition-colors"
              >
                Ver eventos del mes
              </Link>
            </div>
          </div>
        </div>

        {/* Card Eventos del Mes */}
        <div className="bg-card shadow-sm hover:shadow-md border border-border rounded-3xl transition-all duration-300 flex flex-col group hover:-translate-y-0.5 overflow-hidden">
          <div className="p-5 flex-1">
            <div className="flex items-center">
              <div className="shrink-0">
                <div
                  className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary"
                  aria-hidden="true"
                >
                  <Calendar className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-text-secondary uppercase tracking-wider leading-tight">
                    Eventos este Mes
                  </dt>
                  <dd>
                    <div className="text-xl font-bold text-text mt-1">
                      {loadingMonth ? "..." : eventsThisMonthList.length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-surface-alt px-5 py-3 transition-colors mt-auto border-t border-border">
            <div className="text-xs">
              <Link
                to="/calendar"
                className="font-medium text-primary hover:text-primary-dark transition-colors"
              >
                Ver calendario
              </Link>
            </div>
          </div>
        </div>

        {/* Card Alertas de Inventario */}
        <div className="bg-card shadow-sm hover:shadow-md border border-border rounded-3xl transition-all duration-300 flex flex-col group hover:-translate-y-0.5 overflow-hidden">
          <div className="p-5 flex-1">
            <div className="flex items-center">
              <div className="shrink-0">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    lowStockCount > 0
                      ? "bg-error/10 text-error"
                      : "bg-success/10 text-success"
                  }`}
                  aria-hidden="true"
                >
                  <Package className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs font-medium text-text-secondary uppercase tracking-wider leading-tight">
                    Alertas de Stock
                  </dt>
                  <dd>
                    <div
                      className={`text-xl font-bold mt-1 ${
                        lowStockCount > 0
                          ? "text-error"
                          : "text-text"
                      }`}
                    >
                      {loadingInventory
                        ? "..."
                        : lowStockCount > 0
                          ? `${lowStockCount} ítems bajos`
                          : "Todo en orden"}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-surface-alt px-5 py-3 transition-colors mt-auto border-t border-border">
            <div className="text-xs">
              <Link
                to="/inventory"
                className="font-medium text-primary hover:text-primary-dark transition-colors"
              >
                Ver inventario
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Financial Comparison Chart */}
        <div className="bg-card shadow-sm border border-border rounded-3xl p-6 transition-colors flex flex-col">
          <h3 className="text-lg leading-6 font-semibold text-text mb-6">
            Comparativa Financiera (Este Mes)
          </h3>
          <div
            className="h-80 w-full mt-auto"
            role="img"
            aria-label="Gráfico de barras comparando ventas netas, cobrado real e IVA por cobrar del mes actual"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={financialComparisonData}
                layout="vertical"
                margin={{ left: 40, right: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="var(--color-border)"
                  opacity={0.5}
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                  width={100}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `$${value.toLocaleString()}`,
                    "Monto",
                  ]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "none",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                  {financialComparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Event Status Bar Chart */}
        <div className="bg-card shadow-sm border border-border rounded-3xl p-6 transition-colors flex flex-col">
          <h3 className="text-lg leading-6 font-semibold text-text mb-6">
            Estado de Eventos (Este Mes)
          </h3>
          <div className="h-80 w-full mt-auto">
            {loadingMonth ? (
              <div
                className="h-full flex items-center justify-center"
                role="status"
                aria-live="polite"
              >
                <RefreshCw
                  className="h-8 w-8 animate-spin text-gray-300"
                  aria-hidden="true"
                />
                <span className="sr-only">Cargando datos de eventos...</span>
              </div>
            ) : chartData.length > 0 ? (
              <div
                role="img"
                aria-label="Gráfico de barras mostrando la distribución de estados de eventos del mes actual"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
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
                      tick={{ fill: "#6B7280", fontSize: 11 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6B7280", fontSize: 11 }}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        padding: "12px",
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={48}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Calendar
                  className="h-12 w-12 mb-3 opacity-20"
                  aria-hidden="true"
                />
                <p className="text-sm">
                  No hay datos suficientes para graficar
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Items Section */}
        {lowStockItems.length > 0 && (
          <div className="bg-card shadow-sm border border-border rounded-3xl p-6 transition-colors lg:col-span-2 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text flex items-center">
                <AlertTriangle
                  className="h-5 w-5 mr-2 text-red-500"
                  aria-hidden="true"
                />
                Reponer Inventario (Crítico)
              </h3>
              <Link
                to="/inventory"
                className="text-sm text-brand-orange hover:underline font-medium"
              >
                Ver todo el inventario
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table
                className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
                aria-label="Tabla de inventario bajo en stock"
              >
                <caption className="sr-only">
                  Ítems de inventario con stock crítico. {lowStockItems.length}{" "}
                  ítems mostrados.
                </caption>
                <thead className="bg-surface-alt">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Ítem
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mínimo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {lowStockItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-surface-alt transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text">
                        {item.ingredient_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-1 bg-error/10 text-error rounded-full font-bold">
                          {item.current_stock} {item.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {item.minimum_stock} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link
                          to="/inventory"
                          className="text-brand-orange hover:text-orange-600 font-semibold"
                        >
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

        {/* Upcoming Events List */}
        <div className="bg-card shadow-sm border border-border rounded-3xl p-6 transition-colors overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg leading-6 font-semibold text-text">
              Próximos Eventos
            </h3>
            <Link
              to="/calendar"
              className="text-sm font-medium text-brand-orange hover:text-orange-600 flex items-center transition-colors"
            >
              Ver todos{" "}
              <ArrowRight className="h-4 w-4 ml-1" aria-hidden="true" />
            </Link>
          </div>

          <div className="flow-root">
            {loadingUpcoming ? (
              <div
                className="flex justify-center py-8"
                role="status"
                aria-live="polite"
              >
                <Clock
                  className="h-8 w-8 animate-spin text-gray-300"
                  aria-hidden="true"
                />
                <span className="sr-only">Cargando próximos eventos...</span>
              </div>
            ) : upcomingEvents.length > 0 ? (
              <ul className="-my-5 divide-y divide-border">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="py-5">
                    <div className="flex items-center space-x-4">
                      <div className="shrink-0">
                        <div className="h-12 w-12 rounded-md bg-primary/10 flex flex-col items-center justify-center text-primary border border-primary/20">
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {format(parseISO(event.event_date), "MMM", {
                              locale: es,
                            })}
                          </span>
                          <span className="text-lg font-bold leading-none">
                            {format(parseISO(event.event_date), "d")}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text truncate">
                          {event.clients?.name}
                        </p>
                        <p className="text-xs text-text-secondary mt-1 flex items-center">
                          <span className="inline-block px-1.5 py-0.5 rounded-sm bg-surface-alt mr-2 uppercase tracking-tight text-[10px] font-bold">
                            {event.service_type}
                          </span>
                          {event.num_people} pax
                        </p>
                      </div>
                      <div>
                        <Link
                          to={`/events/${event.id}/summary`}
                          className="inline-flex items-center px-3 py-1.5 border border-border text-xs font-semibold rounded-md text-text bg-card hover:bg-surface-alt transition-all shadow-sm"
                        >
                          Ver
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-10">
                <Calendar
                  className="h-12 w-12 mx-auto text-text-tertiary mb-3 opacity-50"
                  aria-hidden="true"
                />
                <p className="text-text-secondary text-sm">
                  No hay eventos próximos agendados.
                </p>
                <Link
                  to="/events/new"
                  className="text-primary text-sm font-semibold mt-3 inline-block hover:underline"
                >
                  Agendar uno ahora
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <PendingEventsModal />
    </div>
  );
};
