import React, { useEffect, useRef, useState } from "react";
import {
  Link2,
  Plus,
  Copy,
  Share2,
  Trash2,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  Ban,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useRequestLinks,
  useCreateRequestLink,
  useRevokeRequestLink,
} from "@/hooks/queries/useRequestLinkQueries";
import { useToast } from "@/hooks/useToast";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import Empty from "@/components/Empty";
import type {
  PublicRequestLink,
  SubmitMode,
} from "@/services/requestLinkService";
import { PlanLimitExceededError } from "@/lib/api";

export const RequestLinksPanel: React.FC = () => {
  const { t, i18n } = useTranslation(["requests", "public", "common"]);
  const { addToast } = useToast();
  const { data: links, isLoading } = useRequestLinks();
  const createLink = useCreateRequestLink();
  const revokeLink = useRevokeRequestLink();

  const [showDialog, setShowDialog] = useState(false);
  const [label, setLabel] = useState("");
  const [ttlDays, setTtlDays] = useState(7);
  const [maxUses, setMaxUses] = useState<string>("1");
  const [submitMode, setSubmitMode] = useState<SubmitMode>("auto_event");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCreate = async () => {
    try {
      const maxUsesNum =
        maxUses.trim() === "" ? null : Math.max(1, parseInt(maxUses, 10) || 1);
      await createLink.mutateAsync({
        label: label.trim() || undefined,
        ttl_days: ttlDays,
        max_uses: maxUsesNum,
        submit_mode: submitMode,
      });
      addToast(t("requests:links.toast.created"), "success");
      setShowDialog(false);
      setLabel("");
      setTtlDays(7);
      setMaxUses("1");
      setSubmitMode("auto_event");
    } catch (err) {
      if (err instanceof PlanLimitExceededError) {
        addToast(
          t("requests:links.toast.plan_limit", {
            max: err.max,
            current: err.current,
          }),
          "error",
        );
      } else {
        addToast(t("requests:links.toast.error_create"), "error");
      }
    }
  };

  const handleCopy = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      addToast(t("requests:links.toast.copied"), "success");
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch {
      addToast(t("requests:links.toast.error_copy"), "error");
    }
  };

  const handleShare = async (url: string, linkLabel?: string | null) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("requests:links.share_title"),
          text: linkLabel
            ? t("requests:links.share_text_with_label", { label: linkLabel })
            : t("requests:links.share_text_default"),
          url,
        });
      } catch {
        // cancelled
      }
    } else {
      handleCopy(url, "share");
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokeId) return;
    try {
      await revokeLink.mutateAsync(revokeId);
      addToast(t("requests:links.toast.revoked"), "success");
    } catch {
      addToast(t("requests:links.toast.error_revoke"), "error");
    } finally {
      setRevokeId(null);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const parsedDate = dateStr.includes("T")
      ? new Date(dateStr)
      : new Date(dateStr + "T12:00:00");
    return parsedDate.toLocaleDateString(
      i18n.language === "es" ? "es-MX" : "en-US",
      { day: "numeric", month: "short", year: "numeric" },
    );
  };

  const statusBadge = (link: PublicRequestLink) => {
    const map: Record<
      string,
      { className: string; icon: React.ReactNode; key: string }
    > = {
      active: {
        className: "bg-success/10 text-success",
        icon: <Clock className="h-3 w-3" />,
        key: "active",
      },
      used: {
        className: "bg-info/10 text-info",
        icon: <CheckCircle2 className="h-3 w-3" />,
        key: "used",
      },
      expired: {
        className: "bg-text-tertiary/10 text-text-tertiary",
        icon: <XCircle className="h-3 w-3" />,
        key: "expired",
      },
      revoked: {
        className: "bg-error/10 text-error",
        icon: <Ban className="h-3 w-3" />,
        key: "revoked",
      },
    };
    const s = map[link.status] || map.expired;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}
      >
        {s.icon}
        {t(`requests:links.status.${s.key}`)}
      </span>
    );
  };

  return (
    <div className="space-y-6" data-testid="request-links-panel">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-text">
            {t("requests:links.title")}
          </h2>
          <p className="text-sm text-text-secondary mt-0.5">
            {t("requests:links.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowDialog(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl premium-gradient text-white font-medium text-sm shadow-lg shadow-primary/20 hover:shadow-xl transition-all hover:scale-[1.02]"
          data-testid="request-links-create"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {t("requests:links.new_link")}
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !links || links.length === 0 ? (
        <Empty
          icon={Link2}
          title={t("requests:links.no_links")}
          description={t("requests:links.no_links_desc")}
          action={
            <button
              type="button"
              onClick={() => setShowDialog(true)}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white premium-gradient shadow-md shadow-primary/20"
            >
              <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
              {t("requests:links.create_first")}
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          {links.map((link) => (
            <div
              key={link.id}
              className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
              data-testid={`request-link-row-${link.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-semibold text-text truncate">
                    {link.label || t("requests:links.no_label")}
                  </p>
                  {statusBadge(link)}
                  <span className="text-xs text-text-tertiary">
                    {t(`requests:links.submit_mode.${link.submit_mode}`)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
                  {link.expires_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      {t("requests:links.expires", {
                        date: formatDate(link.expires_at),
                      })}
                    </span>
                  )}
                  {link.max_uses != null && (
                    <span>
                      {t("requests:links.uses", {
                        used: link.use_count ?? 0,
                        max: link.max_uses,
                      })}
                    </span>
                  )}
                </div>
                {link.status === "active" && link.url && (
                  <p className="text-xs text-text-tertiary mt-1 truncate font-mono">
                    {link.url}
                  </p>
                )}
              </div>

              {link.status === "active" && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(link.url, link.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-alt transition-colors"
                    aria-label={t("requests:links.copy")}
                  >
                    {copiedId === link.id ? (
                      <Check className="h-4 w-4 text-success" aria-hidden="true" />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    )}
                    <span className="hidden sm:inline">
                      {t("requests:links.copy")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShare(link.url, link.label)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-alt transition-colors"
                    aria-label={t("requests:links.share")}
                  >
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">
                      {t("requests:links.share")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevokeId(link.id)}
                    className="inline-flex items-center px-3 py-2 rounded-lg border border-border text-sm text-error/70 hover:bg-error/5 hover:text-error transition-colors"
                    aria-label={t("requests:links.revoke")}
                    data-testid={`request-link-revoke-${link.id}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-card rounded-2xl border border-border p-6 w-full max-w-md space-y-4 shadow-xl"
            data-testid="request-links-create-dialog"
          >
            <h2 className="text-lg font-bold text-text">
              {t("requests:links.dialog_title")}
            </h2>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("requests:links.label_field")}
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t("requests:links.label_placeholder")}
                className="w-full px-4 py-3 rounded-xl border border-border text-sm bg-card text-text placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40"
                data-testid="request-links-label-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("requests:links.valid_for", { count: ttlDays })}
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
                <span>{t("requests:links.day_one")}</span>
                <span>{t("requests:links.day_plural", { count: 30 })}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("requests:links.max_uses_label")}
              </label>
              <input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder={t("requests:links.max_uses_unlimited")}
                className="w-full px-4 py-3 rounded-xl border border-border text-sm bg-card text-text"
                data-testid="request-links-max-uses-input"
              />
              <p className="text-xs text-text-tertiary mt-1">
                {t("requests:links.max_uses_hint")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                {t("requests:links.submit_mode_label")}
              </label>
              <select
                value={submitMode}
                onChange={(e) => setSubmitMode(e.target.value as SubmitMode)}
                className="w-full px-4 py-3 rounded-xl border border-border text-sm bg-card text-text"
                data-testid="request-links-submit-mode"
              >
                <option value="auto_event">
                  {t("requests:links.submit_mode.auto_event")}
                </option>
                <option value="auto_quote">
                  {t("requests:links.submit_mode.auto_quote")}
                </option>
                <option value="standard">
                  {t("requests:links.submit_mode.standard")}
                </option>
              </select>
              <p className="text-xs text-text-tertiary mt-1">
                {t(`requests:links.submit_mode_help.${submitMode}`)}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDialog(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-text hover:bg-surface-alt"
              >
                {t("requests:links.cancel")}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={createLink.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl premium-gradient text-white text-sm font-medium disabled:opacity-60"
                data-testid="request-links-create-confirm"
              >
                {createLink.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  t("requests:links.create")
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={revokeId !== null}
        title={t("requests:links.revoke")}
        description={t("requests:links.confirm_revoke")}
        confirmText={t("requests:links.revoke")}
        cancelText={t("requests:links.cancel")}
        onConfirm={handleConfirmRevoke}
        onCancel={() => setRevokeId(null)}
      />
    </div>
  );
};
