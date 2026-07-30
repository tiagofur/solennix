import React from "react";
import { Percent, CalendarX, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/Card";
import type { PublicOrganizerProfile } from "@/services/publicProfileService";

interface PoliciesSectionProps {
  profile: PublicOrganizerProfile;
}

export const PoliciesSection: React.FC<PoliciesSectionProps> = ({ profile }) => {
  const { t } = useTranslation("public");
  const policies = profile.policies;
  if (!policies) return null;

  const items: { icon: React.ReactNode; label: string; value: string }[] = [];
  if (policies.deposit_percent != null) {
    items.push({
      icon: <Percent className="h-4 w-4 text-primary" aria-hidden="true" />,
      label: t("profile.policies_deposit", { defaultValue: "Deposit" }),
      value: t("profile.policies_percent", {
        defaultValue: "{{value}}%",
        value: policies.deposit_percent,
      }),
    });
  }
  if (policies.cancellation_days != null) {
    items.push({
      icon: <CalendarX className="h-4 w-4 text-primary" aria-hidden="true" />,
      label: t("profile.policies_cancellation", { defaultValue: "Cancellation" }),
      value: t("profile.policies_days", {
        defaultValue: "{{value}} days",
        value: policies.cancellation_days,
      }),
    });
  }
  if (policies.refund_percent != null) {
    items.push({
      icon: <RotateCcw className="h-4 w-4 text-primary" aria-hidden="true" />,
      label: t("profile.policies_refund", { defaultValue: "Refund" }),
      value: t("profile.policies_percent", {
        defaultValue: "{{value}}%",
        value: policies.refund_percent,
      }),
    });
  }

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="public-policies-heading" className="space-y-4">
      <h2
        id="public-policies-heading"
        className="text-xs font-medium text-text-secondary uppercase tracking-wider"
      >
        {t("profile.policies_title", { defaultValue: "Policies" })}
      </h2>
      <Card variant="default" padding="md">
        <ul className="grid gap-4 sm:grid-cols-3">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                {item.icon}
              </div>
              <div>
                <p className="text-xs text-text-tertiary">{item.label}</p>
                <p className="font-semibold text-text text-sm">{item.value}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
};
