import React, { useState, useRef, useEffect } from "react";
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
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import Empty from "@/components/Empty";

export const EventFormLinksPage: React.FC = () => {
  const { t, i18n } = useTranslation("public");
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data: links, isLoading } = useEventFormLinks();
  const generateLink = useGenerateLink();
  const deleteLink = useDeleteLink();

  const [showDialog, setShowDialog] = useState(false);
  const [label, setLabel] = useState("");
  const [ttlDays, setTtlDays] = useState(7);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteLinkId, setDeleteLinkId] = useState<string | null>(null);

  const handleGenerate = async () => {
    try {
      await generateLink.mutateAsync({
        label: label.trim() || undefined,
        ttlDays,
      });
      addToast(t("admin_links.toast.created"), "success");
      setShowDialog(false);
      setLabel("");
      setTtlDays(7);
    } catch {
      addToast(t("admin_links.toast.error_create"), "error");
    }
  };

  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      addToast(t("admin_links.toast.copied"), "success");
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch {
      addToast(t("admin_links.toast.error_copy"), "error");
    }
  };

  const handleShare = async (url: string, linkLabel?: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("admin_links.share_title"),
          text: linkLabel
            ? t("admin_links.share_text_with_label", { label: linkLabel })
            : t("admin_links.share_text_default"),
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy(url, "share");
    }
  };

  const handleDelete = (id: string) => {
    setDeleteLinkId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteLinkId) return;
    try {
      await deleteLink.mutateAsync(deleteLinkId);
      addToast(t("admin_links.toast.revoked"), "success");
    } catch {
      addToast(t("admin_links.toast.error_revoke"), "error");
    } finally {
      setDeleteLinkId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const parsedDate = dateStr.includes("T") ? new Date(dateStr) : new Date(dateStr + "T12:00:00");
    return parsedDate.toLocaleDateString(i18n.language === "es" ? "es-MX" : "en-US", {
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
            {t("admin_links.status.active")}
          </span>
        );
      case "used":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-info/10 text-info">
            <CheckCircle2 className="h-3 w-3" />
            {t("admin_links.status.used")}
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-text-tertiary/10 text-text-tertiary">
            <XCircle className="h-3 w-3" />
            {t("admin_links.status.expired")}
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
            {t("admin_links.title")}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {t("admin_links.subtitle")}
          </p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl premium-gradient text-white font-medium text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          {t("admin_links.new_link")}
        </button>
      </div>

      {/* Links list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !links || links.length === 0 ? (
        <Empty
          icon={Link2}
          title={t("admin_links.no_links")}
          description={t("admin_links.no_links_desc")}
          action={
            <button
              onClick={() => setShowDialog(true)}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20 hover:shadow-lg transition-all hover:scale-[1.02]"
            >
              <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
              {t("admin_links.create_first")}
            </button>
          }
        />
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
                    {link.label || t("admin_links.no_label")}
                  </p>
                  {getStatusBadge(link)}
                </div>

                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t("admin_links.expires", { date: formatDate(link.expires_at) })}
                  </span>
                  {link.used_at && (
                    <span>{t("admin_links.used", { date: formatDate(link.used_at) })}</span>
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
                      title={t("admin_links.copy")}
                    >
                      {copiedId === link.id ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span className="hidden sm:inline">{t("admin_links.copy")}</span>
                    </button>
                    <button
                      onClick={() => handleShare(link.url, link.label)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-alt transition-colors"
                      title={t("admin_links.share")}
                    >
                      <Share2 className="h-4 w-4" />
                      <span className="hidden sm:inline">{t("admin_links.share")}</span>
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="inline-flex items-center px-3 py-2 rounded-lg border border-border text-sm text-error/70 hover:bg-error/5 hover:text-error transition-colors"
                      aria-label={t("admin_links.revoke")}
                      title={t("admin_links.revoke")}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
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
                    {t("admin_links.view_event")}
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
            <h2 className="text-lg font-bold text-text">{t("admin_links.dialog_title")}</h2>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("admin_links.label_field")}
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t("admin_links.label_placeholder")}
                className="w-full px-4 py-3 rounded-xl border border-border text-sm bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("admin_links.valid_for", { count: ttlDays })}
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
                <span>{t("admin_links.day_one")}</span>
                <span>{t("admin_links.day_plural", { count: 30 })}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-text hover:bg-surface-alt transition-colors"
              >
                {t("admin_links.cancel")}
              </button>
              <button
                onClick={handleGenerate}
                disabled={generateLink.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl premium-gradient text-white text-sm font-medium disabled:opacity-60"
              >
                {generateLink.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  t("admin_links.create")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteLinkId !== null}
        title={t("admin_links.revoke")}
        description={t("admin_links.confirm_revoke")}
        confirmText={t("admin_links.revoke")}
        cancelText={t("admin_links.cancel")}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteLinkId(null)}
      />
    </div>
  );
};
