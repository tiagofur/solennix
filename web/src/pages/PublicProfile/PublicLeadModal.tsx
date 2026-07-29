import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, CheckCircle2, Loader2, Calendar, Users, Send } from "lucide-react";
import { publicProfileService } from "@/services/publicProfileService";

interface PublicLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  businessName: string;
  brandColor?: string | null;
}

export const PublicLeadModal: React.FC<PublicLeadModalProps> = ({
  isOpen,
  onClose,
  slug,
  businessName,
  brandColor,
}) => {
  const { t } = useTranslation("public");

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [eventType, setEventType] = useState("wedding");
  const [eventDate, setEventDate] = useState("");
  const [numGuests, setNumGuests] = useState("");
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setContact("");
      setEventType("wedding");
      setEventDate("");
      setNumGuests("");
      setMessage("");
      setError(null);
      setSubmitted(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) {
      setError(t("profile.name_contact_required", { defaultValue: "Por favor ingresa tu nombre y un método de contacto." }));
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      await publicProfileService.submitLead(slug, {
        name: name.trim(),
        contact: contact.trim(),
        event_type: eventType || undefined,
        event_date: eventDate || undefined,
        num_guests: numGuests ? parseInt(numGuests, 10) : undefined,
        message: message.trim() || undefined,
        source: "public_profile",
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message || t("profile.submit_error", { defaultValue: "Error al enviar la solicitud. Por favor intenta de nuevo." }));
    } finally {
      setSubmitting(false);
    }
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
        className="relative w-full max-w-lg rounded-2xl bg-card border border-border p-6 shadow-xl space-y-5 overflow-hidden"
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

            {error && (
              <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-xs text-error font-medium" data-testid="lead-error">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-secondary" htmlFor="lead-name">
                    {t("profile.name_label")} *
                  </label>
                  <input
                    id="lead-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ej. María González"
                    className={fieldStyle}
                    data-testid="lead-name-input"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-secondary" htmlFor="lead-contact">
                    {t("profile.contact_label")} *
                  </label>
                  <input
                    id="lead-contact"
                    type="text"
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder={t("profile.contact_placeholder")}
                    className={fieldStyle}
                    data-testid="lead-contact-input"
                  />
                </div>
              </div>

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
