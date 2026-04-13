import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Link2,
  Plus,
  Copy,
  Share2,
  Trash2,
  ExternalLink,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import {
  useEventFormLinks,
  useGenerateLink,
  useDeleteLink,
} from "@/hooks/queries/useEventFormQueries";
import { useToast } from "@/hooks/useToast";
import type { EventFormLink } from "@/types/entities";

export const EventFormLinksPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: links, isLoading } = useEventFormLinks();
  const generateLink = useGenerateLink();
  const deleteLink = useDeleteLink();

  const [showDialog, setShowDialog] = useState(false);
  const [label, setLabel] = useState("");
  const [ttlDays, setTtlDays] = useState(7);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      await generateLink.mutateAsync({
        label: label.trim() || undefined,
        ttlDays,
      });
      addToast("Enlace creado", "success");
      setShowDialog(false);
      setLabel("");
      setTtlDays(7);
    } catch {
      addToast("Error al crear enlace", "error");
    }
  };

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      addToast("Enlace copiado", "success");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      addToast("No se pudo copiar", "error");
    }
  };

  const handleShare = async (url: string, label?: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Formulario de evento",
          text: label
            ? `Formulario: ${label}`
            : "Llena los datos de tu evento",
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy(url, "share");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Revocar este enlace? Ya no podrá ser utilizado.")) return;
    try {
      await deleteLink.mutateAsync(id);
      addToast("Enlace revocado", "success");
    } catch {
      addToast("Error al revocar", "error");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (link: EventFormLink) => {
    switch (link.status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
            <Clock className="h-3 w-3" />
            Activo
          </span>
        );
      case "used":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info">
            <CheckCircle2 className="h-3 w-3" />
            Usado
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-text-tertiary/10 text-text-tertiary">
            <XCircle className="h-3 w-3" />
            Expirado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">
            Formularios
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Genera enlaces para que tus clientes llenen datos de su evento
          </p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl premium-gradient text-white font-medium text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          Generar enlace
        </button>
      </div>

      {/* Links list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !links || links.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Link2 className="h-12 w-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text mb-2">
            Sin formularios
          </h3>
          <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
            Genera un enlace compartible para que tus clientes potenciales
            llenen los datos de su evento y seleccionen productos.
          </p>
          <button
            onClick={() => setShowDialog(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl premium-gradient text-white font-medium text-sm"
          >
            <Plus className="h-4 w-4" />
            Crear primer enlace
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-text truncate">
                    {link.label || "Sin etiqueta"}
                  </p>
                  {getStatusBadge(link)}
                </div>

                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Expira: {formatDate(link.expires_at)}
                  </span>
                  {link.used_at && (
                    <span>Usado: {formatDate(link.used_at)}</span>
                  )}
                </div>

                {link.status === "active" && (
                  <p className="text-xs text-text-tertiary mt-1 truncate font-mono">
                    {link.url}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {link.status === "active" && (
                  <>
                    <button
                      onClick={() => handleCopy(link.url, link.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-alt transition-colors"
                      title="Copiar enlace"
                    >
                      {copiedId === link.id ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">Copiar</span>
                    </button>
                    <button
                      onClick={() => handleShare(link.url, link.label)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-alt transition-colors"
                      title="Compartir"
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Compartir</span>
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="inline-flex items-center px-3 py-2 rounded-lg border border-border text-sm text-error/70 hover:bg-error/5 hover:text-error transition-colors"
                      title="Revocar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}

                {link.status === "used" && link.submitted_event_id && (
                  <button
                    onClick={() =>
                      navigate(
                        `/events/${link.submitted_event_id}/summary`
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-alt transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Ver evento
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate Dialog (Modal) */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-text">Generar enlace</h2>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Etiqueta (opcional)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ej: Boda de María y Pedro"
                className="w-full px-4 py-3 rounded-xl border border-border text-sm bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Válido por: {ttlDays} día{ttlDays !== 1 ? "s" : ""}
              </label>
              <input
                type="range"
                min={1}
                max={30}
                value={ttlDays}
                onChange={(e) => setTtlDays(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-text-tertiary mt-1">
                <span>1 día</span>
                <span>30 días</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-text hover:bg-surface-alt transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                disabled={generateLink.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl premium-gradient text-white text-sm font-medium disabled:opacity-60"
              >
                {generateLink.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Crear"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
