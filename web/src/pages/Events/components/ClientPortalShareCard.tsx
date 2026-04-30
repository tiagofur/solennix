import React, { useState } from "react";
import { Share2, Copy, CheckCircle2, RefreshCw, Link2Off, Loader2, ExternalLink } from "lucide-react";
import {
  useCreateOrRotateEventPublicLink,
  useEventPublicLink,
  useRevokeEventPublicLink,
} from "../../../hooks/queries/useEventPublicLinkQueries";
import { useToast } from "../../../hooks/useToast";
import { logError } from "../../../lib/errorHandler";
import { useTranslation } from "react-i18next";

interface Props {
  eventId: string;
}

/**
 * Organizer-facing card inside EventSummary that manages the client
 * portal share link (PRD/12 feature A). Three states:
 *   - loading: initial fetch in flight
 *   - has-link: shows URL + copy/rotate/revoke buttons
 *   - no-link:  single "Generar enlace" CTA
 *
 * On mount we call GET /events/:id/public-link; the 404 case (no link
 * yet) is treated as a normal state, not an error.
 */
export const ClientPortalShareCard: React.FC<Props> = ({ eventId }) => {
  const { t } = useTranslation(["events"]);
  const { data: link, isLoading: loading } = useEventPublicLink(eventId);
  const createOrRotate = useCreateOrRotateEventPublicLink(eventId);
  const revokeLink = useRevokeEventPublicLink(eventId);

  const busy = createOrRotate.isPending || revokeLink.isPending;
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const handleGenerate = async () => {
    try {
      await createOrRotate.mutateAsync({});
      addToast(t("events:summary.share.success_generate"), "success");
    } catch (err) {
      logError("ClientPortalShareCard:generate", err);
    }
  };

  const handleRotate = async () => {
    if (
      !window.confirm(
        t("events:summary.share.confirm_rotate"),
      )
    ) {
      return;
    }
    try {
      await createOrRotate.mutateAsync({});
      addToast(t("events:summary.share.success_rotate"), "success");
    } catch (err) {
      logError("ClientPortalShareCard:rotate", err);
    }
  };

  const handleRevoke = async () => {
    if (
      !window.confirm(
        t("events:summary.share.confirm_revoke"),
      )
    ) {
      return;
    }
    try {
      await revokeLink.mutateAsync(undefined);
      addToast(t("events:summary.share.success_revoke"), "info");
    } catch (err) {
      logError("ClientPortalShareCard:revoke", err);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      addToast(t("events:summary.share.success_copy"), "success");
    } catch (err) {
      logError("ClientPortalShareCard:copy", err);
    }
  };

  const handleShareWhatsApp = () => {
    if (!link) return;
    const text = encodeURIComponent(
      t("events:summary.share.whatsapp_message", { url: link.url }),
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="bg-card rounded-2xl border border-border shadow-sm p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Share2 className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-text">
            {t("events:summary.share.title")}
          </h3>
          <p className="text-sm text-text-secondary">
            {t("events:summary.share.description")}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {t("events:summary.share.loading")}
        </div>
      ) : link ? (
        <div className="space-y-3">
          <div className="bg-surface-alt border border-border rounded-xl p-3 text-sm text-text-secondary break-all font-mono">
            {link.url}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  {t("events:summary.share.copied")}
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {t("events:summary.share.copy")}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-alt border border-border text-text text-sm font-medium rounded-lg hover:bg-surface transition-colors disabled:opacity-60"
            >
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              {t("events:summary.share.whatsapp")}
            </button>

            <button
              type="button"
              onClick={handleRotate}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-alt border border-border text-text-secondary text-sm font-medium rounded-lg hover:bg-surface transition-colors disabled:opacity-60"
              title={t("events:summary.share.rotate_title")}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t("events:summary.share.rotate")}
            </button>

            <button
              type="button"
              onClick={handleRevoke}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-error text-sm font-medium rounded-lg hover:bg-error/10 transition-colors disabled:opacity-60"
            >
              <Link2Off className="h-4 w-4" aria-hidden="true" />
              {t("events:summary.share.revoke")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Share2 className="h-4 w-4" aria-hidden="true" />
          )}
          {t("events:summary.share.generate")}
        </button>
      )}
    </section>
  );
};
