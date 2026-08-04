import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  Users,
  MapPin,
  DollarSign,
  Send,
  Loader2,
  Phone,
} from "lucide-react";
import type { CreatePublicRequestRequest } from "@/services/publicRequestService";
import type { SubmitMode } from "@/services/requestLinkService";

export type RequestFormMode = "profile" | "link";

export type RequestFormCatalogItem = {
  id: string;
  name: string;
  base_price?: number | null;
  category?: string;
};

export type RequestFormProps = {
  mode: RequestFormMode;
  /** Effective submit mode (profile is always standard). */
  submitMode?: SubmitMode;
  catalog?: RequestFormCatalogItem[];
  brandColor?: string | null;
  submitting?: boolean;
  error?: string | null;
  /** Hide budget fields on link when not relevant; default true for profile. */
  showBudget?: boolean;
  onSubmit: (payload: CreatePublicRequestRequest) => void | Promise<void>;
  /** Optional extra footer (e.g. cancel button in modal). */
  footerSecondary?: React.ReactNode;
  testIdPrefix?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RequestFormValues = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  eventType: string;
  eventDate: string;
  location: string;
  city: string;
  numGuests: string;
  budget: string;
  message: string;
  website: string;
  /** product_id → qty */
  selectedServices: Record<string, number>;
};

export function validateRequestForm(
  values: Pick<
    RequestFormValues,
    | "contactName"
    | "contactEmail"
    | "contactPhone"
    | "eventType"
    | "eventDate"
    | "numGuests"
    | "budget"
  >,
  opts: { mode: RequestFormMode; submitMode: SubmitMode },
  t: (key: string) => string,
): string | null {
  const email = values.contactEmail.trim();
  const phone = values.contactPhone.trim();
  const name = values.contactName.trim();

  if (opts.mode === "profile") {
    if (!EMAIL_REGEX.test(email)) {
      return t("profile.request.email_invalid");
    }
  } else {
    // Link: at least one of email or phone; auto_event requires name+phone+date+type+guests
    if (!email && !phone) {
      return t("profile.request.contact_required");
    }
    if (email && !EMAIL_REGEX.test(email)) {
      return t("profile.request.email_invalid");
    }
    if (opts.submitMode === "auto_event") {
      if (!name) return t("profile.request.name_required");
      if (!phone) return t("profile.request.phone_required");
      if (!values.eventDate) return t("profile.request.date_required");
      if (!values.eventType) return t("profile.request.event_type_required");
      const guests = parseInt(values.numGuests, 10);
      if (!values.numGuests || !Number.isFinite(guests) || guests < 1) {
        return t("profile.request.guests_required");
      }
    }
  }

  if (values.eventDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const entered = new Date(values.eventDate);
    if (entered < today) {
      return t("profile.request.date_past");
    }
  }
  if (values.budget && parseFloat(values.budget) < 0) {
    return t("profile.request.budget_invalid");
  }
  return null;
}

export function buildRequestPayload(
  values: RequestFormValues,
): CreatePublicRequestRequest {
  const services = Object.entries(values.selectedServices)
    .filter(([, qty]) => qty > 0)
    .map(([product_id, qty]) => ({ product_id, qty }));

  return {
    contact_email: values.contactEmail.trim() || undefined,
    contact_name: values.contactName.trim() || undefined,
    contact_phone: values.contactPhone.trim() || undefined,
    event_type: values.eventType || undefined,
    event_date: values.eventDate || undefined,
    location: values.location.trim() || undefined,
    city: values.city.trim() || undefined,
    guest_count: values.numGuests
      ? parseInt(values.numGuests, 10)
      : undefined,
    budget: values.budget ? parseFloat(values.budget) : undefined,
    currency: "MXN",
    services: services.length > 0 ? services : undefined,
    message: values.message.trim() || undefined,
    website: values.website || "",
  };
}

const defaultValues = (): RequestFormValues => ({
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  eventType: "wedding",
  eventDate: "",
  location: "",
  city: "",
  numGuests: "",
  budget: "",
  message: "",
  website: "",
  selectedServices: {},
});

export const RequestForm: React.FC<RequestFormProps> = ({
  mode,
  submitMode = "standard",
  catalog = [],
  brandColor,
  submitting = false,
  error = null,
  showBudget = true,
  onSubmit,
  footerSecondary,
  testIdPrefix = "lead",
}) => {
  const { t } = useTranslation("public");
  const [values, setValues] = useState<RequestFormValues>(defaultValues);
  const [localError, setLocalError] = useState<string | null>(null);

  const effectiveSubmitMode: SubmitMode =
    mode === "profile" ? "standard" : submitMode;

  const id = (name: string) => `${testIdPrefix}-${name}`;
  const fieldStyle =
    "w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-text focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all";

  const displayError = localError || error;

  const catalogExpandedDefault = mode === "link" && catalog.length > 0;
  const [catalogOpen, setCatalogOpen] = useState(catalogExpandedDefault);

  const setField = <K extends keyof RequestFormValues>(
    key: K,
    value: RequestFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleService = (serviceId: string) => {
    setValues((prev) => {
      const next = { ...prev.selectedServices };
      if (next[serviceId]) {
        delete next[serviceId];
      } else {
        next[serviceId] = 1;
      }
      return { ...prev, selectedServices: next };
    });
  };

  const setServiceQty = (serviceId: string, qty: number) => {
    setValues((prev) => {
      const next = { ...prev.selectedServices };
      if (qty <= 0) {
        delete next[serviceId];
      } else {
        next[serviceId] = qty;
      }
      return { ...prev, selectedServices: next };
    });
  };

  const requireAutoEvent = useMemo(
    () => mode === "link" && effectiveSubmitMode === "auto_event",
    [mode, effectiveSubmitMode],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateRequestForm(
      values,
      { mode, submitMode: effectiveSubmitMode },
      t,
    );
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);
    await onSubmit(buildRequestPayload(values));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {/* Honeypot */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
        style={{
          position: "absolute",
          left: "-9999px",
          height: 0,
          width: 0,
          overflow: "hidden",
        }}
      >
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => setField("website", e.target.value)}
          data-testid={id("honeypot")}
        />
      </div>

      {displayError && (
        <div
          className="p-3 rounded-xl bg-error/10 border border-error/20 text-xs text-error font-medium"
          data-testid={id("error")}
          role="alert"
        >
          {displayError}
        </div>
      )}

      {/* Contact: email + name (+ phone on link / always available) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            className="text-xs font-medium text-text-secondary"
            htmlFor={id("email")}
          >
            {mode === "profile"
              ? t("profile.request.email_label")
              : t("profile.request.email_label_optional")}
          </label>
          <input
            id={id("email")}
            type="text"
            inputMode="email"
            autoComplete="email"
            required={mode === "profile"}
            value={values.contactEmail}
            onChange={(e) => setField("contactEmail", e.target.value)}
            placeholder={t("profile.request.email_placeholder")}
            className={fieldStyle}
            data-testid={id("email-input")}
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-xs font-medium text-text-secondary"
            htmlFor={id("name")}
          >
            {requireAutoEvent
              ? t("profile.request.name_label_required")
              : t("profile.name_label")}
          </label>
          <input
            id={id("name")}
            type="text"
            value={values.contactName}
            onChange={(e) => setField("contactName", e.target.value)}
            placeholder={t("profile.request.name_placeholder")}
            className={fieldStyle}
            data-testid={id("name-input")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            className="text-xs font-medium text-text-secondary flex items-center gap-1"
            htmlFor={id("phone")}
          >
            <Phone className="h-3 w-3 text-primary" aria-hidden="true" />
            {requireAutoEvent
              ? t("profile.request.phone_label_required")
              : t("profile.request.phone_label")}
          </label>
          <input
            id={id("phone")}
            type="tel"
            autoComplete="tel"
            value={values.contactPhone}
            onChange={(e) => setField("contactPhone", e.target.value)}
            placeholder={t("profile.request.phone_placeholder")}
            className={fieldStyle}
            data-testid={id("phone-input")}
          />
        </div>
        <div className="space-y-1">
          <label
            className="text-xs font-medium text-text-secondary"
            htmlFor={id("city")}
          >
            {t("profile.request.city_label")}
          </label>
          <input
            id={id("city")}
            type="text"
            value={values.city}
            onChange={(e) => setField("city", e.target.value)}
            placeholder={t("profile.request.city_placeholder")}
            className={fieldStyle}
            data-testid={id("city-input")}
          />
        </div>
      </div>

      {/* Event type + date + guests */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1 sm:col-span-1">
          <label
            className="text-xs font-medium text-text-secondary"
            htmlFor={id("event-type")}
          >
            {requireAutoEvent
              ? t("profile.request.event_type_label_required")
              : t("profile.event_type_label")}
          </label>
          <select
            id={id("event-type")}
            value={values.eventType}
            onChange={(e) => setField("eventType", e.target.value)}
            className={fieldStyle}
            data-testid={id("event-type-select")}
          >
            <option value="wedding">{t("profile.event_types.wedding")}</option>
            <option value="birthday">{t("profile.event_types.birthday")}</option>
            <option value="xv_years">{t("profile.event_types.xv_years")}</option>
            <option value="corporate">
              {t("profile.event_types.corporate")}
            </option>
            <option value="graduation">
              {t("profile.event_types.graduation")}
            </option>
            <option value="other">{t("profile.event_types.other")}</option>
          </select>
        </div>
        <div className="space-y-1 sm:col-span-1">
          <label
            className="text-xs font-medium text-text-secondary flex items-center gap-1"
            htmlFor={id("event-date")}
          >
            <Calendar className="h-3 w-3 text-primary" aria-hidden="true" />
            {requireAutoEvent
              ? t("profile.request.date_label_required")
              : t("profile.event_date_label")}
          </label>
          <input
            id={id("event-date")}
            type="date"
            value={values.eventDate}
            onChange={(e) => setField("eventDate", e.target.value)}
            className={fieldStyle}
            data-testid={id("event-date-input")}
          />
        </div>
        <div className="space-y-1 sm:col-span-1">
          <label
            className="text-xs font-medium text-text-secondary flex items-center gap-1"
            htmlFor={id("guests")}
          >
            <Users className="h-3 w-3 text-primary" aria-hidden="true" />
            {requireAutoEvent
              ? t("profile.request.guests_label_required")
              : t("profile.num_guests_label")}
          </label>
          <input
            id={id("guests")}
            type="number"
            min="1"
            value={values.numGuests}
            onChange={(e) => setField("numGuests", e.target.value)}
            placeholder="100"
            className={fieldStyle}
            data-testid={id("guests-input")}
          />
        </div>
      </div>

      {/* Location + optional budget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label
            className="text-xs font-medium text-text-secondary flex items-center gap-1"
            htmlFor={id("location")}
          >
            <MapPin className="h-3 w-3 text-primary" aria-hidden="true" />
            {t("profile.request.location_label")}
          </label>
          <input
            id={id("location")}
            type="text"
            value={values.location}
            onChange={(e) => setField("location", e.target.value)}
            placeholder={t("profile.request.location_placeholder")}
            className={fieldStyle}
            data-testid={id("location-input")}
          />
        </div>
        {showBudget && (
          <div className="space-y-1">
            <label
              className="text-xs font-medium text-text-secondary flex items-center gap-1"
              htmlFor={id("budget")}
            >
              <DollarSign className="h-3 w-3 text-primary" aria-hidden="true" />
              {t("profile.request.budget_label")}
            </label>
            <input
              id={id("budget")}
              type="number"
              min="0"
              value={values.budget}
              onChange={(e) => setField("budget", e.target.value)}
              placeholder={t("profile.request.budget_placeholder")}
              className={fieldStyle}
              data-testid={id("budget-input")}
            />
          </div>
        )}
      </div>

      {/* Optional catalog */}
      {catalog.length > 0 && (
        <div className="space-y-2" data-testid={id("services-section")}>
          <button
            type="button"
            onClick={() => setCatalogOpen((o) => !o)}
            className="text-xs font-medium text-text-secondary hover:text-text transition-colors"
            data-testid={id("services-toggle")}
            aria-expanded={catalogOpen}
          >
            {catalogOpen
              ? t("profile.request.services_hide")
              : t("profile.request.services_show")}
          </button>
          {catalogOpen && (
            <>
              <p className="text-xs text-text-tertiary">
                {t("profile.request.services_optional_hint")}
              </p>
              <div className="space-y-2">
                {catalog.map((svc) => {
                  const qty = values.selectedServices[svc.id] ?? 0;
                  const isSelected = qty > 0;
                  return (
                    <div
                      key={svc.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <button
                        type="button"
                        onClick={() => toggleService(svc.id)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          isSelected
                            ? "border-primary bg-primary text-on-primary"
                            : "border-border bg-surface text-text hover:border-primary/50"
                        }`}
                        data-testid={id(`service-${svc.id}`)}
                        aria-pressed={isSelected}
                      >
                        {svc.name}
                        {svc.base_price != null && (
                          <span className="ml-1 opacity-80">
                            · ${svc.base_price}
                          </span>
                        )}
                      </button>
                      {isSelected && (
                        <label className="inline-flex items-center gap-1 text-xs text-text-secondary">
                          <span>{t("profile.request.qty_label")}</span>
                          <input
                            type="number"
                            min={1}
                            value={qty}
                            onChange={(e) =>
                              setServiceQty(
                                svc.id,
                                Math.max(1, parseInt(e.target.value, 10) || 1),
                              )
                            }
                            className="w-14 rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text"
                            data-testid={id(`service-qty-${svc.id}`)}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      <div className="space-y-1">
        <label
          className="text-xs font-medium text-text-secondary"
          htmlFor={id("message")}
        >
          {t("profile.message_label")}
        </label>
        <textarea
          id={id("message")}
          rows={3}
          value={values.message}
          onChange={(e) => setField("message", e.target.value)}
          placeholder={t("profile.message_placeholder")}
          className={fieldStyle}
          data-testid={id("message-input")}
        />
      </div>

      <div className="pt-2 flex justify-end gap-3">
        {footerSecondary}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-on-primary shadow-xs hover:opacity-90 transition-opacity disabled:opacity-50"
          style={brandColor ? { backgroundColor: brandColor } : undefined}
          data-testid={id("submit-button")}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("profile.submitting_quote")}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              {t("profile.submit_quote")}
            </>
          )}
        </button>
      </div>
    </form>
  );
};
