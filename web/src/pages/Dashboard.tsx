import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Event, Payment, InventoryItem } from "../types/entities";
import { addDays, differenceInCalendarDays, endOfMonth, format, startOfMonth } from "date-fns";
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
  UserPlus,
  FileText,
  Zap,
} from "lucide-react";
import { logError } from "../lib/errorHandler";
import { useQueryClient } from "@tanstack/react-query";
import { useEvents, useUpcomingEvents, useEventsByDateRange, useUpdateEventStatus } from "../hooks/queries/useEventQueries";
import { useClients } from "../hooks/queries/useClientQueries";
import { useInventoryItems } from "../hooks/queries/useInventoryQueries";
import { usePaymentsByDateRange, usePaymentsByEventIds, useCreatePayment } from "../hooks/queries/usePaymentQueries";
import { queryKeys } from "../hooks/queries/queryKeys";
import { eventService } from "../services/eventService";
import { Modal } from "../components/Modal";
import { PaymentFormFields, PaymentFormData } from "../components/PaymentFormFields";
import { useToast } from "../hooks/useToast";

// Single source of truth for the "paid enough / has pending balance" cutoff.
// Used by detection logic, the dashboard CTAs, and the financial-critical
// auto-complete guard. Keep in sync with mobile's MIN_PENDING_AMOUNT
// (Android core/dashboard, iOS PendingEventsViewModel).
const PAYMENT_COMPLETION_EPSILON = 0.01;
import {
  getEventNetSales,
  getEventTaxAmount,
  getEventTotalCharged,
} from "../lib/finance";
import { StatusDropdown, EventStatus } from "../components/StatusDropdown";
import { OnboardingChecklist } from "../components/OnboardingChecklist";
import { RecentActivityCard } from "../components/RecentActivityCard";
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
  client?: { name: string } | null;
};

type AttentionAlertTone = "warning" | "error";

interface DashboardAttentionItem {
  event: DashboardEvent;
  detail: string;
  pendingAmount: number;
}

interface DashboardAttentionAlert {
  key: string;
  title: string;
  description: string;
  tone: AttentionAlertTone;
  items: DashboardAttentionItem[];
}

const ATTENTION_TONE_STYLES: Record<AttentionAlertTone, { badge: string; card: string; detail: string }> = {
  warning: {
    badge: "bg-warning/10 text-warning",
    card: "border-warning/20 bg-warning/5",
    detail: "text-warning",
  },
  error: {
    badge: "bg-error/10 text-error",
    card: "border-error/20 bg-error/5",
    detail: "text-error",
  },
};

function parseDashboardEventDate(eventDate: string) {
  return new Date(`${eventDate}T12:00:00`);
}

function getDashboardEventClientName(event: DashboardEvent) {
  return event.client?.name ?? "Sin cliente";
}

// ── Skeleton loader ──────────────────────────────────────────────
function SkeletonKpi({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3 animate-pulse">
        <div className="w-7 h-7 rounded-lg bg-surface-alt shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 bg-surface-alt rounded w-2/3" />
          <div className="h-4 bg-surface-alt rounded w-1/3" />
        </div>
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
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

// ── KPI Card ─────────────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub?: React.ReactNode;
  compact?: boolean;
}
function KpiCard({ icon: Icon, iconBg, iconColor, label, value, sub, compact = false }: KpiCardProps) {
  if (compact) {
    return (
      <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <dt className="text-xs font-medium text-text-secondary leading-none mb-1 truncate">{label}</dt>
          <dd className="text-sm font-bold text-text truncate">{value}</dd>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-card shadow-sm hover:shadow-md border border-border rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <dt className="text-xs font-medium text-text-secondary leading-tight mb-1">
            {label}
          </dt>
          <dd className="text-xl font-bold text-text tracking-tight">{value}</dd>
        </div>
      </div>
      {sub && <div className="text-xs text-text-tertiary border-t border-border pt-3">{sub}</div>}
    </div>
  );
}

// ── Quick Action Link ───────────────────────────────────────────
interface QuickActionLinkProps {
  icon: React.ElementType;
  label: string;
  primary?: boolean;
  onClick?: () => void;
  to?: string;
}

function QuickActionLink({ icon: Icon, label, primary = false, onClick, to }: QuickActionLinkProps) {
  const inner = (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-150 cursor-pointer whitespace-nowrap
      ${primary
        ? "bg-primary text-white border-primary hover:bg-primary-dark"
        : "bg-card border-border text-text hover:bg-surface-alt hover:border-primary/30"
      }`}>
      <Icon className={`h-4 w-4 shrink-0 ${primary ? "text-white" : "text-primary"}`} aria-hidden="true" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
  if (to) return <Link to={to}>{inner}</Link>;
  return <button type="button" onClick={onClick} className="text-left">{inner}</button>;
}

// ── Event Status Bar ────────────────────────────────────────────
interface StatusSegment { name: string; value: number; color: string; }

function EventStatusBar({ data, loading }: { data: StatusSegment[]; loading: boolean }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <RefreshCw className="h-7 w-7 animate-spin text-border" />
      </div>
    );
  }
  if (total === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-text-tertiary">
        <Calendar className="h-12 w-12 opacity-20" />
        <p className="text-sm text-text-secondary">Sin datos para graficar este mes</p>
        <Link to="/events/new" className="text-xs font-semibold text-primary hover:underline">Crear primer evento</Link>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col justify-center gap-6">
      <div className="text-center">
        <span className="text-4xl font-black text-text">{total}</span>
        <p className="text-xs text-text-secondary mt-1">eventos este mes</p>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden w-full" role="img"
        aria-label={`Distribución: ${data.map(d => `${d.name} ${d.value}`).join(', ')}`}>
        {data.map((seg) => (
          <div key={seg.name} className="h-full transition-all duration-500"
            style={{ width: `${(seg.value / total) * 100}%`, backgroundColor: seg.color }}
            title={`${seg.name}: ${seg.value}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
        {data.map((seg) => (
          <div key={seg.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-text-secondary">{seg.name} <span className="font-semibold text-text">{seg.value}</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Upcoming Event Card ─────────────────────────────────────────
function UpcomingEventCard({ event }: { event: DashboardEvent }) {
  const navigate = useNavigate();
  const dateObj = new Date(event.event_date + "T12:00:00");
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all duration-200"
      onClick={() => navigate(`/events/${event.id}/summary`)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/events/${event.id}/summary`); }}>
      <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0"
        style={{ backgroundColor: "var(--color-primary-light)" }}>
        <span className="text-xs font-semibold uppercase text-primary leading-none">{format(dateObj, "MMM", { locale: es })}</span>
        <span className="text-lg font-bold text-primary leading-tight">{format(dateObj, "d")}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{event.client?.name ?? "—"}</p>
        <p className="text-xs text-text-secondary truncate mt-0.5">{event.service_type} · {event.num_people} pax</p>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <StatusDropdown eventId={event.id} currentStatus={event.status as EventStatus} />
      </div>
    </div>
  );
}

// ── Low Stock Card ──────────────────────────────────────────────
function LowStockCard({ item }: { item: InventoryItem }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-3.5 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
        <AlertTriangle className="h-4 w-4 text-error" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text truncate">{item.ingredient_name}</p>
        <p className="text-xs text-text-secondary mt-0.5">
          <span className="font-bold text-error">{item.current_stock}</span>
          <span className="text-text-tertiary">/{item.minimum_stock}</span> {item.unit}
        </p>
      </div>
    </div>
  );
}

interface DashboardAttentionSectionProps {
  alerts: DashboardAttentionAlert[];
  updatingEventId: string | null;
  onComplete: (eventId: string) => void;
  onCancel: (eventId: string) => void;
  onRegisterPayment: (event: DashboardEvent, pendingAmount: number) => void;
}

function AttentionItemCard({
  alertKey,
  item,
  styles,
  updatingEventId,
  onComplete,
  onCancel,
  onRegisterPayment,
}: {
  alertKey: string;
  item: DashboardAttentionItem;
  styles: { detail: string };
  updatingEventId: string | null;
  onComplete: (eventId: string) => void;
  onCancel: (eventId: string) => void;
  onRegisterPayment: (event: DashboardEvent, pendingAmount: number) => void;
}) {
  const { event, detail, pendingAmount } = item;
  const isUpdating = updatingEventId === event.id;
  const hasPending = pendingAmount > PAYMENT_COMPLETION_EPSILON;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text truncate">{getDashboardEventClientName(event)}</p>
          <p className="text-xs text-text-secondary truncate mt-0.5">{event.service_type}</p>
        </div>
        <span className="shrink-0 text-xs text-text-secondary whitespace-nowrap">
          {format(parseDashboardEventDate(event.event_date), "d MMM", { locale: es })}
        </span>
      </div>
      <p className={`text-xs font-semibold mt-1.5 ${styles.detail}`}>{detail}</p>

      <div className="mt-2.5 flex flex-wrap gap-2 items-center">
        {alertKey === "confirmed-payment" && hasPending && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onRegisterPayment(event, pendingAmount)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            Registrar pago
          </button>
        )}

        {alertKey === "past-active" && hasPending && (
          <>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onRegisterPayment(event, pendingAmount)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              Pagar y completar
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onCancel(event.id)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-error/40 text-error hover:bg-error/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onComplete(event.id)}
              className="text-xs font-semibold text-text-secondary hover:text-text underline-offset-2 hover:underline disabled:opacity-50"
            >
              Solo completar
            </button>
          </>
        )}

        {alertKey === "past-active" && !hasPending && (
          <>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onComplete(event.id)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-success text-white hover:bg-success/90 transition-colors disabled:opacity-50"
            >
              Completar
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onCancel(event.id)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-error/40 text-error hover:bg-error/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
          </>
        )}

        <Link
          to={`/events/${event.id}/summary`}
          className="text-xs font-semibold text-primary hover:underline ml-auto inline-flex items-center gap-1"
        >
          Ver detalle <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function DashboardAttentionSection({
  alerts,
  updatingEventId,
  onComplete,
  onCancel,
  onRegisterPayment,
}: DashboardAttentionSectionProps) {
  if (alerts.length === 0) return null;

  const totalAlerts = alerts.reduce((sum, alert) => sum + alert.items.length, 0);

  return (
    <section className="bg-card shadow-sm border border-warning/30 rounded-2xl overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-border">
        <div className="flex items-start gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4.5 w-4.5 text-warning" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-text">Requieren atención</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Eventos próximos o vencidos con seguimiento pendiente.
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-warning/10 text-warning">
          {totalAlerts} alerta{totalAlerts === 1 ? "" : "s"}
        </span>
      </div>

      <div className="p-4 grid grid-cols-1 xl:grid-cols-3 gap-3">
        {alerts.map((alert) => {
          const styles = ATTENTION_TONE_STYLES[alert.tone];

          return (
            <div key={alert.key} className={`rounded-xl border p-4 ${styles.card}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">{alert.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{alert.description}</p>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${styles.badge}`}>
                  {alert.items.length}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {alert.items.slice(0, 3).map((item) => (
                  <AttentionItemCard
                    key={item.event.id}
                    alertKey={alert.key}
                    item={item}
                    styles={styles}
                    updatingEventId={updatingEventId}
                    onComplete={onComplete}
                    onCancel={onCancel}
                    onRegisterPayment={onRegisterPayment}
                  />
                ))}

                {alert.items.length > 3 && (
                  <Link to="/calendar" className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    Ver {alert.items.length - 3} más <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function fmt(n: number) {
  return `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;
}

// ────────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const { user, checkAuth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const firstName = user?.name ? user.name.split(" ")[0] : "Usuario";

  const { isBasicPlan, canCreateEvent, eventsThisMonth, limit } = usePlanLimits();

  // ── Date range for current month ──
  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => format(startOfMonth(today), "yyyy-MM-dd"), [today]);
  const monthEnd = useMemo(() => format(endOfMonth(today), "yyyy-MM-dd"), [today]);

  // ── Queries via React Query (cached, parallel, automatic) ──
  // NOTE: ?? [] instead of = [] — destructuring defaults only catch undefined, not null
  const { data: _eventsMonth, isLoading: loadingMonth } = useEventsByDateRange(monthStart, monthEnd);
  const { data: _upcoming, isLoading: loadingUpcoming } = useUpcomingEvents(5);
  const { data: _allEvents, isLoading: loadingAttention } = useEvents();
  const { data: _inventory, isLoading: loadingInventory } = useInventoryItems();
  const { data: _clients, isLoading: loadingClients } = useClients();
  const { data: _paymentsMonth } = usePaymentsByDateRange(monthStart, monthEnd);

  const eventsThisMonthList = _eventsMonth ?? [];
  const upcomingEvents = _upcoming ?? [];
  const allEvents = _allEvents ?? [];
  const inventoryData = _inventory ?? [];
  const clients = _clients ?? [];
  const paymentsInMonth = _paymentsMonth ?? [];

  const attentionEvents = allEvents as DashboardEvent[];
  const clientCount = clients.length;
  const error: string | null = null;

  // ── Derived: low stock items ──
  const lowStockItems = useMemo(
    () => inventoryData.filter((item) => item.minimum_stock > 0 && item.current_stock <= item.minimum_stock),
    [inventoryData],
  );
  const lowStockCount = lowStockItems.length;

  // ── Derived: realized event IDs for payment query ──
  const realizedEvents = useMemo(
    () => eventsThisMonthList.filter((e) => e.status === "confirmed" || e.status === "completed"),
    [eventsThisMonthList],
  );
  const realizedEventIds = useMemo(() => realizedEvents.map((e) => e.id), [realizedEvents]);
  const { data: _eventPayments } = usePaymentsByEventIds(realizedEventIds);
  const eventPayments = _eventPayments ?? [];

  // ── Derived: attention event IDs for payment query ──
  // Includes confirmed events in the next 7 days AND past-active events
  // so the saldo pendiente is available for both categories (used by the
  // dashboard's pay+complete CTA on past-active events with balance).
  const attentionCandidateIds = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const confirmedCutoff = addDays(todayStart, 7);
    return attentionEvents
      .filter((event) => {
        const eventDate = parseDashboardEventDate(event.event_date);
        const isConfirmedSoon =
          event.status === "confirmed" && eventDate >= todayStart && eventDate <= confirmedCutoff;
        const isPastActive =
          eventDate < todayStart && (event.status === "quoted" || event.status === "confirmed");
        return isConfirmedSoon || isPastActive;
      })
      .map((event) => event.id);
  }, [attentionEvents]);
  const { data: _attentionPayments } = usePaymentsByEventIds(attentionCandidateIds);
  const attentionPayments = _attentionPayments ?? [];

  // ── Derived: financial metrics (pure computation from cached data) ──
  const netSalesThisMonth = useMemo(
    () => realizedEvents.reduce((sum, event) => sum + getEventNetSales(event), 0),
    [realizedEvents],
  );

  const cashCollectedThisMonth = useMemo(
    () => (paymentsInMonth || []).reduce((sum: number, p: Payment) => sum + Number(p.amount || 0), 0),
    [paymentsInMonth],
  );

  const paidByEvent = useMemo(() => {
    const map: Record<string, number> = {};
    eventPayments.forEach((p: Payment) => {
      map[p.event_id] = (map[p.event_id] || 0) + Number(p.amount || 0);
    });
    return map;
  }, [eventPayments]);

  const vatCollectedThisMonth = useMemo(() =>
    realizedEvents.reduce((sum, event) => {
      const totalCharged = getEventTotalCharged(event);
      const paid = paidByEvent[event.id] || 0;
      const ratio = totalCharged > 0 ? Math.min(paid / totalCharged, 1) : 0;
      return sum + getEventTaxAmount(event) * ratio;
    }, 0),
  [realizedEvents, paidByEvent]);

  const vatOutstandingThisMonth = useMemo(() =>
    realizedEvents.reduce((sum, event) => {
      const totalCharged = getEventTotalCharged(event);
      const paid = paidByEvent[event.id] || 0;
      const ratio = totalCharged > 0 ? Math.min(paid / totalCharged, 1) : 0;
      const vat = getEventTaxAmount(event);
      return sum + (vat - vat * ratio);
    }, 0),
  [realizedEvents, paidByEvent]);

  const attentionPaidByEvent = useMemo(() => {
    const map: Record<string, number> = {};
    attentionPayments.forEach((payment: Payment) => {
      map[payment.event_id] = (map[payment.event_id] || 0) + Number(payment.amount || 0);
    });
    return map;
  }, [attentionPayments]);

  useEffect(() => {
    if (searchParams.has("session_id")) {
      checkAuth();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, checkAuth, setSearchParams]);

  // ── Attention actions: complete, cancel, register-payment-and-complete ──
  // shouldAutoComplete is precomputed at modal-open time using a day-based
  // comparison against todayStart (00:00) — comparing parseDashboardEventDate
  // (which sets T12:00) against `new Date()` would flip at midday, so we
  // store the decision in state and read from there.
  const updateStatusMutation = useUpdateEventStatus();
  const createPaymentMutation = useCreatePayment();
  const [updatingEventId, setUpdatingEventId] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<{
    event: DashboardEvent;
    pendingAmount: number;
    shouldAutoComplete: boolean;
  } | null>(null);
  const { addToast } = useToast();

  const handleCompleteEvent = async (eventId: string) => {
    setUpdatingEventId(eventId);
    try {
      await updateStatusMutation.mutateAsync({ id: eventId, status: "completed" });
      addToast("Evento marcado como completado.", "success");
    } catch (err) {
      logError("Error completing event from dashboard", err);
    } finally {
      setUpdatingEventId(null);
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    setUpdatingEventId(eventId);
    try {
      await updateStatusMutation.mutateAsync({ id: eventId, status: "cancelled" });
      addToast("Evento cancelado.", "success");
    } catch (err) {
      logError("Error cancelling event from dashboard", err);
    } finally {
      setUpdatingEventId(null);
    }
  };

  const handleOpenPaymentModal = (event: DashboardEvent, pendingAmount: number) => {
    const eventDate = parseDashboardEventDate(event.event_date);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const shouldAutoComplete = eventDate < todayStart && pendingAmount > PAYMENT_COMPLETION_EPSILON;
    setPaymentModal({ event, pendingAmount, shouldAutoComplete });
  };

  const queryClient = useQueryClient();

  const handlePayAndComplete = async (data: PaymentFormData) => {
    if (!paymentModal) return;
    const { event, pendingAmount, shouldAutoComplete } = paymentModal;
    const willAutoComplete =
      shouldAutoComplete && data.amount >= pendingAmount - PAYMENT_COMPLETION_EPSILON;

    setUpdatingEventId(event.id);
    try {
      await createPaymentMutation.mutateAsync({
        event_id: event.id,
        amount: data.amount,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        notes: data.notes,
      });

      if (willAutoComplete) {
        // Bypass useUpdateEventStatus here: its onError shows a generic
        // error toast that would compete with the recovery info toast
        // below (Copilot review). We still mirror the hook's invalidations.
        try {
          await eventService.update(event.id, { status: "completed" });
          queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(event.id) });
          queryClient.invalidateQueries({ queryKey: queryKeys.events.upcoming(5) });
          addToast("Evento marcado como completado.", "success");
        } catch (statusErr) {
          logError("Error updating status after payment", statusErr);
          addToast("Pago registrado. Marcá el evento como completado manualmente.", "info");
        }
      } else if (shouldAutoComplete && !willAutoComplete) {
        addToast(
          "Pago parcial registrado. Pagá el saldo completo para marcar el evento como completado.",
          "info",
        );
      }
      setPaymentModal(null);
    } catch (err) {
      logError("Error registering payment from dashboard", err);
    } finally {
      setUpdatingEventId(null);
    }
  };

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

  const attentionAlerts = React.useMemo<DashboardAttentionAlert[]>(() => {
    if (loadingAttention || attentionEvents.length === 0) return [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const paymentCutoff = addDays(todayStart, 7);
    const quoteCutoff = addDays(todayStart, 14);

    const confirmedWithPendingPayment = attentionEvents
      .filter((event) => {
        const eventDate = parseDashboardEventDate(event.event_date);
        if (event.status !== "confirmed" || eventDate < todayStart || eventDate > paymentCutoff) return false;

        const totalCharged = getEventTotalCharged(event);
        const totalPaid = attentionPaidByEvent[event.id] || 0;
        return totalCharged - totalPaid > PAYMENT_COMPLETION_EPSILON;
      })
      .sort((a, b) => parseDashboardEventDate(a.event_date).getTime() - parseDashboardEventDate(b.event_date).getTime())
      .map((event) => {
        const totalCharged = getEventTotalCharged(event);
        const totalPaid = attentionPaidByEvent[event.id] || 0;
        const pendingAmount = Math.max(totalCharged - totalPaid, 0);

        return {
          event,
          detail: `Saldo pendiente ${fmt(pendingAmount)} de ${fmt(totalCharged)}`,
          pendingAmount,
        };
      });

    const pastActiveEvents = attentionEvents
      .filter((event) => {
        const eventDate = parseDashboardEventDate(event.event_date);
        return eventDate < todayStart && (event.status === "quoted" || event.status === "confirmed");
      })
      .sort((a, b) => parseDashboardEventDate(a.event_date).getTime() - parseDashboardEventDate(b.event_date).getTime())
      .map((event) => {
        const totalCharged = getEventTotalCharged(event);
        const totalPaid = attentionPaidByEvent[event.id] || 0;
        const pendingAmount = Math.max(totalCharged - totalPaid, 0);
        const baseDetail = event.status === "confirmed" ? "Evento pasado aún confirmado" : "Cotización vencida sin cerrar";
        const detail = pendingAmount > PAYMENT_COMPLETION_EPSILON ? `${baseDetail} · saldo ${fmt(pendingAmount)}` : baseDetail;

        return { event, detail, pendingAmount };
      });

    const quotesWithoutConfirmation = attentionEvents
      .filter((event) => {
        const eventDate = parseDashboardEventDate(event.event_date);
        return event.status === "quoted" && eventDate >= todayStart && eventDate <= quoteCutoff;
      })
      .sort((a, b) => parseDashboardEventDate(a.event_date).getTime() - parseDashboardEventDate(b.event_date).getTime())
      .map((event) => {
        const daysUntilEvent = differenceInCalendarDays(parseDashboardEventDate(event.event_date), todayStart);

        return {
          event,
          detail: daysUntilEvent === 0
            ? "La fecha del evento es hoy y sigue sin confirmar"
            : `Faltan ${daysUntilEvent} día(s) para confirmar`,
          pendingAmount: 0,
        };
      });

    return [
      {
        key: "confirmed-payment",
        title: "Cobros por cerrar",
        description: "Eventos confirmados dentro de 7 días con pago incompleto.",
        tone: "warning" as const,
        items: confirmedWithPendingPayment,
      },
      {
        key: "past-active",
        title: "Eventos vencidos",
        description: "Eventos pasados que siguen activos en flujo comercial u operativo.",
        tone: "error" as const,
        items: pastActiveEvents,
      },
      {
        key: "quoted-soon",
        title: "Cotizaciones urgentes",
        description: "Eventos dentro de 14 días que todavía no fueron confirmados.",
        tone: "warning" as const,
        items: quotesWithoutConfirmation,
      },
    ].filter((alert) => alert.items.length > 0);
  }, [attentionEvents, attentionPaidByEvent, loadingAttention]);

  const tooltipStyle = {
    borderRadius: "12px",
    border: "1px solid var(--color-border)",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
    backgroundColor: "var(--color-card)",
    color: "var(--color-text)",
    padding: "10px 14px",
  };

  const currentMonthLabel = format(new Date(), "MMMM yyyy", { locale: es });

  return (
    <div className="flex flex-col gap-8">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Hola, {firstName}</h1>
          <p className="text-sm text-text-secondary mt-0.5 first-letter:uppercase">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
      </div>

      {/* ── ERROR ── */}
      {error && (
        <div className="flex items-start gap-3 bg-error/5 border border-error/30 text-error rounded-xl p-4" role="alert">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 text-sm">{error}</div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-xs font-bold underline underline-offset-2 shrink-0"
          >
            Recargar
          </button>
        </div>
      )}

      <OnboardingChecklist />

      {isBasicPlan && (
        <UpgradeBanner
          type={!canCreateEvent ? "limit-reached" : "upsell"}
          currentUsage={eventsThisMonth}
          limit={limit}
        />
      )}

      {/* ── ALERTAS DE ATENCIÓN ── */}
      <DashboardAttentionSection
        alerts={attentionAlerts}
        updatingEventId={updatingEventId}
        onComplete={handleCompleteEvent}
        onCancel={handleCancelEvent}
        onRegisterPayment={handleOpenPaymentModal}
      />

      {/* ── PAGO + COMPLETAR (modal) ── */}
      {paymentModal && (
        <Modal
          isOpen
          onClose={() => setPaymentModal(null)}
          title={paymentModal.shouldAutoComplete ? "Registrar pago y completar" : "Registrar pago"}
          maxWidth="2xl"
          titleId="dashboard-payment-modal-title"
        >
          <PaymentFormFields
            initialAmount={paymentModal.pendingAmount}
            saldoAmount={paymentModal.pendingAmount > 0 ? paymentModal.pendingAmount : undefined}
            submitLabel={paymentModal.shouldAutoComplete ? "Pagar y completar" : "Registrar pago"}
            isSubmitting={createPaymentMutation.isPending || updatingEventId === paymentModal.event.id}
            onCancel={() => setPaymentModal(null)}
            onSubmit={handlePayAndComplete}
          />
        </Modal>
      )}

      {/* ── MÉTRICAS + ACCIONES ── */}
      <section className="flex flex-col gap-3">
        {/* Section label */}
        <p className="text-xs font-semibold text-text-tertiary first-letter:uppercase">{currentMonthLabel}</p>

        {/* Primary KPIs — the 4 metrics checked every morning */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(loadingMonth || loadingClients) ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonKpi key={i} />)
          ) : (
            <>
              <KpiCard
                icon={TrendingUp}
                iconBg="bg-primary/10"
                iconColor="text-primary"
                label="Ventas Netas"
                value={fmt(netSalesThisMonth)}
                sub="Confirmados y completados"
              />
              <KpiCard
                icon={DollarSign}
                iconBg="bg-primary/10"
                iconColor="text-primary"
                label="Cobrado"
                value={fmt(cashCollectedThisMonth)}
                sub="Pagos recibidos este mes"
              />
              <KpiCard
                icon={Calendar}
                iconBg="bg-primary/10"
                iconColor="text-primary"
                label="Eventos"
                value={String(eventsThisMonthList.length)}
                sub="Este mes"
              />
              <KpiCard
                icon={FileText}
                iconBg={eventsThisMonthList.filter(e => e.status === 'quoted').length > 0 ? "bg-warning/10" : "bg-surface-alt"}
                iconColor={eventsThisMonthList.filter(e => e.status === 'quoted').length > 0 ? "text-warning" : "text-text-tertiary"}
                label="Cotizaciones"
                value={String(eventsThisMonthList.filter(e => e.status === 'quoted').length)}
                sub="Pendientes de confirmar"
              />
            </>
          )}
        </div>

        {/* Secondary KPIs — detail / supporting metrics */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {(loadingMonth || loadingClients) ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonKpi key={i} compact />)
          ) : (
            <>
              <KpiCard compact
                icon={FileCheck}
                iconBg="bg-surface-alt"
                iconColor="text-text-secondary"
                label="IVA Cobrado"
                value={fmt(vatCollectedThisMonth)}
              />
              <KpiCard compact
                icon={AlertTriangle}
                iconBg={vatOutstandingThisMonth > 0 ? "bg-error/10" : "bg-surface-alt"}
                iconColor={vatOutstandingThisMonth > 0 ? "text-error" : "text-text-secondary"}
                label="IVA Pendiente"
                value={fmt(vatOutstandingThisMonth)}
              />
              <KpiCard compact
                icon={Package}
                iconBg={lowStockCount > 0 ? "bg-error/10" : "bg-surface-alt"}
                iconColor={lowStockCount > 0 ? "text-error" : "text-text-secondary"}
                label="Stock Bajo"
                value={lowStockCount > 0 ? `${lowStockCount} ítems` : "Sin alertas"}
              />
              <KpiCard compact
                icon={Users}
                iconBg="bg-surface-alt"
                iconColor="text-text-secondary"
                label="Clientes"
                value={String(clientCount)}
              />
            </>
          )}
        </div>

        {/* Quick Actions — subordinate strip, not competing cards */}
        <div className="flex flex-wrap gap-2 pt-1">
          <QuickActionLink icon={Plus} label="Nuevo Evento" primary to="/events/new" />
          <QuickActionLink icon={Zap} label="Cotización Rápida" to="/cotizacion-rapida" />
          <QuickActionLink icon={UserPlus} label="Nuevo Cliente" to="/clients/new" />
          <QuickActionLink icon={Package} label="Nuevo Producto" to="/products/new" />
        </div>
      </section>

      {/* ── CHARTS ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Financial Comparison */}
        <div className="bg-card shadow-sm border border-border rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-text">Comparativa Financiera</h3>
            <span className="text-xs text-text-tertiary bg-surface-alt px-3 py-1 rounded-full first-letter:uppercase">{currentMonthLabel}</span>
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
        <div className="bg-card shadow-sm border border-border rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-text">Estado de Eventos</h3>
            <span className="text-xs text-text-tertiary bg-surface-alt px-3 py-1 rounded-full first-letter:uppercase">{currentMonthLabel}</span>
          </div>
          <EventStatusBar data={chartData} loading={loadingMonth} />
        </div>
      </div>

      {/* ── LOW STOCK ── */}
      {lowStockItems.length > 0 && (
        <div className="bg-card shadow-sm border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-3.5 w-3.5 text-error" />
              </span>
              Inventario crítico
              <span className="ml-1 text-xs font-semibold bg-error/10 text-error px-2 py-0.5 rounded-full">{lowStockItems.length}</span>
            </h3>
            <Link to="/inventory" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
              Ver todo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {lowStockItems.map((item) => <LowStockCard key={item.id} item={item} />)}
          </div>
        </div>
      )}

      {/* ── UPCOMING EVENTS ── */}
      <div className="bg-card shadow-sm border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-text">Próximos Eventos</h3>
          <Link to="/calendar" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {loadingUpcoming ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-surface-alt shrink-0" />
                <div className="flex-1 space-y-2"><div className="h-3.5 bg-surface-alt rounded w-1/3" /><div className="h-3 bg-surface rounded w-1/4" /></div>
                <div className="w-16 h-6 bg-surface-alt rounded-full" />
              </div>
            ))}
          </div>
        ) : upcomingEvents.length > 0 ? (
          <div className="p-4 space-y-3">
            {upcomingEvents.map((event) => (
              <UpcomingEventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-surface-alt flex items-center justify-center">
              <Clock className="h-7 w-7 text-text-tertiary opacity-50" />
            </div>
            <p className="text-sm text-text-secondary">No hay eventos próximos agendados</p>
            <Link to="/events/new" className="text-sm font-bold text-primary hover:underline">Agendar uno ahora →</Link>
          </div>
        )}
      </div>

      {/* ── RECENT ACTIVITY ── */}
      <RecentActivityCard />
    </div>
  );
};
