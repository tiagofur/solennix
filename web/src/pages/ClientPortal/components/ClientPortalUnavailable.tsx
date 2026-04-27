import React from "react";
import { Link2Off, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  reason: "not-found" | "disabled";
}

/**
 * Shown when the `/client/:token` URL points to a token that either
 * never existed (`not-found`) or was revoked/expired by the organizer
 * (`disabled`). Copy nudges the client to contact the organizer rather
 * than the Solennix team — the relationship here is with the organizer.
 */
export const ClientPortalUnavailable: React.FC<Props> = ({ reason }) => {
  const { t } = useTranslation("public");

  const heading =
    reason === "not-found" 
      ? t("portal.unavailable.not_found_title") 
      : t("portal.unavailable.disabled_title");

  const description =
    reason === "not-found"
      ? t("portal.unavailable.not_found_desc")
      : t("portal.unavailable.disabled_desc");

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center">
          <Link2Off className="h-8 w-8 text-warning" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text tracking-tight">
            {heading}
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            {description}
          </p>
        </div>

        <div className="bg-surface-alt rounded-xl border border-border p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-text-tertiary shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary text-left">
            {t("portal.unavailable.security_note")}
          </p>
        </div>
      </div>
    </div>
  );
};
