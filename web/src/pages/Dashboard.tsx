import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Event, Payment, InventoryItem } from "../types/entities";
import { addDays, format, startOfMonth, endOfMonth } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { useInventoryItems } from "../hooks/queries/useInventoryQueries";
import { usePaymentsByEventIds, useCreatePayment } from "../hooks/queries/usePaymentQueries";
import {
  useDashboardEventsByStatus,
  useDashboardKpis,
  useDashboardRevenueChart,
} from "../hooks/queries/useDashboardQueries";
import type { DashboardRevenuePoint } from "../types/dashboard";
import { queryKeys } from "../hooks/queries/queryKeys";
import { eventService } from "../services/eventService";
import { Modal } from "../components/Modal";
import { PaymentFormFields, PaymentFormData } from "../components/PaymentFormFields";
import { useToast } from "../hooks/useToast";
import { getEventTotalCharged } from "../lib/finance";
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
} from "recharts";

const PAYMENT_COMPLETION_EPSILON = 0.01;

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
          <dt className="text-xs font-medium text-text-secondary leading-tight mb-1 truncate">
            {label}
          </dt>
          <dd className="text-base sm:text-xl font-bold text-text tracking-tight truncate">{value}</dd>
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
  const { t } = useTranslation(['dashboard', 'common']);
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
        <p className="text-sm text-text-secondary">{t('dashboard:status_chart.no_data')}</p>
        <Link to="/events/new" className="text-xs font-semibold text-primary hover:underline">{t('dashboard:status_chart.create_first')}</Link>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col justify-center gap-6">
      <div className="text-center">
        <span className="text-4xl font-black text-text">{total}</span>
        <p className="text-xs text-text-secondary mt-1">{t('dashboard:status_chart.events_this_month')}</p>
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
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const dateObj = new Date(event.event_date + "T12:00:00");
  const dateLocale = i18n.language === 'en' ? enUS : es;

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all duration-200"
      onClick={() => navigate(`/events/${event.id}/summary`)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/events/${event.id}/summary`); }}>
      <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0"
        style={{ backgroundColor: "var(--color-primary-light)" }}>
        <span className="text-xs font-semibold uppercase text-primary leading-none">{format(dateObj, "MMM", { locale: dateLocale })}</span>
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
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { event, detail, pendingAmount } = item;
  const isUpdating = updatingEventId === event.id;
  const hasPending = pendingAmount > PAYMENT_COMPLETION_EPSILON;
  const dateLocale = i18n.language === 'en' ? enUS : es;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text truncate">{event.client?.name ?? t('dashboard:event.no_client')}</p>
          <p className="text-xs text-text-secondary truncate mt-0.5">{event.service_type}</p>
        </div>
        <span className="shrink-0 text-xs text-text-secondary whitespace-nowrap">
          {format(parseDashboardEventDate(event.event_date), "d MMM", { locale: dateLocale })}
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
            {t('dashboard:attention.register_payment')}
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
              {t('dashboard:attention.pay_and_complete')}
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onCancel(event.id)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-error/40 text-error hover:bg-error/10 transition-colors disabled:opacity-50"
            >
              {t('common:action.cancel')}
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onComplete(event.id)}
              className="text-xs font-semibold text-text-secondary hover:text-text underline-offset-2 hover:underline disabled:opacity-50"
            >
              {t('dashboard:attention.complete_only')}
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
              {t('common:action.complete')}
            </button>
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onCancel(event.id)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-error/40 text-error hover:bg-error/10 transition-colors disabled:opacity-50"
            >
              {t('common:action.cancel')}
            </button>
          </>
        )}

        <Link
          to={`/events/${event.id}/summary`}
          className="text-xs font-semibold text-primary hover:underline ml-auto inline-flex items-center gap-1"
        >
          {t('dashboard:attention.view_detail')} <ArrowRight className="h-3 w-3" />
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
  const { t } = useTranslation(['dashboard', 'common']);
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
            <h2 className="text-sm font-semibold text-text">{t('dashboard:attention.title')}</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {t('dashboard:attention.description')}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-warning/10 text-warning">
          {t('dashboard:attention.alerts_count', { count: totalAlerts })}
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
                    {t('common:action.view')} {alert.items.length - 3} {t('common:action.more')} <ArrowRight className="h-3.5 w-3.5" />
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

// ── Monthly Revenue Trend Card (premium only) ────────────────────
function MonthlyRevenueTrendCard({ points }: { points: DashboardRevenuePoint[] }) {
  const { t, i18n } = useTranslation(['dashboard']);

  const chartData = useMemo(() => {
    const monthLabels = i18n.language === 'en' 
      ? ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
      : ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const byMonth = new Map(points.map((p) => [p.month, p.revenue]));
    const today = new Date();
    const bars: { name: string; value: number }[] = [];
    for (let offset = 5; offset >= 0; offset--) {
      const d = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = monthLabels[d.getMonth()];
      bars.push({
        name: label.charAt(0).toUpperCase() + label.slice(1),
        value: byMonth.get(key) ?? 0,
      });
    }
    return bars;
  }, [points, i18n.language]);

  const moneyLocale = i18n.language === 'en' ? 'en-US' : 'es-MX';

  return (
    <div className="bg-card shadow-sm border border-border rounded-2xl p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-text">{t('dashboard:revenue_chart.title')}</h3>
      </div>
      <div className="h-60 w-full" role="img" aria-label={t('dashboard:revenue_chart.aria_label')}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" opacity={0.5} />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }}
              tickFormatter={(value: number) => value === 0 ? "$0" : `${Math.round(value / 1000)}k`}
              width={48}
            />
            <Tooltip
              formatter={(value: number) => [`$${value.toLocaleString(moneyLocale)}`, t('dashboard:revenue_chart.revenue')]}
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "0.5rem",
                fontSize: "0.75rem",
              }}
              cursor={{ fill: "var(--color-surface-alt)" }}
            />
            <Bar dataKey="value" fill="var(--color-primary)" radius={[6, 6, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const { user, checkAuth } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const firstName = user?.name ? user.name.split(" ")[0] : t('common:user');
  const navigate = useNavigate();

  const { isBasicPlan, eventsThisMonth, eventLimit: limit } = usePlanLimits();

  const moneyLocale = i18n.language === 'en' ? 'en-US' : 'es-MX';
  const fmt = useCallback((n: number) => `$${n.toLocaleString(moneyLocale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, [moneyLocale]);

  // ── Date range for current month ──
  const today = useMemo(() => new Date(), []);
  const monthStart = useMemo(() => format(startOfMonth(today), "yyyy-MM-dd"), [today]);
  const monthEnd = useMemo(() => format(endOfMonth(today), "yyyy-MM-dd"), [today]);

  const { isLoading: loadingMonth } = useEventsByDateRange(monthStart, monthEnd);
  const { data: _upcoming, isLoading: loadingUpcoming } = useUpcomingEvents(5);
  const { data: _allEvents, isLoading: loadingAttention } = useEvents();
  const { data: _inventory, isLoading: loadingInventory } = useInventoryItems();

  const { data: kpis } = useDashboardKpis();
  const { data: revenueChartData } = useDashboardRevenueChart("year", !isBasicPlan);
  const { data: statusCountsData } = useDashboardEventsByStatus("month");

  // Using _clients directly if needed or keep it as _clients
  const upcomingEvents = _upcoming ?? [];
  const attentionEvents = useMemo(() => (_allEvents ?? []) as DashboardEvent[], [_allEvents]);

  // ── Derived: low stock items ──
  const lowStockItems = useMemo(
    () => (_inventory ?? []).filter((item) => item.minimum_stock > 0 && item.current_stock <= item.minimum_stock),
    [_inventory],
  );

  // ── Derived: attention event IDs for payment query ──
  const attentionCandidateIds = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const confirmedCutoff = addDays(todayStart, 7);
    return (_allEvents ?? [])
      .filter((event: DashboardEvent) => {
        const eventDate = parseDashboardEventDate(event.event_date);
        const isConfirmedSoon =
          event.status === "confirmed" && eventDate >= todayStart && eventDate <= confirmedCutoff;
        const isPastActive =
          eventDate < todayStart && (event.status === "quoted" || event.status === "confirmed");
        return isConfirmedSoon || isPastActive;
      })
      .map((event: DashboardEvent) => event.id);
  }, [_allEvents]);
  const { data: _attentionPayments } = usePaymentsByEventIds(attentionCandidateIds);

  const attentionPaidByEvent = useMemo(() => {
    const map: Record<string, number> = {};
    (_attentionPayments ?? []).forEach((payment: Payment) => {
      map[payment.event_id] = (map[payment.event_id] || 0) + Number(payment.amount || 0);
    });
    return map;
  }, [_attentionPayments]);

  const netSalesThisMonth = kpis?.net_sales_this_month ?? 0;
  const cashCollectedThisMonth = kpis?.cash_collected_this_month ?? 0;
  const vatOutstandingThisMonth = kpis?.vat_outstanding_this_month ?? 0;

  useEffect(() => {
    if (searchParams.has("session_id")) {
      checkAuth();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, checkAuth, setSearchParams]);

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
      addToast(t('dashboard:messages.event_completed'), "success");
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
      addToast(t('dashboard:messages.event_cancelled'), "success");
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
        try {
          await eventService.update(event.id, { status: "completed" });
          queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(event.id) });
          queryClient.invalidateQueries({ queryKey: queryKeys.events.upcoming(5) });
          addToast(t('dashboard:messages.event_completed'), "success");
        } catch (statusErr) {
          logError("Error updating status after payment", statusErr);
          addToast(t('dashboard:messages.payment_complete_manual'), "info");
        }
      } else if (shouldAutoComplete && !willAutoComplete) {
        addToast(t('dashboard:messages.payment_partial'), "info");
      }
      setPaymentModal(null);
    } catch (err) {
      logError("Error registering payment from dashboard", err);
    } finally {
      setUpdatingEventId(null);
    }
  };



  const statusChartData = useMemo<StatusSegment[]>(() => {
    const buckets = [
      { status: "quoted" as const,    name: t('common:status.quoted'),    color: "var(--color-status-quoted)" },
      { status: "confirmed" as const, name: t('common:status.confirmed'), color: "var(--color-status-confirmed)" },
      { status: "completed" as const, name: t('common:status.completed'), color: "var(--color-status-completed)" },
      { status: "cancelled" as const, name: t('common:status.cancelled'), color: "var(--color-status-cancelled)" },
    ];
    const byStatus = new Map<string, number>(
      (statusCountsData ?? []).map((row) => [row.status, row.count])
    );
    return buckets
      .map((b) => ({ name: b.name, value: byStatus.get(b.status) ?? 0, color: b.color }))
      .filter((d) => d.value > 0);
  }, [statusCountsData, t]);

  const attentionAlerts = useMemo<DashboardAttentionAlert[]>(() => {
    if (loadingAttention || attentionEvents.length === 0) return [];

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const paymentCutoff = addDays(todayStart, 7);

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
          detail: t('dashboard:attention.pending_balance', { pending: fmt(pendingAmount), total: fmt(totalCharged) }),
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
        const baseDetail = event.status === "confirmed" ? t('dashboard:attention.past_confirmed') : t('dashboard:attention.past_quoted');
        const detail = pendingAmount > PAYMENT_COMPLETION_EPSILON ? `${baseDetail} · ${t('common:status.pending').toLowerCase()} ${fmt(pendingAmount)}` : baseDetail;

        return { event, detail, pendingAmount };
      });

    const alerts: DashboardAttentionAlert[] = [];
    if (confirmedWithPendingPayment.length > 0) {
      alerts.push({
        key: "confirmed-payment",
        title: t('dashboard:attention.confirmed_payment_title'),
        description: t('dashboard:attention.confirmed_payment_desc'),
        tone: "warning",
        items: confirmedWithPendingPayment,
      });
    }
    if (pastActiveEvents.length > 0) {
      alerts.push({
        key: "past-active",
        title: t('dashboard:attention.past_active_title'),
        description: t('dashboard:attention.past_active_desc'),
        tone: "error",
        items: pastActiveEvents,
      });
    }
    return alerts;
  }, [loadingAttention, attentionEvents, attentionPaidByEvent, t, fmt]);

  return (
    <div className="space-y-8 pb-12">
      {/* ── HEADER & QUICK ACTIONS ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-text tracking-tight mb-2">
            {t('dashboard:welcome', { name: firstName })}
          </h1>
          <p className="text-text-secondary text-sm font-medium">
            {format(today, "EEEE, d 'de' MMMM", { locale: i18n.language === 'en' ? enUS : es })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <QuickActionLink
            icon={Plus}
            label={t('common:quick_actions.new_event')}
            primary
            to="/events/new"
          />
          <QuickActionLink
            icon={UserPlus}
            label={t('common:quick_actions.new_client')}
            to="/clients/new"
          />
          <QuickActionLink
            icon={Zap}
            label={t('common:quick_actions.quick_quote')}
            to="/cotizacion-rapida"
          />
        </div>
      </div>

      <OnboardingChecklist />
      <UpgradeBanner type="upsell" currentUsage={eventsThisMonth} limit={limit} />

      {/* ── ATTENTION SECTION ── */}
      <DashboardAttentionSection
        alerts={attentionAlerts}
        updatingEventId={updatingEventId}
        onComplete={handleCompleteEvent}
        onCancel={handleCancelEvent}
        onRegisterPayment={handleOpenPaymentModal}
      />

      {/* ── MAIN KPI GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {loadingMonth ? (
          <>
            <SkeletonKpi />
            <SkeletonKpi />
            <SkeletonKpi />
            <SkeletonKpi />
          </>
        ) : (
          <>
            <KpiCard
              icon={TrendingUp}
              iconBg="bg-success/10"
              iconColor="text-success"
              label={t('dashboard:kpis.net_sales')}
              value={fmt(netSalesThisMonth)}
            />
            <KpiCard
              icon={DollarSign}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              label={t('dashboard:kpis.cash_collected')}
              value={fmt(cashCollectedThisMonth)}
            />
            <KpiCard
              icon={AlertTriangle}
              iconBg="bg-error/10"
              iconColor="text-error"
              label={t('dashboard:kpis.vat_outstanding')}
              value={fmt(vatOutstandingThisMonth)}
            />
            <KpiCard
              icon={Calendar}
              iconBg="bg-info/10"
              iconColor="text-info"
              label={t('dashboard:kpis.active_events')}
              value={String(eventsThisMonth)}
              sub={`${eventsThisMonth} / ${limit === -1 ? "∞" : limit} ${t('common:nav.events').toLowerCase()}`}
            />
          </>
        )}
      </div>

      {/* ── CHARTS & LISTS GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Charts */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card shadow-sm border border-border rounded-2xl p-6 flex flex-col h-100">
              <h3 className="text-sm font-semibold text-text mb-6">{t('dashboard:status_chart.title')}</h3>
              <EventStatusBar data={statusChartData} loading={loadingMonth} />
            </div>

            {revenueChartData && <MonthlyRevenueTrendCard points={revenueChartData} />}
            {!revenueChartData && !isBasicPlan && (
               <div className="bg-card shadow-sm border border-border rounded-2xl p-6 flex items-center justify-center h-100">
                 <RefreshCw className="h-6 w-6 animate-spin text-border" />
               </div>
            )}
            {isBasicPlan && (
               <div className="bg-card shadow-sm border border-border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 h-100">
                 <div className="w-12 h-12 rounded-full bg-surface-alt flex items-center justify-center">
                   <TrendingUp className="h-6 w-6 text-text-tertiary" />
                 </div>
                 <div className="max-w-50">
                   <p className="text-sm font-bold text-text mb-1">Tendencias Pro</p>
                   <p className="text-xs text-text-secondary leading-relaxed">
                     Mejorá tu plan para ver gráficos de ingresos mensuales.
                   </p>
                 </div>
                 <button onClick={() => navigate("/profile/pricing")} className="text-xs font-bold text-primary hover:underline">Ver planes</button>
               </div>
            )}
          </div>

          <RecentActivityCard />
        </div>

        {/* Right Column: Sideboards */}
        <div className="space-y-8">
          {/* Upcoming Events Sidebar */}
          <section className="bg-card shadow-sm border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                {t('common:upcoming_events')}
              </h3>
              <Link to="/calendar" className="text-xs font-bold text-primary hover:underline">
                {t('common:action.view')}
              </Link>
            </div>

            <div className="space-y-3">
              {loadingUpcoming ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-20 bg-surface-alt rounded-xl animate-pulse" />
                ))
              ) : upcomingEvents.length > 0 ? (
                upcomingEvents.map((event) => (
                  <UpcomingEventCard key={event.id} event={event as DashboardEvent} />
                ))
              ) : (
                <div className="py-8 text-center bg-surface-alt rounded-2xl border border-dashed border-border">
                  <Calendar className="h-8 w-8 text-text-tertiary mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-text-secondary">{t('dashboard:upcoming.no_events')}</p>
                </div>
              )}
            </div>
          </section>

          {/* Low Stock Sidebar */}
          <section className="bg-card shadow-sm border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Package className="h-4 w-4 text-error" />
                {t('common:critical_inventory')}
              </h3>
              <Link to="/inventory" className="text-xs font-bold text-primary hover:underline">
                {t('common:action.view')}
              </Link>
            </div>

            <div className="space-y-3">
              {loadingInventory ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-surface-alt rounded-xl animate-pulse" />
                ))
              ) : lowStockItems.length > 0 ? (
                lowStockItems.slice(0, 5).map((item) => (
                  <LowStockCard key={item.id} item={item} />
                ))
              ) : (
                <div className="py-8 text-center bg-surface-alt rounded-2xl border border-dashed border-border">
                  <FileCheck className="h-8 w-8 text-success mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-text-secondary">{t('dashboard:inventory.no_items')}</p>
                </div>
              )}
            </div>
          </section>

          {/* Business Stats mini-grid */}
          <div className="grid grid-cols-1 gap-4">
            <KpiCard
              icon={Users}
              iconBg="bg-primary/10"
              iconColor="text-primary"
              label={t('dashboard:kpis.new_clients')}
              value={String(kpis?.total_clients ?? 0)}
              compact
            />
            <KpiCard
              icon={FileText}
              iconBg="bg-info/10"
              iconColor="text-info"
              label={t('dashboard:kpis.average_ticket')}
              value={fmt(kpis?.average_event_value ?? 0)}
              compact
            />
          </div>
        </div>
      </div>

      {/* ── REGISTER PAYMENT MODAL ── */}
      {paymentModal && (
        <Modal
          isOpen={true}
          onClose={() => setPaymentModal(null)}
          title={t('common:payment.confirm')}
        >
          <div className="space-y-6">
            <div className="bg-surface-alt rounded-xl p-4 border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">{t('common:nav.events')}</span>
                <span className="text-xs font-bold text-primary">{format(parseDashboardEventDate(paymentModal.event.event_date), "d MMM", { locale: i18n.language === 'en' ? enUS : es })}</span>
              </div>
              <p className="text-base font-bold text-text">{paymentModal.event.client?.name ?? t('dashboard:event.no_client')}</p>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-text-secondary">{t('dashboard:attention.pending_balance').split('{{pending}}')[0]}</span>
                <span className="text-lg font-black text-error">{fmt(paymentModal.pendingAmount)}</span>
              </div>
            </div>

            <PaymentFormFields
              onSubmit={handlePayAndComplete}
              onCancel={() => setPaymentModal(null)}
              initialAmount={paymentModal.pendingAmount}
              submitLabel={paymentModal.shouldAutoComplete ? t('common:payment.complete') : t('dashboard:attention.register_payment')}
              isSubmitting={updatingEventId === paymentModal.event.id}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
