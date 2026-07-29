import React, { useState } from "react";
import { UserPlus, Share2, Copy, Check, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PublicOrganizerProfile } from "@/services/publicProfileService";
import { downloadVCard } from "@/lib/vcard";

interface PublicProfileQuickActionsProps {
  profile: PublicOrganizerProfile;
  onScrollToMap?: () => void;
}

export const PublicProfileQuickActions: React.FC<PublicProfileQuickActionsProps> = ({
  profile,
  onScrollToMap,
}) => {
  const { t } = useTranslation("public");
  const [copied, setCopied] = useState(false);

  const handleSaveContact = () => {
    downloadVCard(profile);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is blocked
      const input = document.createElement("input");
      input.value = window.location.href;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: profile.business_name || profile.name || "Solennix",
      text: profile.headline || profile.bio || "Perfil profesional en Solennix",
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or unsupported, fallback to copy
      }
    }
    await handleCopyLink();
  };

  return (
    <div
      className="mt-4 flex flex-wrap items-center gap-2"
      data-testid="public-profile-quick-actions"
    >
      <button
        type="button"
        onClick={handleSaveContact}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt/60 px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-alt hover:border-primary/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
        data-testid="quick-action-save-vcard"
      >
        <UserPlus className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span>{t("profile.actions.save_contact")}</span>
      </button>

      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt/60 px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-alt hover:border-primary/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
        data-testid="quick-action-share"
      >
        <Share2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        <span>{t("profile.actions.share")}</span>
      </button>

      <button
        type="button"
        onClick={handleCopyLink}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt/60 px-3 py-1.5 text-xs font-medium text-text hover:bg-surface-alt hover:border-primary/40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
        data-testid="quick-action-copy-link"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {t("profile.actions.link_copied")}
            </span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5 text-text-secondary" aria-hidden="true" />
            <span>{t("profile.actions.copy_link")}</span>
          </>
        )}
      </button>

      {profile.location && onScrollToMap && (
        <button
          type="button"
          onClick={onScrollToMap}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt/60 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-primary hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
          data-testid="quick-action-location"
        >
          <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <span>
            {[profile.location.city, profile.location.state].filter(Boolean).join(", ")}
          </span>
        </button>
      )}
    </div>
  );
};
