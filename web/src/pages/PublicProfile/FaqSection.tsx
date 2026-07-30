import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PublicOrganizerProfile } from "@/services/publicProfileService";

interface FaqSectionProps {
  profile: PublicOrganizerProfile;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ profile }) => {
  const { t } = useTranslation("public");
  const faq = profile.faq ?? [];
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (faq.length === 0) return null;

  return (
    <section aria-labelledby="public-faq-heading" className="space-y-4">
      <h2
        id="public-faq-heading"
        className="text-xs font-medium text-text-secondary uppercase tracking-wider"
      >
        {t("profile.faq_title", { defaultValue: "FAQ" })}
      </h2>
      <ul className="space-y-2">
        {faq.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="w-full text-left flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-surface-alt/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="font-semibold text-text text-sm">{item.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-text-secondary transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
              {isOpen && (
                <p className="px-4 pt-3 text-sm text-text-secondary leading-relaxed">
                  {item.answer}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};
