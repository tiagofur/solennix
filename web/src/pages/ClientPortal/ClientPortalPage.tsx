import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Wallet,
  Loader2,
  CheckCircle2,
  CircleDashed,
  AlertCircle,
} from "lucide-react";
import { ClientPortalUnavailable } from "./components/ClientPortalUnavailable";
import { useTranslation } from "react-i18next";

// ─────────────────────────────────────────────────────────────────────────
// Types — mirror backend `PublicEventView` from
// handlers/event_public_link_handler.go. We intentionally do NOT import
// the generated OpenAPI types because the public-portal endpoint is not
// yet documented in openapi.yaml; we'll migrate once it lands there.
// ─────────────────────────────────────────────────────────────────────────

interface PortalEvent {
  id: string;
  service_type: string;
  event_date: string; // yyyy-MM-dd
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  city?: string | null;
  num_people: number;
  status: string;
}

interface PortalOrganizer {
  business_name?: string;
  logo_url?: string;
  brand_color?: string;
}

interface PortalClient {
  name: string;
}

interface PortalPayment {
  total: number;
  paid: number;
  remaining: number;
  currency: string;
}

interface PortalData {
  event: PortalEvent;
  organizer: PortalOrganizer;
  client: PortalClient;
  payment: PortalPayment;
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

// Parse `yyyy-MM-dd` as a LOCAL date (new Date("2026-08-15") would be
// interpreted UTC and drift back one day in negative-offset timezones).
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatLongDate(dateStr: string, lng: string = "es"): string {
  try {
    const d = parseLocalDate(dateStr);
    const locale = lng.startsWith("en") ? "en-US" : "es-MX";
    return d.toLocaleDateString(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(value: number, currency: string, lng: string = "es"): string {
  try {
    const locale = lng.startsWith("en") ? "en-US" : "es-MX";
    return value.toLocaleString(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
  } catch {
    return `${currency} ${value}`;
  }
}

function statusLabel(status: string, t: any): { label: string; tone: "ok" | "warn" | "info" | "done" } {
  switch (status) {
    case "confirmed":
      return { label: t("common:status.confirmed"), tone: "ok" };
    case "quoted":
      return { label: t("common:status.quoted"), tone: "warn" };
    case "completed":
      return { label: t("common:status.completed"), tone: "done" };
    case "cancelled":
      return { label: t("common:status.cancelled"), tone: "info" };
    default:
      return { label: status, tone: "info" };
  }
}

function daysUntil(dateStr: string): number {
  const target = parseLocalDate(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

// ─────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────

export const ClientPortalPage: React.FC = () => {
  const { t, i18n } = useTranslation(["public", "common"]);
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<"not-found" | "disabled" | null>(null);

  useEffect(() => {
    if (!token) {
      setError("not-found");
      setLoading(false);
      return;
    }
    const controller = new AbortController();

    const fetchPortal = async () => {
      try {
        const res = await fetch(`${API_BASE}/public/events/${token}`, {
          signal: controller.signal,
        });
        if (res.status === 410) {
          setError("disabled");
          return;
        }
        if (!res.ok) {
          setError("not-found");
          return;
        }
        const json: PortalData = await res.json();
        setData(json);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setError("not-found");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchPortal();
    return () => controller.abort();
  }, [token]);

  // Derive a safe brand color — any client-provided string could be
  // invalid, so we validate and fall back to the Solennix gold.
  const brandColor = useMemo(() => {
    const c = data?.organizer.brand_color;
    if (c && /^#[0-9A-Fa-f]{3,8}$/.test(c)) return c;
    return "#C4A265";
  }, [data?.organizer.brand_color]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div
          className="flex items-center gap-3 text-text-secondary"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>{t("portal.loading")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <ClientPortalUnavailable reason={error} />;
  }

  if (!data) {
    return <ClientPortalUnavailable reason="not-found" />;
  }

  const { event, organizer, client, payment } = data;
  const days = daysUntil(event.event_date);
  const countdownLabel =
    days > 0
      ? t("portal.days_remaining", { count: days })
      : days === 0
        ? t("portal.it_is_today")
        : t("portal.days_ago", { count: Math.abs(days) });

  const paidPct =
    payment.total > 0 ? Math.min(100, Math.round((payment.paid / payment.total) * 100)) : 0;

  const st = statusLabel(event.status, t);
  const statusToneClass =
    st.tone === "ok"
      ? "bg-success/10 text-success"
      : st.tone === "warn"
        ? "bg-warning/10 text-warning"
        : st.tone === "done"
          ? "bg-accent/10 text-accent"
          : "bg-surface-alt text-text-secondary";

  return (
    <div className="min-h-screen bg-bg">
      {/* Header strip — uses organizer brand color as an accent bar */}
      <div
        className="h-2 w-full"
        style={{ backgroundColor: brandColor }}
        aria-hidden="true"
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        {/* Organizer identity */}
        <header className="flex flex-col items-center text-center space-y-3">
          {organizer.logo_url ? (
            <img
              src={organizer.logo_url}
              alt={organizer.business_name || t("portal.organized_by")}
              className="h-14 w-14 rounded-full object-cover border border-border bg-surface"
            />
          ) : (
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: brandColor }}
              aria-hidden="true"
            >
              {(organizer.business_name || "S").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">
              {t("portal.organized_by")}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-text">
              {organizer.business_name || t("portal.default_organizer")}
            </h1>
          </div>
        </header>

        {/* Hero: event type + countdown */}
        <section className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8 text-center">
          <p className="text-sm text-text-secondary mb-2">
            {client.name 
              ? t("portal.hero_greeting", { name: client.name.split(" ")[0] })
              : t("portal.hero_greeting_no_name")}
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-text tracking-tight mb-3">
            {event.service_type}
          </h2>
          <p className="text-base sm:text-lg text-text-secondary capitalize">
            {formatLongDate(event.event_date, i18n.language)}
          </p>
          <div
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style={{ backgroundColor: `${brandColor}22`, color: brandColor }}
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            {countdownLabel}
          </div>
          <div className="mt-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusToneClass}`}
            >
              {st.tone === "ok" ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {st.label}
            </span>
          </div>
        </section>

        {/* Details grid */}
        <section className="grid sm:grid-cols-2 gap-4">
          {(event.start_time || event.end_time) && (
            <DetailCard icon={<Clock className="h-4 w-4" />} label={t("portal.details.schedule")}>
              {[event.start_time, event.end_time].filter(Boolean).join(" — ") || "—"}
            </DetailCard>
          )}
          {(event.location || event.city) && (
            <DetailCard icon={<MapPin className="h-4 w-4" />} label={t("portal.details.location")}>
              {[event.location, event.city].filter(Boolean).join(", ")}
            </DetailCard>
          )}
          <DetailCard icon={<Users className="h-4 w-4" />} label={t("portal.details.guests")}>
            {t("portal.details.guests_value", { count: event.num_people })}
          </DetailCard>
        </section>

        {/* Payment summary */}
        <section className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-text-secondary" aria-hidden="true" />
            <h3 className="text-lg font-semibold text-text">{t("portal.payments.title")}</h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">
                {t("portal.payments.paid")}
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-text">
                {formatCurrency(payment.paid, payment.currency, i18n.language)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">
                {t("portal.payments.total")}
              </p>
              <p className="text-base sm:text-lg text-text-secondary">
                {formatCurrency(payment.total, payment.currency, i18n.language)}
              </p>
            </div>
          </div>

          <div
            className="h-3 w-full rounded-full bg-surface-alt overflow-hidden"
            role="progressbar"
            aria-valuenow={paidPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t("portal.payments.paid_percentage", { percent: paidPct })}
          >
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${paidPct}%`,
                backgroundColor: brandColor,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-text-tertiary">
            {t("portal.payments.paid_percentage", { percent: paidPct })} · {t("portal.payments.pending_label")}{" "}
            <span className="font-semibold text-text-secondary">
              {formatCurrency(payment.remaining, payment.currency, i18n.language)}
            </span>
          </p>

          <div className="mt-5 bg-surface-alt rounded-xl border border-border p-3 flex items-start gap-2">
            <AlertCircle
              className="h-4 w-4 text-text-tertiary shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <p className="text-xs text-text-secondary leading-relaxed">
              {t("portal.payments.footer_note")}
            </p>
          </div>
        </section>

        <footer className="text-center text-xs text-text-tertiary pt-4">
          {t("portal.footer_note")}
        </footer>
      </div>
    </div>
  );
};

// Small internal helper — keeps the details grid DRY and consistent.
const DetailCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => (
  <div className="bg-card rounded-xl border border-border p-4">
    <div className="flex items-center gap-1.5 text-text-tertiary text-xs uppercase tracking-widest mb-1">
      {icon}
      <span>{label}</span>
    </div>
    <p className="text-sm text-text font-medium capitalize">{children}</p>
  </div>
);
