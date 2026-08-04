import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Star, MapPin, Sparkles } from "lucide-react";
import type { PublicOrganizerCard } from "@/services/organizersDirectoryService";
import { resolveMediaUrl } from "@/lib/mediaUrl";

/**
 * Directory card for a publicable organizer (#1117). Presentational — receives
 * the card data and renders it. Links to the full public profile /u/:slug.
 *
 * Design D5/D6/D7: dedicated component (not generic Card); cover with lazy load
 * + fallback gradient; rating rendered only when present (Free gating — backend
 * returns null for Free plans).
 */
export const OrganizerCard: React.FC<{ organizer: PublicOrganizerCard }> = ({
  organizer,
}) => {
  const { t } = useTranslation("public");
  const slug = organizer.slug;
  const href = slug ? `/u/${slug}` : "#";
  const cover = resolveMediaUrl(organizer.cover_url) ?? resolveMediaUrl(organizer.logo_url);
  const rating = organizer.average_rating ?? null;
  const reviewsCount = organizer.reviews_count ?? null;
  const location = organizer.city || organizer.country || null;
  const eventTypes = organizer.primary_event_types ?? [];
  const businessName = organizer.business_name || slug || "";

  return (
    <Link
      to={href}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      aria-label={businessName}
    >
      {/* Cover with lazy load + fallback gradient (D6) */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5">
        {cover ? (
          <img
            src={cover}
            alt={businessName}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-3xl font-black uppercase tracking-tight text-primary/40">
              {businessName.slice(0, 2)}
            </span>
          </div>
        )}
        {organizer.is_featured && (
          <span
            className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-card/95 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm backdrop-blur-sm"
            data-testid="featured-badge"
          >
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {t("public:directory.card.featured_badge")}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 p-4">
        <h3 className="line-clamp-1 text-base font-bold text-text">
          {businessName}
        </h3>
        {organizer.headline && (
          <p className="line-clamp-2 text-sm text-text-secondary">
            {organizer.headline}
          </p>
        )}

        {/* Rating (conditional — Free gating via null from backend, D7) */}
        {rating !== null && (
          <div className="flex items-center gap-1 text-sm font-medium text-text">
            <Star className="h-4 w-4 fill-primary text-primary" aria-hidden="true" />
            <span>{rating.toFixed(1)}</span>
            {reviewsCount !== null && reviewsCount > 0 && (
              <span className="text-text-tertiary">
                {t("public:directory.card.reviews_count", { count: reviewsCount })}
              </span>
            )}
          </div>
        )}

        {/* Location */}
        {location && (
          <div className="flex items-center gap-1 text-sm text-text-secondary">
            <MapPin className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
            <span className="line-clamp-1">{location}</span>
          </div>
        )}

        {/* Event type chips */}
        {eventTypes.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {eventTypes.slice(0, 3).map((type) => (
              <span
                key={type}
                className="rounded-full bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {t(`public:directory.search.event_type_options.${type}`, {
                  defaultValue: type,
                })}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};
