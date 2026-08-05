import React, { useCallback, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, XCircle, AlertCircle } from "lucide-react";
import {
  publicRequestService,
  PublicRequestError,
  PUBLIC_REQUEST_TOKEN_KEY,
} from "@/services/publicRequestService";

/**
 * Public visitor status page for a structured quote request.
 * Route: /solicitud/:id?token=...
 * Token may also come from sessionStorage (saved on submit).
 * Actions: accept / decline via X-Request-Token (no auth — NG1).
 */
export const PublicRequestStatusPage: React.FC = () => {
  const { t } = useTranslation("public");
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => {
    const fromQuery = searchParams.get("token")?.trim();
    if (fromQuery) return fromQuery;
    if (id && typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem(PUBLIC_REQUEST_TOKEN_KEY(id)) ?? "";
    }
    return "";
  }, [id, searchParams]);

  const [acting, setActing] = useState<"accept" | "decline" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneAction, setDoneAction] = useState<"accept" | "decline" | null>(null);

  const canAct = Boolean(id && token && !doneAction);

  const runAction = useCallback(
    async (action: "accept" | "decline") => {
      if (!id || !token) return;
      setActing(action);
      setError(null);
      setMessage(null);
      try {
        await publicRequestService.clientAction(id, token, action);
        setDoneAction(action);
        setMessage(
          action === "accept"
            ? t("request_status.action_success_accept")
            : t("request_status.action_success_decline"),
        );
        // Persist token if it came from the query string.
        try {
          sessionStorage.setItem(PUBLIC_REQUEST_TOKEN_KEY(id), token);
        } catch {
          /* sessionStorage unavailable */
        }
      } catch (err) {
        if (err instanceof PublicRequestError && err.status === 404) {
          setError(t("request_status.not_found"));
        } else if (err instanceof PublicRequestError && err.status === 409) {
          setError(t("request_status.no_actions"));
        } else {
          setError(t("request_status.action_error"));
        }
      } finally {
        setActing(null);
      }
    },
    [id, token, t],
  );

  if (!id) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <AlertCircle className="mx-auto h-10 w-10 text-error" aria-hidden="true" />
          <p className="text-sm text-text-secondary">{t("request_status.not_found")}</p>
          <Link to="/providers" className="text-sm font-semibold text-primary hover:underline">
            Solennix
          </Link>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center space-y-3"
          data-testid="request-status-missing-token"
        >
          <AlertCircle className="mx-auto h-10 w-10 text-text-tertiary" aria-hidden="true" />
          <h1 className="text-lg font-bold text-text">{t("request_status.title")}</h1>
          <p className="text-sm text-text-secondary">{t("request_status.missing_token")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 space-y-5 shadow-xs"
        data-testid="request-status-page"
      >
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-bold text-text">{t("request_status.title")}</h1>
          <p className="text-xs text-text-tertiary break-all">ID: {id}</p>
        </div>

        {message && (
          <div
            className="flex items-start gap-2 rounded-xl bg-success/10 border border-success/20 p-3 text-sm text-success"
            data-testid="request-status-success"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>{message}</p>
          </div>
        )}

        {error && (
          <div
            className="flex items-start gap-2 rounded-xl bg-error/10 border border-error/20 p-3 text-sm text-error"
            data-testid="request-status-error"
          >
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        {canAct ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => runAction("accept")}
              disabled={acting !== null}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
              data-testid="request-status-accept"
            >
              {acting === "accept" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {acting === "accept" ? t("request_status.acting") : t("request_status.accept")}
            </button>
            <button
              type="button"
              onClick={() => runAction("decline")}
              disabled={acting !== null}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-text hover:bg-surface-alt disabled:opacity-50"
              data-testid="request-status-decline"
            >
              {acting === "decline" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <XCircle className="h-4 w-4" aria-hidden="true" />
              )}
              {acting === "decline" ? t("request_status.acting") : t("request_status.decline")}
            </button>
          </div>
        ) : (
          !message && (
            <p className="text-sm text-text-secondary text-center">
              {t("request_status.no_actions")}
            </p>
          )
        )}
      </div>
    </div>
  );
};

export default PublicRequestStatusPage;
