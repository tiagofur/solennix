import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Zap,
  Upload,
  History,
  Send,
} from "lucide-react";
import { ClientPortalUnavailable } from "./components/ClientPortalUnavailable";
import { useTranslation } from "react-i18next";
import { components } from "@/types/api";
import paymentSubmissionService, { PaymentSubmission } from "@/services/paymentSubmissionService";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";

// Generated type from OpenAPI spec
type PortalData = components["schemas"]["PublicEventView"];

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

type TabId = "resumen" | "enviar" | "historial";

export const ClientPortalPage: React.FC = () => {
  const { t, i18n } = useTranslation(["public", "common"]);
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<"not-found" | "disabled" | null>(null);

  // Payment submission tab state
  const [activeTab, setActiveTab] = useState<TabId>("resumen");
  const [submissions, setSubmissions] = useState<PaymentSubmission[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitAmount, setSubmitAmount] = useState("");
  const [submitRef, setSubmitRef] = useState("");
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchHistory = async (tok: string, eventId: string, clientId: string) => {
    setHistoryLoading(true);
    try {
      const list = await paymentSubmissionService.getSubmissionHistory(tok, eventId, clientId);
      setSubmissions(list);
    } catch {
      // silently fail — history is non-critical
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === "historial" && data && token) {
      fetchHistory(token, data.event.id, data.client.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !token) return;
    const amount = parseFloat(submitAmount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError("El monto debe ser un número positivo");
      return;
    }
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      await paymentSubmissionService.submitPaymentFromPortal(
        token,
        data.event.id,
        data.client.id,
        amount,
        submitRef || undefined,
        submitFile || undefined
      );
      setSubmitSuccess(true);
      setSubmitAmount("");
      setSubmitRef("");
      setSubmitFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setSubmitError("No se pudo enviar el comprobante. Intentá de nuevo.");
    } finally {
      setSubmitLoading(false);
    }
  };

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

  const { event, organizer, client } = data;
  
  // Detect if this portal is showing a limited (gratis) view.
  // Gratis organizers get a redacted response: no service_type, no location, no schedule, no num_people.
  const isGratisView = !event.service_type;

  const days = daysUntil(event.event_date);
  const countdownLabel =
    days > 0
      ? t("portal.days_remaining", { count: days })
      : days === 0
        ? t("portal.it_is_today")
        : t("portal.days_ago", { count: Math.abs(days) });

  const paidPct =
    data.payment.total > 0 ? Math.min(100, Math.round((data.payment.paid / data.payment.total) * 100)) : 0;

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
            {event.service_type || t("portal.event")}
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

        {/* Gratis upgrade banner — appears when organizer has a free plan */}
        {isGratisView && (
          <section className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <Zap className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-text mb-1">
                  {t("portal.upgrade.title")}
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  {t("portal.upgrade.description")}
                </p>
                <a
                  href={`${import.meta.env.VITE_APP_URL || "https://solennix.app"}/pricing`}
                  className="inline-block px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  {t("portal.upgrade.cta")}
                </a>
              </div>
            </div>
          </section>
        )}

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

        {/* Payment tabs: resumen + enviar + historial */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {/* Tab strip */}
          <div className="flex border-b border-border">
            {(["resumen", "enviar", "historial"] as TabId[]).map((tab) => {
              const icons: Record<TabId, React.ReactNode> = {
                resumen: <Wallet className="h-4 w-4" />,
                enviar: <Send className="h-4 w-4" />,
                historial: <History className="h-4 w-4" />,
              };
              const labels: Record<TabId, string> = {
                resumen: "Resumen",
                enviar: "Enviar pago",
                historial: "Mis envíos",
              };
              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "text-primary border-b-2 border-primary bg-primary/5"
                      : "text-text-secondary hover:text-text hover:bg-surface-alt"
                  }`}
                >
                  {icons[tab]}
                  <span className="hidden sm:inline">{labels[tab]}</span>
                </button>
              );
            })}
          </div>

          <div className="p-6 sm:p-8">
            {/* Tab: Resumen */}
            {activeTab === "resumen" && (
              <div className="space-y-4">
                <p className="text-sm text-text-secondary">
                  Aquí podés ver el estado de tu evento y registrar el pago de tu señal o cuotas.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-alt rounded-xl p-4">
                    <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">Pagado</p>
                    <p className="text-xl font-bold text-text">
                      {formatCurrency(data.payment.paid, data.payment.currency, i18n.language)}
                    </p>
                  </div>
                  <div className="bg-surface-alt rounded-xl p-4">
                    <p className="text-xs uppercase tracking-widest text-text-tertiary mb-1">Pendiente</p>
                    <p className="text-xl font-bold text-warning">
                      {formatCurrency(data.payment.remaining, data.payment.currency, i18n.language)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleTabChange("enviar")}
                  className="w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Registrar comprobante de pago
                </button>
              </div>
            )}

            {/* Tab: Enviar pago */}
            {activeTab === "enviar" && (
              <form onSubmit={handleSubmit} className="space-y-5">
                <p className="text-sm text-text-secondary">
                  Completá los datos de tu transferencia. El organizador la revisará y confirmará.
                </p>

                {submitSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-xl text-success text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ¡Comprobante enviado! El organizador lo revisará pronto.
                  </div>
                )}

                {submitError && (
                  <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-xl text-error text-sm">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {submitError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Monto transferido <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">
                      {data.payment.currency}
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={submitAmount}
                      onChange={(e) => setSubmitAmount(e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full pl-12 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Referencia / número de operación
                  </label>
                  <input
                    type="text"
                    value={submitRef}
                    onChange={(e) => setSubmitRef(e.target.value)}
                    placeholder="Ej: 123456789"
                    className="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text mb-1">
                    Comprobante / captura (opcional)
                  </label>
                  <div
                    className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {submitFile ? (
                      <p className="text-sm text-text">{submitFile.name}</p>
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-text-tertiary">
                        <Upload className="h-5 w-5" />
                        <p className="text-xs">JPG, PNG, PDF · máx 10 MB</p>
                      </div>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
                      if (!allowed.includes(file.type)) {
                        setSubmitError("Formato no válido. Usá jpeg, png, webp o pdf.");
                        e.target.value = "";
                        return;
                      }
                      if (file.size > 10 * 1024 * 1024) {
                        setSubmitError("El archivo no puede superar los 10 MB.");
                        e.target.value = "";
                        return;
                      }
                      setSubmitError(null);
                      setSubmitFile(file);
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                >
                  {submitLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Enviar comprobante</>
                  )}
                </button>
              </form>
            )}

            {/* Tab: Historial */}
            {activeTab === "historial" && (
              <div>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-10 text-text-secondary gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Cargando...</span>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-10">
                    <History className="h-8 w-8 text-text-tertiary mx-auto mb-2" />
                    <p className="text-sm text-text-secondary">Todavía no enviaste ningún comprobante.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.map((sub) => (
                      <div key={sub.id} className="bg-surface-alt rounded-xl border border-border p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text">
                              {formatCurrency(sub.amount, data.payment.currency, i18n.language)}
                            </p>
                            {sub.transfer_ref && (
                              <p className="text-xs text-text-secondary mt-0.5">Ref: {sub.transfer_ref}</p>
                            )}
                            <p className="text-xs text-text-tertiary mt-0.5">
                              {new Date(sub.submitted_at).toLocaleDateString(i18n.language.startsWith("en") ? "en-US" : "es-MX", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                            {sub.rejection_reason && (
                              <p className="text-xs text-error mt-1">Motivo: {sub.rejection_reason}</p>
                            )}
                            {sub.receipt_file_url && sub.status === "approved" && (
                              <a
                                href={`${(import.meta.env.VITE_API_URL || "http://localhost:8080/api").replace(/\/api$/, "")}${sub.receipt_file_url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline mt-1 inline-block"
                              >
                                Ver comprobante
                              </a>
                            )}
                          </div>
                          <PaymentStatusBadge status={sub.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
