import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Loader2,
  MapPin,
  Mail,
  Phone,
  MessageCircle,
  ExternalLink,
  Star,
  Moon,
  Sun,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Logo } from "@/components/Logo";
import { localeFromLanguage } from "@/lib/finance";
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

function setMetaDescription(content: string) {
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

export const PublicProfilePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation("public");
  const { theme, toggleTheme } = useTheme();

  const [state, setState] = useState<PageState>("loading");
  const [profile, setProfile] = useState<PublicOrganizerProfile | null>(null);

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
    setMetaDescription(
      t("profile.seo_description", {
        name: displayName,
        location: locationSuffix,
      }),
    );
  }, [state, profile, displayName, locationLabel, t]);

  const services = profile?.services?.filter(Boolean) ?? [];
  const reviews = profile?.reviews?.filter(Boolean) ?? [];
  const portfolio = profile?.portfolio?.filter(Boolean) ?? [];
  const socialEntries = Object.entries(profile?.socials ?? {}).filter(
    ([, v]) => Boolean(v?.trim()),
  );

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2
          className="h-8 w-8 animate-spin text-primary"
          aria-label={t("profile.loading")}
        />
      </div>
    );
  }

  if (state === "not-found" || state === "error") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
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
            className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          >
            {t("profile.back_home")}
          </Link>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const brandStyle = profile.brand_color
    ? ({ ["--brand" as string]: profile.brand_color } as React.CSSProperties)
    : undefined;

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
        <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            {profile.logo_url ? (
              <img
                src={profile.logo_url}
                alt=""
                className="h-20 w-20 rounded-2xl object-cover border border-border shrink-0 bg-surface-alt"
              />
            ) : (
              <div
                className="h-20 w-20 rounded-2xl shrink-0 flex items-center justify-center text-2xl font-bold text-white"
                style={{
                  backgroundColor: profile.brand_color || "var(--color-primary, #C4A265)",
                }}
                aria-hidden="true"
              >
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-text tracking-tight break-words">
                {displayName}
              </h1>
              {profile.headline?.trim() && (
                <p className="text-text-secondary text-base leading-relaxed">
                  {profile.headline}
                </p>
              )}
              {locationLabel && (
                <p className="flex items-center gap-1.5 text-sm text-text-secondary">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{locationLabel}</span>
                </p>
              )}
            </div>
          </div>

          {profile.contact && (
            <div className="mt-6">
              <a
                href={contactHref(profile.contact)}
                target={
                  profile.contact.type === "url" ||
                  profile.contact.type === "whatsapp"
                    ? "_blank"
                    : undefined
                }
                rel={
                  profile.contact.type === "url" ||
                  profile.contact.type === "whatsapp"
                    ? "noopener noreferrer"
                    : undefined
                }
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                <ContactIcon type={profile.contact.type} />
                {t("profile.contact_cta")}
              </a>
            </div>
          )}

          {socialEntries.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {socialEntries.map(([key, url]) => (
                <li key={key}>
                  <a
                    href={
                      /^https?:\/\//i.test(url) ? url : `https://${url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-primary hover:border-primary/40 transition-colors capitalize"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    {key}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Services */}
        {services.length > 0 && (
          <section aria-labelledby="public-services-heading" className="space-y-4">
            <h2
              id="public-services-heading"
              className="text-lg font-semibold text-text"
            >
              {t("profile.services_title")}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {services.map((svc) => (
                <li
                  key={svc.id}
                  className="rounded-xl border border-border bg-surface p-4 flex gap-3"
                >
                  {svc.image_url ? (
                    <img
                      src={svc.image_url}
                      alt=""
                      className="h-14 w-14 rounded-lg object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-primary/10 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-text truncate">{svc.name}</p>
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
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <section aria-labelledby="public-reviews-heading" className="space-y-4">
            <h2
              id="public-reviews-heading"
              className="text-lg font-semibold text-text"
            >
              {t("profile.reviews_title")}
            </h2>
            <ul className="space-y-3">
              {reviews.map((review, idx) => (
                <li
                  key={`${review.display_name}-${review.submitted_at}-${idx}`}
                  className="rounded-xl border border-border bg-surface p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-text">
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
                    <div className="mt-2 rounded-lg bg-surface-alt border border-border px-3 py-2">
                      <p className="text-xs font-medium text-text-secondary mb-1">
                        {t("profile.organizer_response")}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {review.organizer_response}
                      </p>
                    </div>
                  )}
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
            <h2
              id="public-portfolio-heading"
              className="text-lg font-semibold text-text"
            >
              {t("profile.portfolio_title")}
            </h2>
            <ul className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {portfolio.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border bg-surface overflow-hidden"
                >
                  <img
                    src={item.thumbnail_url || item.photo_url}
                    alt=""
                    className="aspect-[4/3] w-full object-cover bg-surface-alt"
                    loading="lazy"
                  />
                  <div className="p-3">
                    <p className="text-sm font-medium text-text truncate">
                      {item.title}
                    </p>
                    {item.event_date && (
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {item.event_date}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="border-t border-border py-6 mt-4">
        <p className="text-center text-xs text-text-tertiary">
          {t("profile.powered_by")}{" "}
          <Link to="/" className="text-primary hover:underline">
            Solennix
          </Link>
        </p>
      </footer>
    </div>
  );
};

export default PublicProfilePage;
