import React, { useState } from "react";
import { Share2, Copy, CheckCircle2, RefreshCw, Link2Off, Loader2, ExternalLink } from "lucide-react";
import {
  useCreateOrRotateEventPublicLink,
  useEventPublicLink,
  useRevokeEventPublicLink,
} from "../../../hooks/queries/useEventPublicLinkQueries";
import { useToast } from "../../../hooks/useToast";
import { logError } from "../../../lib/errorHandler";

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
  const { data: link, isLoading: loading } = useEventPublicLink(eventId);
  const createOrRotate = useCreateOrRotateEventPublicLink(eventId);
  const revokeLink = useRevokeEventPublicLink(eventId);

  const busy = createOrRotate.isPending || revokeLink.isPending;
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const handleGenerate = async () => {
    try {
      await createOrRotate.mutateAsync({});
      addToast("Enlace generado. Compartilo con tu cliente.", "success");
    } catch (err) {
      logError("ClientPortalShareCard:generate", err);
    }
  };

  const handleRotate = async () => {
    if (
      !window.confirm(
        "Al rotar el enlace, el que ya compartiste dejará de funcionar. ¿Continuamos?",
      )
    ) {
      return;
    }
    try {
      await createOrRotate.mutateAsync({});
      addToast("Enlace rotado. El anterior ya no funciona.", "success");
    } catch (err) {
      logError("ClientPortalShareCard:rotate", err);
    }
  };

  const handleRevoke = async () => {
    if (
      !window.confirm(
        "Se va a deshabilitar el enlace para el cliente. ¿Estás seguro?",
      )
    ) {
      return;
    }
    try {
      await revokeLink.mutateAsync(undefined);
      addToast("Enlace deshabilitado.", "info");
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
      addToast("Enlace copiado al portapapeles.", "success");
    } catch (err) {
      logError("ClientPortalShareCard:copy", err);
    }
  };

  const handleShareWhatsApp = () => {
    if (!link) return;
    const text = encodeURIComponent(
      `Hola! Acá podés ver los detalles de tu evento: ${link.url}`,
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
            Portal del cliente
          </h3>
          <p className="text-sm text-text-secondary">
            Un enlace privado para que tu cliente vea el evento, el estado de
            pagos y los detalles clave.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Cargando…
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
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copiar enlace
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
              Compartir por WhatsApp
            </button>

            <button
              type="button"
              onClick={handleRotate}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-alt border border-border text-text-secondary text-sm font-medium rounded-lg hover:bg-surface transition-colors disabled:opacity-60"
              title="Invalida el enlace anterior y genera uno nuevo"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Rotar
            </button>

            <button
              type="button"
              onClick={handleRevoke}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-error text-sm font-medium rounded-lg hover:bg-error/10 transition-colors disabled:opacity-60"
            >
              <Link2Off className="h-4 w-4" aria-hidden="true" />
              Deshabilitar
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
          Generar enlace para el cliente
        </button>
      )}
    </section>
  );
};
