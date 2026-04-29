import React from "react";
import { Clock, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PublicFormExpiredProps {
  reason?: "expired" | "not_found";
}

export const PublicFormExpired: React.FC<PublicFormExpiredProps> = ({ reason = "expired" }) => {
  const { t } = useTranslation("public");
  const titleKey = reason === "not_found" ? "event_form.not_found.title" : "event_form.expired.title";
  const descriptionKey = reason === "not_found" ? "event_form.not_found.description" : "event_form.expired.description";

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center">
          <Clock className="h-8 w-8 text-warning" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text tracking-tight">
            {t(titleKey)}
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            {t(descriptionKey)}
          </p>
        </div>

        <div className="bg-surface-alt rounded-xl border border-border p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-text-tertiary shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary text-left">
            {t("event_form.expired.security_note")}
          </p>
        </div>
      </div>
    </div>
  );
};
