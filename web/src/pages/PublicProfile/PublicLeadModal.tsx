import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, CheckCircle2, Loader2, Calendar, Users, Send, MapPin, DollarSign, Info } from "lucide-react";
import {
  publicRequestService,
  PublicRequestError,
  PUBLIC_REQUEST_TOKEN_KEY,
} from "@/services/publicRequestService";
import type { PublicProfileServiceItem } from "@/services/publicProfileService";

interface PublicLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  businessName: string;
  brandColor?: string | null;
  /** Public services of the organizer, for the multi-select (D4). */
  services?: PublicProfileServiceItem[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PublicLeadModal: React.FC<PublicLeadModalProps> = ({
  isOpen,
  onClose,
  slug,
  businessName,
  brandColor,
  services = [],
}) => {
  const { t } = useTranslation("public");

  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [eventType, setEventType] = useState("wedding");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [numGuests, setNumGuests] = useState("");
  const [budget, setBudget] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  // Honeypot — bots fill hidden "website"; real users leave it empty.
  const [website, setWebsite] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [statusPath, setStatusPath] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setContactEmail("");
      setContactName("");
      setEventType("wedding");
      setEventDate("");
      setLocation("");
      setNumGuests("");
      setBudget("");
      setSelectedServices([]);
      setMessage("");
      setWebsite("");
      setError(null);
      setSubmitted(false);
      setStatusPath(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = (): string | null => {
    if (!EMAIL_REGEX.test(contactEmail.trim())) {
      return t("profile.request.email_invalid");
    }
    if (eventDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const entered = new Date(eventDate);
      if (entered < today) {
        return t("profile.request.date_past");
      }
    }
    if (budget && parseFloat(budget) < 0) {
      return t("profile.request.budget_invalid");
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      const result = await publicRequestService.submit(slug, {
        contact_email: contactEmail.trim(),
        contact_name: contactName.trim() || undefined,
        event_type: eventType || undefined,
        event_date: eventDate || undefined,
        location: location.trim() || undefined,
        guest_count: numGuests ? parseInt(numGuests, 10) : undefined,
        budget: budget ? parseFloat(budget) : undefined,
        currency: "MXN",
        service_ids: selectedServices.length > 0 ? selectedServices : undefined,
        message: message.trim() || undefined,
        // Always send empty honeypot (bots fill the hidden input).
        website: website || "",
      });
      if (result.id && result.client_token) {
        try {
          sessionStorage.setItem(
            PUBLIC_REQUEST_TOKEN_KEY(result.id),
            result.client_token,
          );
        } catch {
          /* sessionStorage unavailable */
        }
        setStatusPath(
          `/solicitud/${result.id}?token=${encodeURIComponent(result.client_token)}`,
        );
      } else if (result.id) {
        setStatusPath(`/solicitud/${result.id}`);
      }
      setSubmitted(true);
    } catch (err) {
      if (err instanceof PublicRequestError) {
        if (err.code === "inbox_full") {
          setError(t("profile.request.error_inbox_full"));
        } else if (err.status === 404) {
          setError(t("profile.request.error_not_found"));
        } else {
          setError(t("profile.request.error_generic"));
        }
      } else {
        setError(t("profile.request.error_generic"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const fieldStyle =
    "w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-modal-title"
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border p-6 shadow-xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-text-secondary hover:bg-surface-alt transition-colors"
          aria-label={t("profile.close_modal")}
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="py-6 text-center space-y-4" data-testid="lead-success-view">
            <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-success">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-text">
                {t("profile.quote_success_title")}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
                {t("profile.quote_success_desc", { name: businessName })}
              </p>
            </div>
            {statusPath && (
              <div
                className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1.5"
                data-testid="lead-status-link"
              >
                <p className="text-xs font-semibold text-text">
                  {t("profile.quote_success_status_link")}
                </p>
                <p className="text-xs text-text-secondary">
                  {t("profile.quote_success_status_hint")}
                </p>
                <Link
                  to={statusPath}
                  className="inline-block text-xs font-semibold text-primary hover:underline break-all"
                  data-testid="lead-status-url"
                >
                  {statusPath}
                </Link>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-on-primary shadow-xs hover:opacity-90 transition-opacity"
              style={brandColor ? { backgroundColor: brandColor } : undefined}
              data-testid="lead-success-close"
            >
              {t("profile.close_modal")}
            </button>
          </div>
        ) : (
          <>
            <div>
              <h3 id="quote-modal-title" className="text-xl font-bold text-text tracking-tight">
                {t("profile.quote_modal_title")}
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                {t("profile.quote_modal_subtitle", { name: businessName })}
              </p>
            </div>

            {/* Disclaimer legal (ToS #1112) */}
            <div className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/10 p-3" data-testid="lead-disclaimer">
              <Info className="h-4 w-4 flex-shrink-0 text-primary mt-0.5" aria-hidden="true" />
              <p className="text-xs text-text-secondary leading-relaxed">
                {t("profile.request.disclaimer")}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-xs text-error font-medium" data-testid="lead-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot — visually hidden; do not label for users */}
              <div
                aria-hidden="true"
                className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
                style={{ position: "absolute", left: "-9999px", height: 0, width: 0, overflow: "hidden" }}
              >
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  data-testid="lead-honeypot"
                />
              </div>

              {/* Email (obligatorio) + name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-secondary" htmlFor="lead-email">
                    {t("profile.request.email_label")}
                  </label>
                  <input
                    id="lead-email"
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={t("profile.request.email_placeholder")}
                    className={fieldStyle}
                    data-testid="lead-email-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-secondary" htmlFor="lead-name">
                    {t("profile.name_label")}
                  </label>
                  <input
                    id="lead-name"
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="ej. María González"
                    className={fieldStyle}
                    data-testid="lead-name-input"
                  />
                </div>
              </div>

              {/* Event type + date + guests (existentes) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-xs font-medium text-text-secondary" htmlFor="lead-event-type">
                    {t("profile.event_type_label")}
                  </label>
                  <select
                    id="lead-event-type"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className={fieldStyle}
                    data-testid="lead-event-type-select"
                  >
                    <option value="wedding">{t("profile.event_types.wedding")}</option>
                    <option value="birthday">{t("profile.event_types.birthday")}</option>
                    <option value="xv_years">{t("profile.event_types.xv_years")}</option>
                    <option value="corporate">{t("profile.event_types.corporate")}</option>
                    <option value="graduation">{t("profile.event_types.graduation")}</option>
                    <option value="other">{t("profile.event_types.other")}</option>
                  </select>
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-xs font-medium text-text-secondary flex items-center gap-1" htmlFor="lead-event-date">
                    <Calendar className="h-3 w-3 text-primary" />
                    {t("profile.event_date_label")}
                  </label>
                  <input
                    id="lead-event-date"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className={fieldStyle}
                    data-testid="lead-event-date-input"
                  />
                </div>
                <div className="space-y-1 sm:col-span-1">
                  <label className="text-xs font-medium text-text-secondary flex items-center gap-1" htmlFor="lead-guests">
                    <Users className="h-3 w-3 text-primary" />
                    {t("profile.num_guests_label")}
                  </label>
                  <input
                    id="lead-guests"
                    type="number"
                    min="1"
                    value={numGuests}
                    onChange={(e) => setNumGuests(e.target.value)}
                    placeholder="100"
                    className={fieldStyle}
                    data-testid="lead-guests-input"
                  />
                </div>
              </div>

              {/* Location + budget (nuevos) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-secondary flex items-center gap-1" htmlFor="lead-location">
                    <MapPin className="h-3 w-3 text-primary" />
                    {t("profile.request.location_label")}
                  </label>
                  <input
                    id="lead-location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={t("profile.request.location_placeholder")}
                    className={fieldStyle}
                    data-testid="lead-location-input"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-secondary flex items-center gap-1" htmlFor="lead-budget">
                    <DollarSign className="h-3 w-3 text-primary" />
                    {t("profile.request.budget_label")}
                  </label>
                  <input
                    id="lead-budget"
                    type="number"
                    min="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder={t("profile.request.budget_placeholder")}
                    className={fieldStyle}
                    data-testid="lead-budget-input"
                  />
                </div>
              </div>

              {/* Services multi-select (checkboxes, D5) — oculto si no hay */}
              {services.length > 0 && (
                <div className="space-y-2" data-testid="lead-services-section">
                  <label className="text-xs font-medium text-text-secondary">
                    {t("profile.request.services_label")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {services.map((svc) => {
                      const isSelected = selectedServices.includes(svc.id);
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => toggleService(svc.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            isSelected
                              ? "border-primary bg-primary text-on-primary"
                              : "border-border bg-surface text-text hover:border-primary/50"
                          }`}
                          data-testid={`lead-service-${svc.id}`}
                          aria-pressed={isSelected}
                        >
                          {svc.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-text-secondary" htmlFor="lead-message">
                  {t("profile.message_label")}
                </label>
                <textarea
                  id="lead-message"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("profile.message_placeholder")}
                  className={fieldStyle}
                  data-testid="lead-message-input"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-alt transition-colors"
                >
                  {t("profile.close_modal")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-on-primary shadow-xs hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={brandColor ? { backgroundColor: brandColor } : undefined}
                  data-testid="lead-submit-button"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("profile.submitting_quote")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      {t("profile.submit_quote")}
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
