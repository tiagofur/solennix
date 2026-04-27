import React, { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search as SearchIcon,
  Users,
  ChevronRight,
  Loader2,
  SearchX,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es, enUS } from "date-fns/locale";
import Empty from "../components/Empty";
import { useTranslation } from "react-i18next";
import { useSearch } from "../hooks/queries/useSearchQueries";

const formatEventDate = (value: string, locale: string) => {
  try {
    return format(parseISO(value), "d MMM yyyy", {
      locale: locale === "en" ? enUS : es,
    });
  } catch {
    return value;
  }
};

export const SearchPage: React.FC = () => {
  const { t, i18n } = useTranslation(["search"]);
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim();

  const { data: results, isLoading: loading, error: searchError } = useSearch(query);
  const safeResults = results ?? { clients: [], events: [], products: [], inventory: [] };
  const error = searchError ? t("search:error") : null;

  const totalResults = useMemo(() => {
    const res = results ?? { clients: [], events: [], products: [], inventory: [] };
    return (
      (res.clients?.length || 0) +
      (res.events?.length || 0) +
      (res.products?.length || 0) +
      (res.inventory?.length || 0)
    );
  }, [results]);

  if (!query) {
    return (
      <Empty
        icon={SearchIcon}
        title={t("search:empty.title")}
        description={t("search:empty.description")}
      />
    );
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center py-12 text-text-secondary"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
        <span className="sr-only">{t("search:loading")}</span>
        {t("search:loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-error/5 border border-error/30 rounded-lg p-4 text-sm text-error"
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (!totalResults) {
    return (
      <Empty
        icon={SearchX}
        title={t("search:no_results.title")}
        description={t("search:no_results.description", { query })}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">{t("search:title")}</h1>
          <p className="text-sm text-text-secondary">
            {t(
              totalResults === 1
                ? "search:subtitle_single"
                : "search:subtitle_plural",
              { count: totalResults, query }
            )}
          </p>
        </div>
        <div className="flex items-center text-sm text-text-secondary">
          <SearchIcon className="h-4 w-4 mr-2" aria-hidden="true" />
          {t("search:global_search")}
        </div>
      </div>

      {safeResults.clients.length > 0 && (
        <section className="bg-card rounded-lg shadow-xs border border-border overflow-hidden mt-6">
          <div className="px-4 py-3 border-b border-border bg-surface-alt flex items-center justify-between">
            <h2 className="font-semibold text-text flex items-center">
              <Users className="h-4 w-4 mr-2 text-info" aria-hidden="true" />
              {t("search:sections.clients")} ({safeResults.clients.length})
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {safeResults.clients.map((client) => (
              <li key={client.id}>
                <Link
                  to={client.href}
                  className="block px-4 py-3 hover:bg-surface-alt transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-text group-hover:text-primary transition-colors">
                        {client.title}
                      </p>
                      {client.subtitle && (
                        <p className="text-sm text-text-secondary">
                          {client.subtitle}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      className="h-5 w-5 text-text-secondary group-hover:text-primary transition-colors"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {safeResults.events.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">{t("search:sections.events")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {safeResults.events.map((event) => (
              <Link
                key={event.id}
                to={event.href}
                className="group rounded-lg border border-border bg-card p-4 shadow-xs hover:shadow-md transition"
              >
                <p className="text-sm font-semibold text-text group-hover:text-primary">
                  {event.title}
                </p>
                {event.subtitle && (
                  <p className="text-xs text-text-secondary">
                    {event.subtitle}
                  </p>
                )}
                <p className="text-xs text-text-secondary">
                  {event.meta ? formatEventDate(event.meta, i18n.language) : ""}
                  {event.meta && event.status ? " - " : ""}
                  {event.status ? t(`search:status.${event.status}`) : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {safeResults.products.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">{t("search:sections.products")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {safeResults.products.map((product) => (
              <Link
                key={product.id}
                to={product.href}
                className="group rounded-lg border border-border bg-card p-4 shadow-xs hover:shadow-md transition"
              >
                <p className="text-sm font-semibold text-text group-hover:text-primary">
                  {product.title}
                </p>
                {product.subtitle && (
                  <p className="text-xs text-text-secondary">
                    {product.subtitle}
                  </p>
                )}
                {product.meta && (
                  <p className="text-xs text-text-secondary">{product.meta}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {safeResults.inventory.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">{t("search:sections.inventory")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {safeResults.inventory.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="group rounded-lg border border-border bg-card p-4 shadow-xs hover:shadow-md transition"
              >
                <p className="text-sm font-semibold text-text group-hover:text-primary">
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="text-xs text-text-secondary">{item.subtitle}</p>
                )}
                {item.meta && (
                  <p className="text-xs text-text-secondary">{item.meta}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
