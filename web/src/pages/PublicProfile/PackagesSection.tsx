import React from "react";
import { Check, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/Card";
import { localeFromLanguage } from "@/lib/finance";
import { resolveMediaUrl } from "@/lib/api";
import type {
  PublicOrganizerProfile,
  PublicPackage,
} from "@/services/publicProfileService";

interface PackagesSectionProps {
  profile: PublicOrganizerProfile;
  /** Opens quote request prefilled for this package. */
  onRequestPackage?: (pkg: PublicPackage) => void;
}

function formatPrice(amount: number, language: string): string {
  try {
    return new Intl.NumberFormat(localeFromLanguage(language), {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

export const PackagesSection: React.FC<PackagesSectionProps> = ({
  profile,
  onRequestPackage,
}) => {
  const { t, i18n } = useTranslation("public");
  const packages = profile.packages ?? [];

  if (packages.length === 0) return null;
  // Featured first, then by sort_order.
  const sorted = [...packages].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return a.sort_order - b.sort_order;
  });

  return (
    <section aria-labelledby="public-packages-heading" className="space-y-4">
      <h2
        id="public-packages-heading"
        className="text-xs font-medium text-text-secondary uppercase tracking-wider"
      >
        {t("profile.packages_title", { defaultValue: "Packages" })}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {sorted.map((pkg) => {
          const img = pkg.image_url ? resolveMediaUrl(pkg.image_url) : null;
          const inclusions = pkg.inclusions ?? [];
          return (
            <li key={pkg.id}>
              <Card
                variant="default"
                padding="none"
                className={
                  pkg.is_featured
                    ? "overflow-hidden border-primary/60 ring-1 ring-primary/30"
                    : "overflow-hidden"
                }
              >
                {pkg.is_featured && (
                  <div className="flex items-center gap-1 px-4 py-1.5 bg-primary/10 text-primary text-xs font-semibold">
                    <Star className="h-3.5 w-3.5 fill-primary" aria-hidden="true" />
                    {t("profile.packages_featured", { defaultValue: "Featured" })}
                  </div>
                )}
                {img && (
                  <img
                    src={img}
                    alt=""
                    className="aspect-[16/9] w-full object-cover bg-surface-alt"
                    loading="lazy"
                  />
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-text">{pkg.title}</h3>
                    {pkg.from_price != null && (
                      <span className="text-primary font-bold whitespace-nowrap">
                        {t("profile.packages_from", { defaultValue: "from" })}{" "}
                        {formatPrice(pkg.from_price, i18n.language)}
                      </span>
                    )}
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {pkg.description}
                    </p>
                  )}
                  {inclusions.length > 0 && (
                    <ul className="space-y-1.5">
                      {inclusions.map((inc, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-text-secondary"
                        >
                          <Check
                            className="h-4 w-4 shrink-0 text-primary mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {onRequestPackage && (
                    <button
                      type="button"
                      onClick={() => onRequestPackage(pkg)}
                      data-testid={`package-request-${pkg.id}`}
                      className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                      style={
                        profile.brand_color
                          ? { backgroundColor: profile.brand_color }
                          : undefined
                      }
                    >
                      {t("profile.packages_request_cta", {
                        defaultValue: "Request this package",
                      })}
                    </button>
                  )}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
