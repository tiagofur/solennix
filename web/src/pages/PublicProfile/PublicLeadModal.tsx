import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, CheckCircle2, Info } from "lucide-react";
import {
  publicRequestService,
  PublicRequestError,
  PUBLIC_REQUEST_TOKEN_KEY,
  type CreatePublicRequestRequest,
} from "@/services/publicRequestService";
import type { PublicProfileServiceItem } from "@/services/publicProfileService";
import { RequestForm } from "@/components/requests/RequestForm";

interface PublicLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
  businessName: string;
  brandColor?: string | null;
  /** Public services of the organizer, for the multi-select (D4). */
  services?: PublicProfileServiceItem[];
  /** Prefill message (e.g. package or service interest). */
  initialMessage?: string;
  /** Prefill selected catalog product ids (qty 1 each). */
  initialServiceIds?: string[];
  /** When set, server freezes package_quote on create. */
  packageId?: string;
  /** Guest count for package pricing / form. */
  guestCount?: number;
}

export const PublicLeadModal: React.FC<PublicLeadModalProps> = ({
  isOpen,
  onClose,
  slug,
  businessName,
  brandColor,
  services = [],
  initialMessage,
  initialServiceIds = [],
  packageId,
  guestCount,
}) => {
  const { t } = useTranslation("public");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [statusPath, setStatusPath] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSubmitted(false);
      setStatusPath(null);
      setSubmitting(false);
      setFormKey((k) => k + 1);
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

  const handleSubmit = async (payload: CreatePublicRequestRequest) => {
    setError(null);
    setSubmitting(true);
    try {
      const body: CreatePublicRequestRequest = {
        ...payload,
        ...(packageId ? { package_id: packageId } : {}),
        ...(guestCount != null && guestCount > 0
          ? { guest_count: guestCount }
          : {}),
      };
      const result = await publicRequestService.submit(slug, body);
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

  const catalog = services.map((s) => ({
    id: s.id,
    name: s.name,
    base_price: s.base_price,
    category: s.category,
  }));

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
          <div
            className="py-6 text-center space-y-5 animate-scale-in"
            data-testid="lead-success-view"
          >
            <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-success">
              <CheckCircle2 className="h-10 w-10" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-text">
                {t("profile.quote_success_title")}
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
                {t("profile.quote_success_desc", { name: businessName })}
              </p>
            </div>

            <ol
              className="mx-auto max-w-sm space-y-2.5 text-left"
              data-testid="lead-success-next-steps"
              aria-label={t("profile.quote_success_next_heading")}
            >
              <li className="flex gap-2.5 text-sm text-text-secondary">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary"
                  aria-hidden="true"
                >
                  1
                </span>
                <span>
                  {t("profile.quote_success_next_1", { name: businessName })}
                </span>
              </li>
              <li className="flex gap-2.5 text-sm text-text-secondary">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary"
                  aria-hidden="true"
                >
                  2
                </span>
                <span>{t("profile.quote_success_next_2")}</span>
              </li>
              <li className="flex gap-2.5 text-sm text-text-secondary">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary"
                  aria-hidden="true"
                >
                  3
                </span>
                <span>{t("profile.quote_success_next_3")}</span>
              </li>
            </ol>

            {statusPath && (
              <div
                className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-1.5 text-left"
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
              <h3
                id="quote-modal-title"
                className="text-xl font-bold text-text tracking-tight"
              >
                {t("profile.quote_modal_title")}
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                {t("profile.quote_modal_subtitle", { name: businessName })}
              </p>
            </div>

            <div
              className="flex items-start gap-2 rounded-xl bg-primary/5 border border-primary/10 p-3"
              data-testid="lead-disclaimer"
            >
              <Info
                className="h-4 w-4 flex-shrink-0 text-primary mt-0.5"
                aria-hidden="true"
              />
              <p className="text-xs text-text-secondary leading-relaxed">
                {t("profile.request.disclaimer")}
              </p>
            </div>

            <RequestForm
              key={formKey}
              mode="profile"
              submitMode="standard"
              catalog={catalog}
              brandColor={brandColor}
              submitting={submitting}
              error={error}
              initialValues={{
                message: initialMessage ?? "",
                numGuests:
                  guestCount != null && guestCount > 0
                    ? String(guestCount)
                    : "",
                selectedServices: Object.fromEntries(
                  initialServiceIds.map((id) => [id, 1]),
                ),
              }}
              onSubmit={handleSubmit}
              footerSecondary={
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-alt transition-colors"
                >
                  {t("profile.close_modal")}
                </button>
              }
            />
          </>
        )}
      </div>
    </div>
  );
};
