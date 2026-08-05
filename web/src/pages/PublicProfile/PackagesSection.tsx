import React, { useMemo, useState } from "react";
import { Check, Star, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/Card";
import { localeFromLanguage } from "@/lib/finance";
import { resolveMediaUrl } from "@/lib/api";
import {
  calculatePackageQuote,
  type PackageQuoteLineInput,
  type PackageDiscountTierInput,
  type PricingUnit,
} from "@/lib/packageQuote";
import type { components } from "@/types/api";
import type { PublicOrganizerProfile } from "@/services/publicProfileService";

export type PublicPackageView = components["schemas"]["PublicPackage"];

interface PackagesSectionProps {
  profile: PublicOrganizerProfile;
  onRequestPackage?: (args: {
    packageId: string;
    title: string;
    guestCount: number;
    message: string;
    serviceIds: string[];
  }) => void;
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
  const packages = (profile.packages ?? []) as PublicPackageView[];
  const [guestsByPackage, setGuestsByPackage] = useState<Record<string, number>>(
    {},
  );

  if (packages.length === 0) return null;

  const sorted = [...packages].sort((a, b) => {
    if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
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
          const pkgId = pkg.id ?? pkg.title ?? "pkg";
          const img = pkg.image_url ? resolveMediaUrl(pkg.image_url) : null;
          const inclusions = pkg.inclusions ?? [];
          const hasItems = (pkg.items?.length ?? 0) > 0;
          const minGuests = pkg.min_guests ?? undefined;
          const defaultGuests = minGuests && minGuests > 0 ? minGuests : 50;
          const guests = guestsByPackage[pkgId] ?? defaultGuests;

          const lineInputs: PackageQuoteLineInput[] = (pkg.items ?? []).map(
            (it) => ({
              productId: it.product_id,
              name: it.name,
              unitPrice: it.unit_price,
              pricingUnit: (it.pricing_unit ?? "per_event") as PricingUnit,
            }),
          );
          const tierInputs: PackageDiscountTierInput[] = (
            pkg.discount_tiers ?? []
          ).map((t) => ({
            fromGuests: t.from_guests,
            discountPercent: t.discount_percent,
          }));
          const quote = hasItems
            ? calculatePackageQuote(guests, lineInputs, tierInputs, minGuests)
            : null;

          return (
            <li key={pkgId}>
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
                    <Star
                      className="h-3.5 w-3.5 fill-primary"
                      aria-hidden="true"
                    />
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
                    {!hasItems && pkg.from_price != null && (
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

                  {hasItems && quote && (
                    <div className="space-y-2" data-testid={`package-quote-${pkgId}`}>
                      <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("profile.packages_guests_label", {
                          defaultValue: "Number of guests",
                        })}
                        <input
                          type="number"
                          min={1}
                          value={guests}
                          onChange={(e) =>
                            setGuestsByPackage((prev) => ({
                              ...prev,
                              [pkgId]: Math.max(
                                1,
                                parseInt(e.target.value, 10) || 1,
                              ),
                            }))
                          }
                          className="ml-auto w-20 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-text"
                          data-testid={`package-guests-${pkgId}`}
                        />
                      </label>
                      {minGuests != null && minGuests > 0 && (
                        <p className="text-xs text-text-tertiary">
                          {t("profile.packages_min_guests", {
                            count: minGuests,
                            defaultValue: `Minimum ${minGuests} guests`,
                          })}
                        </p>
                      )}
                      <ul className="space-y-1.5 border-t border-border pt-2">
                        {quote.lines.map((ln) => (
                          <li
                            key={ln.productId}
                            className="flex justify-between gap-2 text-sm text-text-secondary"
                          >
                            <span className="min-w-0 truncate">
                              {ln.name}
                              {ln.pricingUnit === "per_guest"
                                ? ` × ${ln.quantity}`
                                : ""}
                            </span>
                            <span className="shrink-0 font-medium text-text">
                              {formatPrice(ln.lineTotal, i18n.language)}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="space-y-0.5 border-t border-border pt-2 text-sm">
                        <div className="flex justify-between text-text-secondary">
                          <span>
                            {t("profile.packages_subtotal", {
                              defaultValue: "Subtotal",
                            })}
                          </span>
                          <span>{formatPrice(quote.subtotal, i18n.language)}</span>
                        </div>
                        {quote.discountPercent > 0 && (
                          <div className="flex justify-between text-success">
                            <span>
                              {t("profile.packages_discount", {
                                percent: quote.discountPercent,
                                defaultValue: `Discount ${quote.discountPercent}%`,
                              })}
                            </span>
                            <span>
                              −{formatPrice(quote.discountAmount, i18n.language)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-text text-base pt-1">
                          <span>
                            {t("profile.packages_total", { defaultValue: "Total" })}
                          </span>
                          <span className="text-primary">
                            {formatPrice(quote.total, i18n.language)}
                          </span>
                        </div>
                      </div>
                      {quote.belowMinGuests && (
                        <p
                          className="text-xs text-warning font-medium"
                          data-testid={`package-min-warning-${pkgId}`}
                        >
                          {t("profile.packages_below_min", {
                            count: minGuests,
                            defaultValue: `This package requires at least ${minGuests} guests`,
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  {!hasItems && inclusions.length > 0 && (
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

                  {onRequestPackage && pkg.id && (
                    <button
                      type="button"
                      disabled={Boolean(quote?.belowMinGuests)}
                      onClick={() => {
                        const serviceIds = hasItems
                          ? (pkg.items ?? []).map((i) => i.product_id)
                          : [];
                        const message = hasItems
                          ? t("profile.packages_request_message_priced", {
                              title: pkg.title ?? "",
                              guests,
                              total: formatPrice(
                                quote?.total ?? 0,
                                i18n.language,
                              ),
                              defaultValue: `Me interesa el paquete "${pkg.title ?? ""}" para ${guests} personas (total estimado ${formatPrice(quote?.total ?? 0, i18n.language)}).`,
                            })
                          : t("profile.packages_request_message", {
                              title: pkg.title ?? "",
                              defaultValue: `Me interesa el paquete "${pkg.title ?? ""}".`,
                            });
                        onRequestPackage({
                          packageId: pkg.id!,
                          title: pkg.title ?? "",
                          guestCount: guests,
                          message,
                          serviceIds,
                        });
                      }}
                      data-testid={`package-request-${pkg.id}`}
                      className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary shadow-xs hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
