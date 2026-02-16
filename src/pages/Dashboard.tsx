import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { eventService } from "../services/eventService";
import { inventoryService } from "../services/inventoryService";
import { paymentService } from "../services/paymentService";
import { Database } from "../types/supabase";
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
  ArrowRight
} from "lucide-react";
import { logError } from "../lib/errorHandler";
import { getEventNetSales, getEventTaxAmount, getEventTotalCharged } from "../lib/finance";
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

type Event = Database["public"]["Tables"]["events"]["Row"] & {
  clients?: { name: string } | null;
};

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const [eventsThisMonth, setEventsThisMonth] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    setError(null);
    setLoadingMonth(true);
    setLoadingUpcoming(true);
    setLoadingInventory(true);

    const today = new Date();
    const start = startOfMonth(today).toISOString();
    const end = endOfMonth(today).toISOString();
    const startDate = format(startOfMonth(today), "yyyy-MM-dd");
    const endDate = format(endOfMonth(today), "yyyy-MM-dd");

    // 1. Load Month Events
    eventService
      .getByDateRange(start, end)
      .then(async (data) => {
        setEventsThisMonth(data || []);

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
        payments.forEach((p: any) => {
          paidByEvent[p.event_id] = (paidByEvent[p.event_id] || 0) + Number(p.amount || 0);
        });

        const cashApplied = Object.values(paidByEvent).reduce((sum, v) => sum + v, 0);
        setCashAppliedToThisMonthsEvents(cashApplied);

        const paymentsInMonth = await paymentService.getByPaymentDateRange(startDate, endDate);
        const cashInMonth = (paymentsInMonth || []).reduce(
          (sum: number, p: any) => sum + Number(p.amount || 0),
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
        const count = data.filter(
          (item) => item.current_stock <= item.minimum_stock,
        ).length;
        setLowStockCount(count);
      })
      .catch((err) => {
        logError("Error loading inventory", err);
      })
      .finally(() => setLoadingInventory(false));
  };

  // Prepare Chart Data (Weekly aggregation for the current month)
  const chartData = React.useMemo(() => {
    if (!eventsThisMonth.length) return [];

    const statusData = [
      { status: "quoted" as const, name: "Cotizado", value: 0, color: "#9CA3AF" },
      { status: "confirmed" as const, name: "Confirmado", value: 0, color: "#3B82F6" },
      { status: "completed" as const, name: "Completado", value: 0, color: "#10B981" },
      { status: "cancelled" as const, name: "Cancelado", value: 0, color: "#EF4444" },
    ];

    eventsThisMonth.forEach((event) => {
      const bucket = statusData.find((s) => s.status === event.status);
      if (bucket) bucket.value += 1;
    });

    return statusData.filter((d) => d.value > 0);
  }, [eventsThisMonth]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Hola, {profile?.name || "Usuario"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 first-letter:uppercase">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link
            to="/events/new"
            className="hidden sm:inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-orange hover:bg-orange-600 transition-colors"
          >
            + Evento
          </Link>
          <Link
            to="/clients/new"
            className="hidden sm:inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            + Cliente
          </Link>
          <button
            onClick={loadDashboardData}
            className="p-2 text-gray-400 hover:text-brand-orange transition-colors"
            title="Recargar datos"
          >
            <RefreshCw
              className={`h-5 w-5 ${
                loadingMonth || loadingUpcoming || loadingInventory
                  ? "animate-spin"
                  : ""
              }`}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4">
          <div className="flex justify-between items-center">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            </div>
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              Intenta recargar los datos.
            </span>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
        {/* Ventas netas (devengadas) */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Ventas netas (devengadas)
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
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
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3 transition-colors">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Confirmados/Completados
              </span>
            </div>
          </div>
        </div>

        {/* Cobrado (cash) */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-brand-orange/20 rounded-full flex items-center justify-center text-brand-orange">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Cobrado (este mes)
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
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
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3 transition-colors">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Aplicado a eventos del mes:{" "}
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
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <FileCheck className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    IVA cobrado
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
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
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3 transition-colors">
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">
                Proporcional al % pagado
              </span>
            </div>
          </div>
        </div>

        {/* IVA por cobrar */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    IVA por cobrar
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
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
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3 transition-colors">
            <div className="text-sm">
              <Link
                to="/calendar"
                className="font-medium text-brand-orange hover:text-orange-600 dark:hover:text-orange-300"
              >
                Ver eventos del mes
              </Link>
            </div>
          </div>
        </div>

        {/* Card Eventos del Mes */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-brand-orange/20 rounded-full flex items-center justify-center text-brand-orange">
                  <Calendar className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Eventos este Mes
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900 dark:text-white">
                      {loadingMonth ? "..." : eventsThisMonth.length}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3 transition-colors">
            <div className="text-sm">
              <Link
                to="/calendar"
                className="font-medium text-brand-orange hover:text-orange-600 dark:hover:text-orange-300"
              >
                Ver calendario
              </Link>
            </div>
          </div>
        </div>

        {/* Card Alertas de Inventario */}
        <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg transition-colors">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center ${
                    lowStockCount > 0
                      ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                  }`}
                >
                  <Package className="h-6 w-6" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    Alertas de Stock
                  </dt>
                  <dd>
                    <div
                      className={`text-lg font-medium ${
                        lowStockCount > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-900 dark:text-white"
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
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3 transition-colors">
            <div className="text-sm">
              <Link
                to="/inventory"
                className="font-medium text-brand-orange hover:text-orange-600 dark:hover:text-orange-300"
              >
                Ver inventario
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart Section */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Estado de Eventos (Este Mes)
            </h3>
            <div className="h-64 w-full">
                {loadingMonth ? (
                     <div className="h-full flex items-center justify-center">
                        <RefreshCw className="h-8 w-8 animate-spin text-gray-300" />
                     </div>
                ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                            />
                            <Tooltip 
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <Calendar className="h-10 w-10 mb-2 opacity-20" />
                        <p className="text-sm">No hay datos suficientes para graficar</p>
                    </div>
                )}
            </div>
          </div>

          {/* Upcoming Events List */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                Próximos Eventos
                </h3>
                <Link to="/calendar" className="text-sm text-brand-orange hover:text-orange-600 flex items-center">
                    Ver todos <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
            </div>
            
            <div className="flow-root">
                {loadingUpcoming ? (
                <div className="flex justify-center py-4">
                    <Clock className="h-6 w-6 animate-spin text-gray-400" />
                </div>
                ) : upcomingEvents.length > 0 ? (
                    <ul className="-my-5 divide-y divide-gray-200 dark:divide-gray-700">
                        {upcomingEvents.map((event) => (
                            <li key={event.id} className="py-4">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                                            <span className="text-xs font-bold uppercase">
                                                {format(parseISO(event.event_date), "MMM", { locale: es })}
                                            </span>
                                            <span className="text-sm font-bold leading-none">
                                                {format(parseISO(event.event_date), "d")}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                            {event.clients?.name}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                            {event.service_type} • {event.num_people} pax
                                        </p>
                                    </div>
                                    <div>
                                        <Link
                                            to={`/events/${event.id}/edit`}
                                            className="inline-flex items-center shadow-sm px-2.5 py-0.5 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-full text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            Editar
                                        </Link>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No hay eventos próximos agendados.</p>
                        <Link to="/events/new" className="text-brand-orange text-sm font-medium mt-2 inline-block">
                            Agendar uno ahora
                        </Link>
                    </div>
                )}
            </div>
          </div>
      </div>
    </div>
  );
};
