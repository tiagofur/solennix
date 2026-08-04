import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, ExternalLink, Loader2, X } from "lucide-react";
import {
  listingModerationService,
  type ModerationListing,
} from "@/services/listingModerationService";
import { useToast } from "@/hooks/useToast";
import { resolveMediaUrl } from "@/lib/mediaUrl";

/**
 * Admin queue for directory listing moderation (#1130).
 */
export const AdminListingModeration: React.FC = () => {
  const { t } = useTranslation(["admin", "common"]);
  const qc = useQueryClient();
  const addToast = useToast((s) => s.addToast);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["admin", "listing-moderation"],
    queryFn: () => listingModerationService.listQueue("pending_review"),
  });

  const approve = useMutation({
    mutationFn: (id: string) => listingModerationService.approve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "listing-moderation"] });
      addToast(t("admin:moderation.approved", { defaultValue: "Listing approved" }), "success");
    },
    onError: () =>
      addToast(t("admin:moderation.error", { defaultValue: "Action failed" }), "error"),
  });

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      listingModerationService.reject(id, reason),
    onSuccess: () => {
      setRejectId(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin", "listing-moderation"] });
      addToast(t("admin:moderation.rejected", { defaultValue: "Listing rejected" }), "success");
    },
    onError: () =>
      addToast(t("admin:moderation.error", { defaultValue: "Action failed" }), "error"),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8" data-testid="admin-listing-moderation">
      <div className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-text">
          {t("admin:moderation.title", { defaultValue: "Listing moderation" })}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t("admin:moderation.subtitle", {
            defaultValue: "Review profiles before they appear in /proveedores",
          })}
        </p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {isError && (
        <p className="text-sm text-error">
          {t("admin:moderation.load_error", { defaultValue: "Could not load queue" })}
        </p>
      )}

      {!isLoading && data.length === 0 && (
        <p className="rounded-2xl border border-border bg-card px-4 py-10 text-center text-sm text-text-secondary">
          {t("admin:moderation.empty", { defaultValue: "No listings pending review" })}
        </p>
      )}

      <ul className="space-y-4">
        {data.map((item) => (
          <ModerationCard
            key={item.user_id}
            item={item}
            busy={approve.isPending || reject.isPending}
            onApprove={() => approve.mutate(item.user_id)}
            onRejectOpen={() => {
              setRejectId(item.user_id);
              setReason("");
            }}
          />
        ))}
      </ul>

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
            <h2 className="text-base font-bold text-text">
              {t("admin:moderation.reject_title", { defaultValue: "Reject listing" })}
            </h2>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text"
              placeholder={t("admin:moderation.reason_placeholder", {
                defaultValue: "Reason for the provider…",
              })}
              data-testid="reject-reason"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="rounded-xl border border-border px-3 py-2 text-sm font-medium"
              >
                {t("common:actions.cancel", { defaultValue: "Cancel" })}
              </button>
              <button
                type="button"
                disabled={reason.trim().length < 3 || reject.isPending}
                onClick={() => reject.mutate({ id: rejectId, reason: reason.trim() })}
                className="rounded-xl bg-error px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                data-testid="reject-confirm"
              >
                {t("admin:moderation.reject_cta", { defaultValue: "Reject" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ModerationCard: React.FC<{
  item: ModerationListing;
  busy: boolean;
  onApprove: () => void;
  onRejectOpen: () => void;
}> = ({ item, busy, onApprove, onRejectOpen }) => {
  const { t } = useTranslation(["admin"]);
  const cover = resolveMediaUrl(item.cover_url);

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-surface-alt sm:w-40">
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-text-tertiary">
              No cover
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-text">{item.business_name || item.public_slug}</h3>
            {item.publication_spam_flag && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                <AlertTriangle className="h-3 w-3" />
                {t("admin:moderation.spam_flag", { defaultValue: "Flagged" })}
              </span>
            )}
            <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs text-text-secondary">
              {item.plan}
            </span>
          </div>
          {(item.city || item.country) && (
            <p className="mt-0.5 text-sm text-text-secondary">
              {[item.city, item.country].filter(Boolean).join(", ")}
            </p>
          )}
          {item.headline && (
            <p className="mt-2 line-clamp-2 text-sm text-text">{item.headline}</p>
          )}
          {item.public_slug && (
            <Link
              to={`/u/${item.public_slug}`}
              target="_blank"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              /u/{item.public_slug}
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
        <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
          <button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="inline-flex items-center justify-center gap-1 rounded-xl bg-success px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            data-testid={`approve-${item.user_id}`}
          >
            <Check className="h-3.5 w-3.5" />
            {t("admin:moderation.approve", { defaultValue: "Approve" })}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onRejectOpen}
            className="inline-flex items-center justify-center gap-1 rounded-xl border border-error/40 px-3 py-2 text-xs font-bold text-error disabled:opacity-50"
            data-testid={`reject-${item.user_id}`}
          >
            <X className="h-3.5 w-3.5" />
            {t("admin:moderation.reject", { defaultValue: "Reject" })}
          </button>
        </div>
      </div>
    </li>
  );
};
