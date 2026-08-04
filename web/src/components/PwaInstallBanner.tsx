import React from "react";
import { useTranslation } from "react-i18next";
import { Download, Share, X } from "lucide-react";
import { usePwaInstall } from "@/hooks/usePwaInstall";

/**
 * Optional "Add to home screen" banner for inbound public pages (#1132).
 * - Android/Chrome: native beforeinstallprompt
 * - iOS Safari: manual Share → Add to Home Screen tip
 * Does not create a client account (NG1).
 */
export const PwaInstallBanner: React.FC = () => {
  const { t } = useTranslation("public");
  const { show, isIos, canPromptNative, promptInstall, dismiss } = usePwaInstall();

  if (!show) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4 pointer-events-none animate-fade-in-up"
      data-testid="pwa-install-banner"
      role="region"
      aria-label={t("pwa.region_label")}
    >
      <div className="pointer-events-auto mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-border bg-card/95 p-3.5 shadow-lg backdrop-blur-md sm:p-4">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Download className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-semibold text-text">{t("pwa.title")}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
              {isIos ? t("pwa.ios_body") : t("pwa.body")}
            </p>
          </div>
          {isIos ? (
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary">
              <Share className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              {t("pwa.ios_hint")}
            </p>
          ) : canPromptNative ? (
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="inline-flex items-center justify-center rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-on-primary shadow-xs hover:opacity-90 transition-opacity"
              data-testid="pwa-install-button"
            >
              {t("pwa.install_cta")}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1.5 text-text-tertiary hover:bg-surface-alt hover:text-text transition-colors"
          aria-label={t("pwa.dismiss")}
          data-testid="pwa-install-dismiss"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
