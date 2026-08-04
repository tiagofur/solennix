import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, PartyPopper } from "lucide-react";
import { RequestForm } from "@/components/requests/RequestForm";
import {
  requestLinkService,
  type PublicRequestLinkData,
  type SubmitMode,
} from "@/services/requestLinkService";
import {
  PublicRequestError,
  PUBLIC_REQUEST_TOKEN_KEY,
  type CreatePublicRequestRequest,
} from "@/services/publicRequestService";
import { PublicFormExpired } from "@/components/requests/PublicFormExpired";
import { resolveMediaUrl } from "@/lib/api";

/**
 * Public shared-link form at /s/:token (replaces /form/:token).
 * auto_event → success with event-created copy (no negotiate flow).
 * standard / auto_quote → sessionStorage client_token + navigate /solicitud/:id.
 */
export const PublicRequestLinkPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("public");

  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState<"expired" | "not_found" | null>(
    null,
  );
  const [linkData, setLinkData] = useState<PublicRequestLinkData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoEventSuccess, setAutoEventSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setUnavailable("not_found");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    (async () => {
      try {
        const data = await requestLinkService.getPublicLink(
          token,
          controller.signal,
        );
        setLinkData(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof PublicRequestError) {
          if (err.status === 404) setUnavailable("not_found");
          else setUnavailable("expired");
        } else {
          setUnavailable("expired");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [token]);

  const brandColor = linkData?.organizer.brand_color || "#6366f1";
  const businessName =
    linkData?.organizer.business_name || t("profile.fallback_name");
  const submitMode: SubmitMode = linkData?.submit_mode || "auto_event";

  const handleSubmit = async (payload: CreatePublicRequestRequest) => {
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await requestLinkService.submitRequest(token, payload);
      const booked =
        result.status === "booked" ||
        Boolean(result.event_id) ||
        submitMode === "auto_event";

      // auto_event: stay on page with event-created success (no negotiate).
      if (booked && (result.status === "booked" || result.event_id)) {
        setAutoEventSuccess(true);
        return;
      }

      // standard / auto_quote: store token and go to visitor status.
      if (result.id && result.client_token) {
        try {
          sessionStorage.setItem(
            PUBLIC_REQUEST_TOKEN_KEY(result.id),
            result.client_token,
          );
        } catch {
          /* ignore */
        }
        navigate(
          `/solicitud/${result.id}?token=${encodeURIComponent(result.client_token)}`,
          { replace: true },
        );
        return;
      }
      if (result.id) {
        navigate(`/solicitud/${result.id}`, { replace: true });
        return;
      }
      setAutoEventSuccess(true);
    } catch (err) {
      if (err instanceof PublicRequestError) {
        if (err.code === "inbox_full") {
          setError(t("profile.request.error_inbox_full"));
        } else if (err.code === "link_invalid" || err.status === 410) {
          setUnavailable("expired");
        } else if (err.status === 404) {
          setUnavailable("not_found");
        } else {
          setError(err.message || t("profile.request.error_generic"));
        }
      } else {
        setError(t("profile.request.error_generic"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-hidden="true"
        />
        <span className="sr-only">{t("profile.request.loading_link")}</span>
      </div>
    );
  }

  if (unavailable || !linkData) {
    return <PublicFormExpired reason={unavailable || "not_found"} />;
  }

  if (autoEventSuccess) {
    return (
      <div
        className="min-h-screen bg-bg flex items-center justify-center p-4"
        data-testid="request-link-auto-event-success"
      >
        <div className="max-w-md w-full text-center space-y-6">
          <div
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${brandColor}15` }}
          >
            <CheckCircle2 className="h-8 w-8" style={{ color: brandColor }} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-text tracking-tight">
              {t("profile.request.auto_event_success_title")}
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed">
              {t("profile.request.auto_event_success_desc", {
                name: businessName,
              })}
            </p>
          </div>
          <div
            className="rounded-xl p-4 flex items-center justify-center gap-2 text-sm"
            style={{
              backgroundColor: `${brandColor}10`,
              color: brandColor,
            }}
          >
            <PartyPopper className="h-5 w-5" aria-hidden="true" />
            <span className="font-medium">{t("success.close")}</span>
          </div>
        </div>
      </div>
    );
  }

  const logoUrl = resolveMediaUrl(linkData.organizer.logo_url);

  return (
    <div className="min-h-screen bg-bg py-8 px-4" data-testid="request-link-page">
      <div className="max-w-lg mx-auto space-y-6">
        <header className="text-center space-y-3">
          {logoUrl && (
            <img
              src={logoUrl}
              alt=""
              className="mx-auto h-14 w-14 rounded-xl object-cover border border-border"
            />
          )}
          <div>
            <p className="text-sm font-medium" style={{ color: brandColor }}>
              {businessName}
            </p>
            <h1 className="text-2xl font-bold text-text tracking-tight mt-1">
              {linkData.label || t("profile.request.link_page_title")}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {t("profile.request.link_page_subtitle", { name: businessName })}
            </p>
          </div>
        </header>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <RequestForm
            mode="link"
            submitMode={submitMode}
            catalog={linkData.products.map((p) => ({
              id: p.id,
              name: p.name,
              base_price: p.base_price,
              category: p.category,
            }))}
            brandColor={brandColor}
            submitting={submitting}
            error={error}
            showBudget={submitMode !== "auto_event"}
            onSubmit={handleSubmit}
            testIdPrefix="request-link"
          />
        </div>

        <p className="text-center text-xs text-text-tertiary">
          {t("profile.request.disclaimer")}
        </p>
      </div>
    </div>
  );
};

export default PublicRequestLinkPage;
