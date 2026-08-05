import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search as SearchIcon,
  MapPin,
  Calendar,
  Loader2,
  AlertCircle,
  Crosshair,
  X,
  Moon,
  Sun,
} from "lucide-react";
import Empty from "@/components/Empty";
import { Logo } from "@/components/Logo";
import { Pagination } from "@/components/Pagination";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { useTheme } from "@/hooks/useTheme";
import { upsertMeta, setDocumentTitle, setJsonLd, removeJsonLd } from "@/lib/seo";
import { recordPageView } from "@/services/pageViewService";
import { useDirectoryFilters } from "./useDirectoryFilters";
import { useSearchOrganizers } from "./useSearchOrganizers";
import { OrganizerCard } from "./OrganizerCard";
import {
  buildDirectoryDescription,
  buildDirectoryItemListJsonLd,
  buildDirectoryTitle,
  DIRECTORY_JSON_LD_ID,
  DIRECTORY_SITE_ORIGIN,
} from "./directorySeo";

const EVENT_TYPES = ["boda", "corporativo", "xv", "infantil", "baby_shower", "bautizo", "banquete", "social"];

/** Common product categories for service filter (#1128). Free-text ILIKE on backend. */
const SERVICE_CATEGORIES = [
  "catering",
  "comida",
  "decoracion",
  "musica",
  "dj",
  "fotografia",
  "video",
  "flores",
  "mobiliario",
  "meseros",
  "animacion",
  "pasteleria",
];

const BUDGET_BUCKETS = ["under_1k", "1k_5k", "over_5k"] as const;
const RADIUS_OPTIONS = ["25", "50", "100"] as const;

/**
 * Public directory page /providers (#1117 / #1128). Unauthenticated (NG1).
 * Hero + search + advanced filters (geo, budget, service, availability) + grid.
 * Filters live in the URL (design D3); text inputs are debounced (D4).
 * Legacy /proveedores redirects here (SPA + nginx 301).
 */
export const ProveedoresPage: React.FC = () => {
  const { t } = useTranslation("public");
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const {
    inputValues, eventType, sort, page, filters,
    serviceCategory, availableOn, budgetBucket, radiusKm,
    geoLoading, geoError, isGeoActive,
    setCity, setQ, setEventType, setSort, setPage,
    setServiceCategory, setAvailableOn, setBudgetBucket, setRadiusKm,
    useNearMe, clearGeo, clearFilter, clear,
  } = useDirectoryFilters();
  const { data, isLoading, isError, isFetching } = useSearchOrganizers(filters);

  const items = data?.data ?? [];
  const totalPages = data?.total_pages ?? 0;
  const isFirstLoad = isLoading && !data;
  // #1129 — featured strip on page 1 only (cap 6). Does not hide them from the grid.
  const featuredStrip =
    page === 1
      ? items.filter((o) => o.is_featured).slice(0, 6)
      : [];

  useEffect(() => {
    void recordPageView("directory");
  }, []);

  // Scroll to top on page change for predictable navigation.
  useEffect(() => {
    if (page > 1) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const serviceLabel = serviceCategory
    ? t(`public:directory.filters.service_options.${serviceCategory}`, {
        defaultValue: serviceCategory,
      })
    : undefined;
  const eventTypeLabel = eventType
    ? t(`public:directory.search.event_type_options.${eventType}`, {
        defaultValue: eventType,
      })
    : undefined;
  const cityForSeo = (filters.city || inputValues.city || "").trim() || undefined;

  const pageUrl = `${location.pathname}${location.search}`;
  const seoInput = {
    baseTitle: t("public:directory.title"),
    baseDescription: t("public:directory.subtitle"),
    city: cityForSeo,
    serviceLabel,
    eventTypeLabel,
    pageUrl,
  };
  const pageTitle = buildDirectoryTitle(seoInput);
  const pageDescription = buildDirectoryDescription(seoInput);

  // SEO meta + ItemList JSON-LD (filter-aware; cleanup on unmount).
  useEffect(() => {
    setDocumentTitle(pageTitle);
    upsertMeta("name", "description", pageDescription);
    upsertMeta("property", "og:title", pageTitle);
    upsertMeta("property", "og:description", pageDescription);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:url", `${DIRECTORY_SITE_ORIGIN}${pageUrl}`);
    upsertMeta("name", "robots", "index, follow");

    const listItems = items
      .filter((o) => o.slug)
      .slice(0, 20)
      .map((o) => ({
        name: o.business_name || o.slug || "Provider",
        url: `/u/${o.slug}`,
        description: o.headline || undefined,
      }));

    setJsonLd(
      DIRECTORY_JSON_LD_ID,
      buildDirectoryItemListJsonLd({ ...seoInput, pageUrl }, listItems),
    );

    return () => {
      removeJsonLd(DIRECTORY_JSON_LD_ID);
    };
    // items identity changes with query results; pageTitle/description encode filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seo fields covered by pageTitle/pageDescription/pageUrl
  }, [pageTitle, pageDescription, pageUrl, items]);

  return (
    <div className="min-h-screen bg-bg animate-fade-in">
      <header className="sticky top-0 z-40 bg-bg/80 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" aria-label="Solennix">
            <Logo size={32} />
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-text-secondary hover:bg-surface-alt transition-colors border border-transparent hover:border-border"
            aria-label={
              theme === "dark"
                ? t("public:directory.theme_light", { defaultValue: "Switch to light mode" })
                : t("public:directory.theme_dark", { defaultValue: "Switch to dark mode" })
            }
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Moon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <div className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <h1 className="text-3xl font-black tracking-tight text-text sm:text-4xl">
            {pageTitle.replace(/\s*\|\s*Solennix\s*$/, "")}
          </h1>
          <p className="mt-2 text-text-secondary">{pageDescription}</p>

          {/* Hub entry chips — category + event type for discovery / internal linking */}
          <div className="mt-6 space-y-4" data-testid="directory-hub-chips">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                {t("public:directory.hub.services_label")}
              </p>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((cat) => {
                  const active = serviceCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      data-testid={`hub-service-${cat}`}
                      onClick={() => setServiceCategory(active ? "" : cat)}
                      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-text hover:border-primary/40"
                      }`}
                    >
                      {t(`public:directory.filters.service_options.${cat}`, {
                        defaultValue: cat,
                      })}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                {t("public:directory.hub.events_label")}
              </p>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((type) => {
                  const active = eventType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      data-testid={`hub-event-${type}`}
                      onClick={() => setEventType(active ? "" : type)}
                      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-text hover:border-primary/40"
                      }`}
                    >
                      {t(`public:directory.search.event_type_options.${type}`, {
                        defaultValue: type,
                      })}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Inline search (no sidebar — MVP, sidebar deferred to #1128 S15) */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex-1">
              <span className="sr-only">{t("public:directory.search.city_label")}</span>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
                <input
                  type="text"
                  value={inputValues.city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("public:directory.search.city_placeholder")}
                  className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </label>

            <label className="sm:w-56">
              <span className="sr-only">{t("public:directory.search.event_type_label")}</span>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-border bg-card py-2.5 pl-9 pr-8 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">{t("public:directory.search.event_type_any")}</option>
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`public:directory.search.event_type_options.${type}`, { defaultValue: type })}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label className="flex-1">
              <span className="sr-only">{t("public:directory.search.q_label")}</span>
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden="true" />
                <input
                  type="text"
                  value={inputValues.q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("public:directory.search.q_placeholder")}
                  className="w-full rounded-xl border border-border bg-card py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </label>
          </div>

          {/* Geo + sort + radius (#1128) */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {isGeoActive ? (
              <button
                type="button"
                onClick={clearGeo}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary"
                data-testid="geo-active-btn"
              >
                <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
                {t("public:directory.geo.active")}
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={useNearMe}
                disabled={geoLoading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-text hover:border-primary/50 transition-colors disabled:opacity-50"
                data-testid="geo-near-me-btn"
              >
                {geoLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {t("public:directory.geo.near_me")}
              </button>
            )}

            {isGeoActive && (
              <select
                value={radiusKm || "50"}
                onChange={(e) => setRadiusKm(e.target.value)}
                className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-text focus:border-primary focus:outline-none"
                aria-label={t("public:directory.geo.radius_label")}
                data-testid="radius-select"
              >
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {t("public:directory.geo.radius_km", { km: r })}
                  </option>
                ))}
              </select>
            )}

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-text focus:border-primary focus:outline-none"
              aria-label={t("public:directory.search.sort_label", { defaultValue: "Sort" })}
              data-testid="sort-select"
            >
              <option value="">{t("public:directory.search.sort_relevance")}</option>
              <option value="distance">{t("public:directory.geo.sort_distance")}</option>
              <option value="rating">{t("public:directory.search.sort_rating")}</option>
              <option value="recent">{t("public:directory.search.sort_recent")}</option>
            </select>

            {geoError && (
              <span className="text-xs text-error" data-testid="geo-error">
                {t(`public:directory.geo.${geoError}`)}
              </span>
            )}
          </div>

          {/* Advanced filters: budget, service, availability (#1128) */}
          <div
            className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3"
            data-testid="advanced-filters"
          >
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-text-secondary">
                {t("public:directory.filters.budget_label")}
              </span>
              <select
                value={budgetBucket}
                onChange={(e) =>
                  setBudgetBucket(e.target.value as typeof budgetBucket)
                }
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                data-testid="budget-select"
              >
                <option value="">{t("public:directory.filters.budget_any")}</option>
                {BUDGET_BUCKETS.map((b) => (
                  <option key={b} value={b}>
                    {t(`public:directory.filters.budget_${b}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-text-secondary">
                {t("public:directory.filters.service_label")}
              </span>
              <select
                value={serviceCategory}
                onChange={(e) => setServiceCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                data-testid="service-category-select"
              >
                <option value="">{t("public:directory.filters.service_any")}</option>
                {SERVICE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`public:directory.filters.service_options.${c}`, {
                      defaultValue: c,
                    })}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-text-secondary">
                {t("public:directory.filters.available_on_label")}
              </span>
              <input
                type="date"
                value={availableOn}
                onChange={(e) => setAvailableOn(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text focus:border-primary focus:outline-none"
                data-testid="available-on-input"
              />
            </label>
          </div>

          {/* Active filter chips */}
          {(budgetBucket || serviceCategory || availableOn || isGeoActive || eventType || inputValues.city || inputValues.q) && (
            <div className="mt-3 flex flex-wrap items-center gap-2" data-testid="active-filter-chips">
              {isGeoActive && (
                <FilterChip
                  label={t("public:directory.geo.active")}
                  onRemove={() => clearFilter("geo")}
                />
              )}
              {budgetBucket && (
                <FilterChip
                  label={t(`public:directory.filters.budget_${budgetBucket}`)}
                  onRemove={() => clearFilter("budget")}
                />
              )}
              {serviceCategory && (
                <FilterChip
                  label={t(`public:directory.filters.service_options.${serviceCategory}`, {
                    defaultValue: serviceCategory,
                  })}
                  onRemove={() => clearFilter("service_category")}
                />
              )}
              {availableOn && (
                <FilterChip
                  label={t("public:directory.filters.chip_date", { date: availableOn })}
                  onRemove={() => clearFilter("available_on")}
                />
              )}
              {eventType && (
                <FilterChip
                  label={t(`public:directory.search.event_type_options.${eventType}`, {
                    defaultValue: eventType,
                  })}
                  onRemove={() => clearFilter("event_type")}
                />
              )}
              {inputValues.city && (
                <FilterChip
                  label={inputValues.city}
                  onRemove={() => clearFilter("city")}
                />
              )}
              <button
                type="button"
                onClick={clear}
                className="text-xs font-semibold text-primary hover:underline"
                data-testid="clear-all-filters"
              >
                {t("public:directory.empty.clear_cta")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Error */}
        {isError && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertCircle className="h-10 w-10 text-error" aria-hidden="true" />
            <p className="text-text-secondary">{t("public:directory.error_title")}</p>
          </div>
        )}

        {/* Skeleton on first load */}
        {isFirstLoad && (
          <div
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
            role="status"
            aria-busy="true"
            aria-label={t("public:directory.loading")}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <DirectoryCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!isFirstLoad && !isError && items.length === 0 && (
          <Empty
            title={t("public:directory.empty.title")}
            description={t("public:directory.empty.message")}
            action={
              <button
                type="button"
                onClick={clear}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90"
              >
                {t("public:directory.empty.clear_cta")}
              </button>
            }
          />
        )}

        {/* Featured strip (#1129) — Business first slot, subtle gold, no empty slots */}
        {!isFirstLoad && !isError && featuredStrip.length > 0 && (
          <section className="mb-10" data-testid="featured-strip" aria-labelledby="featured-heading">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2
                  id="featured-heading"
                  className="text-lg font-bold tracking-tight text-text sm:text-xl"
                >
                  {filters.city
                    ? t("public:directory.featured.title_city", { city: filters.city })
                    : t("public:directory.featured.title")}
                </h2>
                <p className="mt-0.5 text-sm text-text-secondary">
                  {t("public:directory.featured.subtitle")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featuredStrip.map((organizer, idx) => (
                <OrganizerCard
                  key={`feat-${organizer.slug ?? idx}`}
                  organizer={organizer}
                />
              ))}
            </div>
          </section>
        )}

        {/* Full results grid (featured still appear — reorder only, AC) */}
        {!isFirstLoad && !isError && items.length > 0 && (
          <>
            {featuredStrip.length > 0 && (
              <h2 className="mb-4 text-base font-semibold text-text-secondary">
                {t("public:directory.featured.all_results")}
              </h2>
            )}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((organizer, idx) => (
                <OrganizerCard key={organizer.slug ?? `org-${idx}`} organizer={organizer} />
              ))}
            </div>

            {/* Subtle refetch indicator without unmounting the grid (keepPreviousData) */}
            {isFetching && (
              <div className="mt-4 flex justify-center" aria-live="polite">
                <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" aria-hidden="true" />
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Optional A2HS for inbound visitors (#1132) — no client account */}
      <PwaInstallBanner />
    </div>
  );
};

/** Local skeleton matching the OrganizerCard layout (cover + 3 lines). */
const DirectoryCardSkeleton: React.FC = () => (
  <div className="overflow-hidden rounded-2xl border border-border bg-card">
    <div className="aspect-[16/10] w-full animate-shimmer bg-border/40" />
    <div className="space-y-2 p-4">
      <div className="h-4 w-2/3 animate-shimmer rounded bg-border/40" />
      <div className="h-3 w-full animate-shimmer rounded bg-border/40" />
      <div className="h-3 w-1/2 animate-shimmer rounded bg-border/40" />
    </div>
  </div>
);

const FilterChip: React.FC<{ label: string; onRemove: () => void }> = ({
  label,
  onRemove,
}) => (
  <button
    type="button"
    onClick={onRemove}
    className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
  >
    {label}
    <X className="h-3 w-3" aria-hidden="true" />
  </button>
);
