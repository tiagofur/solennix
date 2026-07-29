import React from "react";
import { Info, Users, MapPin, Zap, Globe, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/Card";
import type { PublicOrganizerProfile } from "@/services/publicProfileService";

interface PublicProfileAboutSectionProps {
  profile: PublicOrganizerProfile;
}

export const PublicProfileAboutSection: React.FC<PublicProfileAboutSectionProps> = ({
  profile,
}) => {
  const { t } = useTranslation("public");

  const hasAbout = Boolean(profile.about?.trim());
  const hasCoverage = Boolean(profile.service_areas && profile.service_areas.length > 0);
  const hasCapacity = Boolean(profile.min_guests || profile.max_guests);
  const hasEventTypes = Boolean(profile.event_types && profile.event_types.length > 0);
  const hasResponseTime = Boolean(profile.response_time?.trim());
  const hasLanguages = Boolean(profile.languages && profile.languages.length > 0);

  if (!hasAbout && !hasCoverage && !hasCapacity && !hasEventTypes && !hasResponseTime && !hasLanguages) {
    return null;
  }

  let capacityText = "";
  if (profile.min_guests && profile.max_guests) {
    capacityText = t("profile.about.capacity_value", {
      min: profile.min_guests,
      max: profile.max_guests,
    });
  } else if (profile.min_guests) {
    capacityText = t("profile.about.capacity_value_min_only", {
      min: profile.min_guests,
    });
  } else if (profile.max_guests) {
    capacityText = t("profile.about.capacity_value_max_only", {
      max: profile.max_guests,
    });
  }

  return (
    <section className="mt-8" data-testid="public-profile-about-section">
      <h3 className="text-base font-semibold text-text flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-primary" aria-hidden="true" />
        {t("profile.about.heading")}
      </h3>

      <Card className="p-6 space-y-6 border border-border bg-surface shadow-xs">
        {hasAbout && (
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line" data-testid="about-bio-text">
            {profile.about}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
          {hasCapacity && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Users className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary">
                  {t("profile.about.capacity_label")}
                </p>
                <p className="text-sm font-semibold text-text mt-0.5" data-testid="about-capacity-text">
                  {capacityText}
                </p>
              </div>
            </div>
          )}

          {hasResponseTime && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                <Zap className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary">
                  {t("profile.about.response_time_heading")}
                </p>
                <p className="text-sm font-semibold text-text mt-0.5" data-testid="about-response-time">
                  {profile.response_time}
                </p>
              </div>
            </div>
          )}

          {hasCoverage && (
            <div className="flex items-start gap-3 sm:col-span-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <MapPin className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary">
                  {t("profile.about.coverage_heading")}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5" data-testid="about-service-areas">
                  {profile.service_areas?.map((area, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-md bg-surface-alt px-2.5 py-1 text-xs font-medium text-text border border-border/60"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasEventTypes && (
            <div className="flex items-start gap-3 sm:col-span-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary">
                  {t("profile.about.event_types_heading")}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5" data-testid="about-event-types">
                  {profile.event_types?.map((type, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary capitalize"
                    >
                      {t(`profile.event_types.${type}`, { defaultValue: type })}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasLanguages && (
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Globe className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary">
                  {t("profile.about.languages_heading")}
                </p>
                <p className="text-sm font-semibold text-text mt-0.5" data-testid="about-languages">
                  {profile.languages?.join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
};
