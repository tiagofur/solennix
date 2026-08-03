import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Share2, Copy, Check, MessageCircle, ExternalLink, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { publicProfileConfigService } from "@/services/publicProfileConfigService";

/**
 * ShareProfileCard — prominent "Share my profile" card for the provider dashboard
 * (#1120 Parte B). The motor of v2.0 acquisition (PRD §6.4): each share = potential
 * client at ~$0 CAC.
 *
 * Reads `public_slug` from the auth user + `is_enabled` via React Query. If the
 * profile isn't enabled (or no slug), shows a CTA to Settings instead of share actions.
 */
export const ShareProfileCard: React.FC = () => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // Fetch is_enabled (lives in organizer_public_profiles, not users).
  const { data: profile, isLoading } = useQuery({
    queryKey: ["my-public-profile"],
    queryFn: () => publicProfileConfigService.getMyPublicProfile(),
    staleTime: 60_000,
  });

  const slug = user?.public_slug || profile?.public_slug || "";
  const isEnabled = profile?.is_enabled ?? false;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const profileUrl = slug ? `${origin}/u/${slug}` : "";

  const hasShareableProfile = Boolean(slug && isEnabled);

  const handleCopy = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
    } catch {
      // Fallback for restrictive environments (HTTP, permissions).
      const textarea = document.createElement("textarea");
      textarea.value = profileUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch {
        // Last resort: do nothing graceful.
      }
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (typeof navigator.share === "function" && profileUrl) {
      try {
        await navigator.share({
          title: t("share.title"),
          url: profileUrl,
        });
      } catch {
        // User cancelled or share failed — silent.
      }
    }
  };

  const whatsappUrl = profileUrl
    ? `https://wa.me/?text=${encodeURIComponent(t("share.whatsapp_text", { link: profileUrl }))}`
    : "";

  const hasNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  // --- Empty state: profile not enabled or no slug ---
  if (!isLoading && !hasShareableProfile) {
    return (
      <div
        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
        data-testid="share-profile-empty"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Globe className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-text">{t("share.empty_title")}</h3>
            <p className="mt-1 text-xs text-text-secondary leading-relaxed">
              {t("share.empty_message")}
            </p>
            <Link
              to="/settings?tab=public-profile"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:opacity-90 transition-opacity"
              data-testid="share-empty-cta"
            >
              {t("share.empty_cta")}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --- Loading skeleton (brief, while fetching is_enabled) ---
  if (isLoading) {
    return (
      <div
        className="rounded-2xl border border-border bg-card p-5 shadow-sm animate-shimmer"
        style={{ minHeight: "120px" }}
        aria-busy="true"
      />
    );
  }

  // --- Active share card ---
  return (
    <div
      className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-card p-5 shadow-sm"
      data-testid="share-profile-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Share2 className="h-5 w-5 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-text">{t("share.title")}</h3>
          <p className="mt-1 text-xs text-text-secondary leading-relaxed">
            {t("share.incentive")}
          </p>

          {/* Profile link preview */}
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex max-w-full items-center gap-1 truncate rounded-lg bg-surface px-3 py-1.5 text-xs text-primary hover:underline"
            data-testid="share-profile-url"
          >
            <span className="truncate">{profileUrl}</span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          </a>

          {/* Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text hover:border-primary/50 transition-colors"
              data-testid="share-copy-btn"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  {t("share.copied")}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("share.copy_link")}
                </>
              )}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text hover:border-primary/50 transition-colors"
              data-testid="share-whatsapp-btn"
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {t("share.whatsapp")}
            </a>

            {hasNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-on-primary hover:opacity-90 transition-opacity"
                data-testid="share-native-btn"
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                {t("share.share_native")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
