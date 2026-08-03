import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search as SearchIcon, MapPin, Calendar, Loader2, AlertCircle } from "lucide-react";
import Empty from "@/components/Empty";
import { Pagination } from "@/components/Pagination";
import { upsertMeta, setDocumentTitle } from "@/lib/seo";
import { useDirectoryFilters } from "./useDirectoryFilters";
import { useSearchOrganizers } from "./useSearchOrganizers";
import { OrganizerCard } from "./OrganizerCard";

const EVENT_TYPES = ["boda", "corporativo", "xv", "infantil", "baby_shower", "bautizo", "banquete", "social"];

/**
 * Public directory page /proveedores (#1117). Unauthenticated (NG1 ratified).
 * Hero + inline search (city + event type + q) + responsive grid of
 * OrganizerCard + pagination + skeleton/empty/error states.
 *
 * Filters live in the URL (design D3); text inputs are debounced (D4); the
 * grid uses React Query with keepPreviousData to avoid layout shift (D2).
 */
export const ProveedoresPage: React.FC = () => {
  const { t } = useTranslation("public");
  const { inputValues, eventType, page, filters, setCity, setQ, setEventType, setPage, clear } =
    useDirectoryFilters();
  const { data, isLoading, isError, isFetching } = useSearchOrganizers(filters);

  const items = data?.data ?? [];
  const totalPages = data?.total_pages ?? 0;
  const isFirstLoad = isLoading && !data;

  // Scroll to top on page change for predictable navigation.
  useEffect(() => {
    if (page > 1) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  // SEO meta tags (#1119) — title, description, Open Graph.
  useEffect(() => {
    const title = t("public:directory.title");
    const subtitle = t("public:directory.subtitle");
    setDocumentTitle(title);
    upsertMeta("name", "description", subtitle);
    upsertMeta("property", "og:title", title);
    upsertMeta("property", "og:description", subtitle);
    upsertMeta("property", "og:type", "website");
    upsertMeta("name", "robots", "index, follow");
  }, [t]);

  return (
    <div className="min-h-screen bg-bg">
      {/* Hero */}
      <div className="border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
          <h1 className="text-3xl font-black tracking-tight text-text sm:text-4xl">
            {t("public:directory.title")}
          </h1>
          <p className="mt-2 text-text-secondary">{t("public:directory.subtitle")}</p>

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

        {/* Grid */}
        {!isFirstLoad && !isError && items.length > 0 && (
          <>
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
