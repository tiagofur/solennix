import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  MapPin,
  Mail,
  Phone,
  MessageCircle,
  ExternalLink,
  Star,
  Quote,
  Moon,
  Sun,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/Card";
import { Reveal } from "@/components/Reveal";
import { localeFromLanguage } from "@/lib/finance";
import { resolveMediaUrl } from "@/lib/api";
import { PublicLeadModal } from "./PublicLeadModal";
import { Lightbox } from "./Lightbox";
import { PublicProfileQuickActions } from "./PublicProfileQuickActions";
import { PublicProfileMap } from "./PublicProfileMap";
import { PublicProfileAboutSection } from "./PublicProfileAboutSection";
import { PublicProfileSkeleton } from "./PublicProfileSkeleton";
import { SocialIcon } from "./SocialIcon";
import { PackagesSection } from "./PackagesSection";
import { FaqSection } from "./FaqSection";
import { PoliciesSection } from "./PoliciesSection";
import {
  publicProfileService,
  PublicProfileNotFoundError,
  type PublicOrganizerProfile,
  type PublicContact,
  type PublicLocation,
} from "@/services/publicProfileService";

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

type PageState = "loading" | "ready" | "not-found" | "error";

function formatLocation(loc?: PublicLocation | null): string {
  if (!loc) return "";
  return [loc.city, loc.region, loc.country].filter(Boolean).join(", ");
}

function contactHref(contact: PublicContact): string {
  const value = contact.value.trim();
  switch (contact.type) {
    case "email":
      return `mailto:${value}`;
    case "phone":
      return `tel:${value.replace(/\s+/g, "")}`;
    case "whatsapp": {
      const digits = value.replace(/[^\d+]/g, "").replace(/^\+/, "");
      return `https://wa.me/${digits}`;
    }
    case "url":
    default:
      if (/^https?:\/\//i.test(value)) return value;
      return `https://${value}`;
  }
}

function ContactIcon({ type }: { type: PublicContact["type"] }) {
  switch (type) {
    case "email":
      return <Mail className="h-4 w-4" aria-hidden="true" />;
    case "phone":
      return <Phone className="h-4 w-4" aria-hidden="true" />;
    case "whatsapp":
      return <MessageCircle className="h-4 w-4" aria-hidden="true" />;
    default:
      return <ExternalLink className="h-4 w-4" aria-hidden="true" />;
  }
}

/** Create or update a <meta> element (by attribute key/value, e.g. name/property). */
function upsertMeta(
  attr: "name" | "property",
  key: string,
  content: string,
) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setMetaDescription(content: string) {
  upsertMeta("name", "description", content);
}

/** Inject (or replace) a JSON-LD structured-data script by id. */
function setJsonLd(id: string, data: unknown) {
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.setAttribute("type", "application/ld+json");
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function SectionHeading({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="text-xs font-medium text-text-secondary uppercase tracking-wider"
    >
      {children}
    </h2>
  );
}

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-surface-alt text-text-secondary hover:bg-border"
      }`}
    >
      {children}
    </button>
  );
}

export const PublicProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation("public");
  const { theme, toggleTheme } = useTheme();

  const [state, setState] = useState<PageState>("loading");
  const [profile, setProfile] = useState<PublicOrganizerProfile | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!slug?.trim()) {
      setState("not-found");
      return;
    }

    const controller = new AbortController();
    setState("loading");
    setProfile(null);

    const load = async () => {
      try {
        const data = await publicProfileService.getBySlug(
          slug,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setProfile(data);
        setState("ready");
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        if (controller.signal.aborted) return;
        if (err instanceof PublicProfileNotFoundError) {
          setState("not-found");
          return;
        }
        setState("error");
      }
    };

    void load();
    return () => controller.abort();
  }, [slug]);

  const locationLabel = useMemo(
    () => formatLocation(profile?.location),
    [profile?.location],
  );

  const displayName =
    profile?.business_name?.trim() || profile?.slug || t("profile.fallback_name");

  useEffect(() => {
    if (state !== "ready" || !profile) return;
    const city = profile.location?.city?.trim();
    const title = city
      ? t("profile.seo_title_with_city", { name: displayName, city })
      : t("profile.seo_title", { name: displayName });
    document.title = title;
    const locationSuffix = locationLabel ? ` · ${locationLabel}` : "";
    const description = t("profile.seo_description", {
      name: displayName,
      location: locationSuffix,
    });
    setMetaDescription(description);

    // Social sharing + structured data (per-slug).
    const appURL = (import.meta.env.VITE_APP_URL || "https://solennix.app").replace(/\/$/, "");
    const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:8080/api").replace(/\/$/, "");
    const canonical = `${appURL}/u/${encodeURIComponent(profile.slug)}`;
    const ogImage = `${apiBase}/public/organizers/${encodeURIComponent(profile.slug)}/og-image`;

    setCanonical(canonical);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", "profile");
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", title);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", ogImage);

    // LocalBusiness structured data for rich results.
    const ld: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: displayName,
      url: canonical,
      image: ogImage,
    };
    if (profile.headline?.trim()) ld.description = profile.headline;
    if (locationLabel) ld.areaServed = locationLabel;
    if (profile.average_rating != null && profile.reviews_count) {
      ld.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: profile.average_rating.toFixed(1),
        reviewCount: profile.reviews_count,
      };
    }
    setJsonLd("public-profile-jsonld", ld);
  }, [state, profile, displayName, locationLabel, t]);

  // Featured services sort first (hierarchy), mirroring the backend's
  // is_featured DESC ordering so the order is consistent even if the API
  // contract changes.
  const services = [...(profile?.services?.filter(Boolean) ?? [])].sort(
    (a, b) => Number(b.is_featured) - Number(a.is_featured),
  );
  // Category filter + progressive disclosure for the services section.
  const SERVICES_PREVIEW_LIMIT = 6;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const categories = useMemo(
    () =>
      Array.from(
        new Set(services.map((s) => s.category).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [services],
  );
  // Reset filter/expansion when the profile changes (e.g. navigating to a
  // different organizer's profile within the same component instance).
  useEffect(() => {
    setActiveCategory(null);
    setShowAllServices(false);
  }, [slug]);
  const filteredServices = useMemo(
    () =>
      activeCategory
        ? services.filter((s) => s.category === activeCategory)
        : services,
    [services, activeCategory],
  );
  // When a category filter is active, show all of that category (the count is
  // already bounded by the organizer's curation); only cap the unfiltered list.
  const isFiltering = activeCategory !== null;
  const visibleServices =
    isFiltering || showAllServices
      ? filteredServices
      : filteredServices.slice(0, SERVICES_PREVIEW_LIMIT);
  const hiddenServicesCount = filteredServices.length - visibleServices.length;
  const reviews = profile?.reviews?.filter(Boolean) ?? [];
  const portfolio = profile?.portfolio?.filter(Boolean) ?? [];
  // Full-size images for the lightbox (carousel navigates this list).
  const lightboxItems = portfolio.map((item) => ({
    id: item.id,
    src: resolveMediaUrl(item.photo_url) ?? "",
    title: item.title,
    caption: item.event_date ?? undefined,
  }));
  const socialEntries = Object.entries(profile?.socials ?? {}).filter(
    ([, v]) => Boolean(v?.trim()),
  );

  // Social-proof aggregates.
  const eventsCompleted = profile?.events_completed ?? 0;
  const reviewsCount = profile?.reviews_count ?? 0;
  const averageRating = profile?.average_rating ?? 0;
  const ratingLabel = averageRating > 0 ? averageRating.toFixed(1) : null;
  // Pick the highest-rated review as a featured testimonial.
  const featuredReview =
    reviews.length > 0
      ? [...reviews].sort((a, b) => b.rating - a.rating)[0]
      : null;

  if (state === "loading") {
    return <PublicProfileSkeleton />;
  }

  if (state === "not-found" || state === "error") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <Card
          variant="default"
          padding="lg"
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-warning" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-text tracking-tight">
              {t("profile.not_found_title")}
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed">
              {t("profile.not_found_desc")}
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-xs hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {t("profile.back_home")}
          </Link>
        </Card>
      </div>
    );
  }

  if (!profile) return null;

  const brandStyle = profile.brand_color
    ? ({ ["--brand" as string]: profile.brand_color } as React.CSSProperties)
    : undefined;
  const logoSrc = profile.logo_url ? resolveMediaUrl(profile.logo_url) : null;
  const showName = profile.show_business_name ?? true;
  const coverSrc = profile.cover_url ? resolveMediaUrl(profile.cover_url) : null;
  // Hero background when there's no cover image: a soft gradient from the brand
  // color (or the Solennix gold) into the page background.
  const heroFallbackColor = profile.brand_color || "var(--color-primary, #C4A265)";
  const contactOpenExternal =
    profile.contact?.type === "url" || profile.contact?.type === "whatsapp";

  return (
    <div className="min-h-screen bg-bg transition-colors" style={brandStyle}>
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Solennix">
            <Logo size={32} />
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-text-secondary hover:bg-surface-alt transition-colors border border-transparent hover:border-border"
            aria-label={
              theme === "dark"
                ? t("profile.theme_light")
                : t("profile.theme_dark")
            }
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Header card */}
        <Card variant="default" padding="lg" className="overflow-hidden">
          {/* Hero cover banner */}
          <div className="-mx-8 -mt-8">
            <div
              className="relative h-32 sm:h-40 w-full bg-surface-alt"
              style={
                coverSrc
                  ? undefined
                  : {
                      backgroundImage: `linear-gradient(135deg, ${heroFallbackColor} 0%, color-mix(in srgb, ${heroFallbackColor} 45%, transparent) 100%)`,
                    }
              }
            >
              {coverSrc && (
                <img
                  src={coverSrc}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              )}
            </div>
          </div>

          {/* Logo + identity row (logo overlaps the hero bottom) */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-5">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={showName ? "" : displayName}
                className="-mt-10 sm:-mt-12 h-20 w-auto max-w-[280px] rounded-xl object-contain border-4 border-bg shrink-0 bg-surface-alt shadow-sm"
              />
            ) : (
              <div
                className="-mt-10 sm:-mt-12 h-20 w-20 rounded-2xl shrink-0 flex items-center justify-center text-2xl font-bold text-on-primary border-4 border-bg shadow-sm"
                style={{
                  backgroundColor:
                    profile.brand_color || "var(--color-primary, #C4A265)",
                }}
                aria-hidden="true"
              >
                {showName ? displayName.charAt(0).toUpperCase() : null}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-2 pt-3 sm:pt-4">
              {showName && (
                <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight break-words">
                  {displayName}
                </h1>
              )}
              {profile.headline?.trim() && (
                <p className="text-text-secondary text-base leading-relaxed">
                  {profile.headline}
                </p>
              )}
              {locationLabel && (
                <p className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{locationLabel}</span>
                </p>
              )}

              {/* Social-proof badges */}
              {(ratingLabel || eventsCompleted > 0) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {ratingLabel && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      <Star
                        className="h-4 w-4 fill-primary text-primary"
                        aria-hidden="true"
                      />
                      {ratingLabel}
                      <span className="font-normal text-text-secondary">
                        · {reviewsCount} {t("profile.reviews_count", { count: reviewsCount })}
                      </span>
                    </span>
                  )}
                  {eventsCompleted > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-3 py-1 text-sm font-medium text-text-secondary">
                      {t("profile.events_completed", { count: eventsCompleted })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsQuoteModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-xs hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
              style={
                profile.brand_color
                  ? { backgroundColor: profile.brand_color }
                  : undefined
              }
              data-testid="public-request-quote-button"
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              {t("profile.request_quote_cta")}
            </button>

            {profile.contact && (
              <a
                href={contactHref(profile.contact)}
                target={contactOpenExternal ? "_blank" : undefined}
                rel={contactOpenExternal ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-alt/70 px-4 py-2.5 text-sm font-semibold text-text hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <ContactIcon type={profile.contact.type} />
                {t("profile.contact_cta")}
              </a>
            )}
          </div>

          <PublicProfileQuickActions
            profile={profile}
            onScrollToMap={() => {
              document
                .getElementById("profile-location")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          />

          {socialEntries.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {socialEntries.map(([key, url]) => {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                return (
                  <li key={key}>
                    <a
                      href={/^https?:\/\//i.test(url) ? url : `https://${url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-alt/50 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-primary hover:border-primary/40 transition-colors capitalize"
                    >
                      <SocialIcon platform={key} className="h-3 w-3" />
                      {key}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Packages (combos) — shown above services for visual hierarchy */}
        <Reveal delay={120}>
          <PackagesSection profile={profile} />
        </Reveal>

        {/* Services */}
        {services.length > 0 && (
          <section
            aria-labelledby="public-services-heading"
            className="space-y-4 animate-fade-in-up"
          >
            <SectionHeading id="public-services-heading">
              {t("profile.services_title")}
            </SectionHeading>
            {categories.length > 1 && (
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={t("profile.services_title")}
              >
                <CategoryChip
                  active={activeCategory === null}
                  onClick={() => setActiveCategory(null)}
                >
                  {t("profile.services_all_categories")}
                </CategoryChip>
                {categories.map((cat) => (
                  <CategoryChip
                    key={cat}
                    active={activeCategory === cat}
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </CategoryChip>
                ))}
              </div>
            )}
            <ul className="grid gap-3 sm:grid-cols-2">
              {visibleServices.map((svc) => {
                const img = svc.image_url ? resolveMediaUrl(svc.image_url) : null;
                return (
                  <li key={svc.id}>
                    <Card
                      variant="default"
                      padding="sm"
                      className="h-full flex gap-3 !p-4"
                    >
                      {img ? (
                        <img
                          src={img}
                          alt=""
                          className="h-14 w-14 rounded-xl object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-xl bg-primary/10 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-text truncate">{svc.name}</p>
                        {svc.category && (
                          <p className="text-xs text-text-tertiary mt-0.5 capitalize">
                            {svc.category}
                          </p>
                        )}
                        {svc.base_price != null && (
                          <p className="text-sm text-primary font-semibold mt-1">
                            {formatPrice(svc.base_price, i18n.language)}
                          </p>
                        )}
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
            {hiddenServicesCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllServices(true)}
                data-testid="show-all-services"
                className="w-full rounded-xl border border-border bg-surface-alt/50 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-text"
              >
                {t("profile.services_show_all", {
                  count: hiddenServicesCount,
                })}
              </button>
            )}
          </section>
        )}

        {/* Featured testimonial */}
        {featuredReview && (
          <Card variant="default" padding="lg" className="border-l-4 border-primary">
            <div className="flex items-start gap-3">
              <Quote
                className="h-8 w-8 shrink-0 text-primary/40"
                aria-hidden="true"
              />
              <div className="space-y-2">
                {featuredReview.comment?.trim() && (
                  <p className="text-lg font-medium text-text leading-relaxed">
                    “{featuredReview.comment}”
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center gap-0.5"
                    aria-label={t("profile.rating_aria", {
                      rating: featuredReview.rating,
                    })}
                  >
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < featuredReview.rating
                            ? "fill-primary text-primary"
                            : "text-border"
                        }`}
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-text">
                    {featuredReview.display_name}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <section
            aria-labelledby="public-reviews-heading"
            className="space-y-4"
          >
            <SectionHeading id="public-reviews-heading">
              {t("profile.reviews_title")}
            </SectionHeading>
            <ul className="space-y-3">
              {reviews.map((review, idx) => (
                <li key={`${review.display_name}-${review.submitted_at}-${idx}`}>
                  <Card variant="default" padding="sm" className="!p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-text">
                        {review.display_name}
                      </p>
                      <div
                        className="flex items-center gap-0.5"
                        aria-label={t("profile.rating_aria", {
                          rating: review.rating,
                        })}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < review.rating
                                ? "fill-primary text-primary"
                                : "text-border"
                            }`}
                            aria-hidden="true"
                          />
                        ))}
                      </div>
                    </div>
                    {review.event_label && (
                      <p className="text-xs text-text-tertiary">
                        {review.event_label}
                      </p>
                    )}
                    {review.comment?.trim() && (
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {review.comment}
                      </p>
                    )}
                    {review.organizer_response?.trim() && (
                      <div className="mt-2 rounded-xl bg-surface-alt/50 border border-border px-3 py-2">
                        <p className="text-xs font-medium text-text-secondary mb-1">
                          {t("profile.organizer_response")}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {review.organizer_response}
                        </p>
                      </div>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Portfolio */}
        {portfolio.length > 0 && (
          <section
            aria-labelledby="public-portfolio-heading"
            className="space-y-4"
          >
            <SectionHeading id="public-portfolio-heading">
              {t("profile.portfolio_title")}
            </SectionHeading>

            {/* Featured carousel (horizontal scroll) */}
            <ul className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
              {portfolio.map((item, idx) => {
                const img = resolveMediaUrl(item.photo_url);
                return (
                  <li
                    key={item.id}
                    className="shrink-0 w-[80%] sm:w-[60%] snap-center"
                  >
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className="block w-full text-left rounded-2xl overflow-hidden border border-border shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary bg-surface-alt"
                      aria-label={t("profile.portfolio_open", {
                        defaultValue: "Open {{title}}",
                        title: item.title,
                      })}
                    >
                      <img
                        src={img}
                        alt={item.title}
                        className="aspect-[16/9] w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Thumbnail grid */}
            <ul className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {portfolio.map((item, idx) => {
                const img = resolveMediaUrl(item.thumbnail_url || item.photo_url);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className="block w-full text-left h-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-2xl"
                      aria-label={t("profile.portfolio_open", {
                        defaultValue: "Open {{title}}",
                        title: item.title,
                      })}
                    >
                      <Card variant="default" padding="none" className="overflow-hidden h-full">
                        <img
                          src={img}
                          alt={item.title}
                          className="aspect-[4/3] w-full object-cover bg-surface-alt"
                          loading="lazy"
                        />
                        <div className="p-3">
                          <p className="text-sm font-bold text-text truncate">
                            {item.title}
                          </p>
                          {item.event_date && (
                            <p className="text-xs text-text-tertiary mt-0.5">
                              {item.event_date}
                            </p>
                          )}
                        </div>
                      </Card>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <Reveal>
          <PublicProfileAboutSection profile={profile} />
        </Reveal>

        {profile.location && (
          <Reveal delay={80}>
            <PublicProfileMap
              location={profile.location}
              businessName={displayName}
            />
          </Reveal>
        )}

        <Reveal delay={80}>
          <PoliciesSection profile={profile} />
        </Reveal>
        <Reveal>
          <FaqSection profile={profile} />
        </Reveal>
      </main>

      <PublicLeadModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        slug={profile.slug || slug || ""}
        businessName={displayName}
        brandColor={profile.brand_color}
        services={profile.services ?? []}
      />

      {lightboxIndex !== null && (
        <Lightbox
          items={lightboxItems}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
        />
      )}

      <footer className="border-t border-border py-6 mt-4">
        <p className="text-center text-xs text-text-tertiary">
          {t("profile.powered_by")}{" "}
          <Link to="/" className="text-primary font-medium hover:underline">
            Solennix
          </Link>
        </p>
      </footer>
    </div>
  );
};

export default PublicProfilePage;
