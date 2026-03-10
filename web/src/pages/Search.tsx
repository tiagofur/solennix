import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search as SearchIcon,
  Users,
  ChevronRight,
  Loader2,
  SearchX,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import Empty from "../components/Empty";
import { logError } from "../lib/errorHandler";
import { SearchResults, searchService } from "../services/searchService";

const STATUS_LABELS: Record<string, string> = {
  quoted: "Cotizado",
  confirmed: "Confirmado",
  completed: "Completado",
  cancelled: "Cancelado",
};

const formatEventDate = (value: string) => {
  try {
    return format(parseISO(value), "d MMM yyyy", { locale: es });
  } catch {
    return value;
  }
};

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim();
  const [results, setResults] = useState<SearchResults>({
    client: [],
    event: [],
    product: [],
    inventory: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const runSearch = async () => {
      if (!query) {
        setResults({ client: [], event: [], product: [], inventory: [] });
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await searchService.searchAll(query);
        if (isMounted) setResults(data);
      } catch (err) {
        logError("Error running global search", err);
        if (isMounted) {
          setError("No pudimos completar la búsqueda. Intenta de nuevo.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    runSearch();

    return () => {
      isMounted = false;
    };
  }, [query]);

  const totalResults = useMemo(() => {
    return (
      (results.client?.length || 0) +
      (results.event?.length || 0) +
      (results.product?.length || 0) +
      (results.inventory?.length || 0)
    );
  }, [results]);

  if (!query) {
    return (
      <Empty
        icon={SearchIcon}
        title="Busca en toda tu operación"
        description="Escribe un término en la barra superior para encontrar clientes, eventos, productos e inventario."
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
        <span className="sr-only">Buscando resultados...</span>
        Buscando resultados...
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
        title="Sin resultados"
        description={`No encontramos coincidencias para "${query}".`}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Resultados</h1>
          <p className="text-sm text-text-secondary">
            {totalResults} resultado{totalResults === 1 ? "" : "s"} para "
            {query}"
          </p>
        </div>
        <div className="flex items-center text-sm text-text-secondary">
          <SearchIcon className="h-4 w-4 mr-2" aria-hidden="true" />
          Búsqueda global
        </div>
      </div>

      {results.client.length > 0 && (
        <section className="bg-card rounded-lg shadow-xs border border-border overflow-hidden mt-6">
          <div className="px-4 py-3 border-b border-border bg-surface-alt flex items-center justify-between">
            <h2 className="font-semibold text-text flex items-center">
              <Users className="h-4 w-4 mr-2 text-info" aria-hidden="true" />
              Clientes ({results.client.length})
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {results.client.map((client) => (
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

      {results.event.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">Eventos</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {results.event.map((event) => (
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
                  {event.meta ? formatEventDate(event.meta) : ""}
                  {event.meta && event.status ? " - " : ""}
                  {event.status ? STATUS_LABELS[event.status] : ""}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.product.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">Productos</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {results.product.map((product) => (
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

      {results.inventory.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-text">Inventario</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {results.inventory.map((item) => (
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
