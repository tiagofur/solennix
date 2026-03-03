import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Users, ChevronRight, Loader2, SearchX } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Empty from '../components/Empty';
import { logError } from '../lib/errorHandler';
import { SearchResults, searchService } from '../services/searchService';

const STATUS_LABELS: Record<string, string> = {
  quoted: 'Cotizado',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
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
  const query = (searchParams.get('q') || '').trim();
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
        logError('Error running global search', err);
        if (isMounted) {
          setError('No pudimos completar la búsqueda. Intenta de nuevo.');
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
      <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-300" role="status" aria-live="polite">
        <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
        <span className="sr-only">Buscando resultados...</span>
        Buscando resultados...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-sm text-red-700 dark:text-red-200" role="alert">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Resultados</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totalResults} resultado{totalResults === 1 ? '' : 's'} para "{query}"
          </p>
        </div>
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <SearchIcon className="h-4 w-4 mr-2" aria-hidden="true" />
          Búsqueda global
        </div>
      </div>

      {results.client.length > 0 && (
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow-xs border border-gray-200 dark:border-gray-700 overflow-hidden mt-6">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <Users className="h-4 w-4 mr-2 text-blue-500" aria-hidden="true" />
              Clientes ({results.client.length})
            </h2>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {results.client.map((client) => (
              <li key={client.id}>
                <Link
                  to={client.href}
                  className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white group-hover:text-brand-orange transition-colors">
                        {client.title}
                      </p>
                      {client.subtitle && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {client.subtitle}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-brand-orange transition-colors" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {results.event.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Eventos</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {results.event.map((event) => (
              <Link
                key={event.id}
                to={event.href}
                className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-xs hover:shadow-md transition"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-brand-orange">
                  {event.title}
                </p>
                {event.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{event.subtitle}</p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-400">
                  {event.meta ? formatEventDate(event.meta) : ''}
                  {event.meta && event.status ? ' - ' : ''}
                  {event.status ? STATUS_LABELS[event.status] : ''}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.product.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Productos</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {results.product.map((product) => (
              <Link
                key={product.id}
                to={product.href}
                className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-xs hover:shadow-md transition"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-brand-orange">
                  {product.title}
                </p>
                {product.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{product.subtitle}</p>
                )}
                {product.meta && (
                  <p className="text-xs text-gray-400 dark:text-gray-400">{product.meta}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {results.inventory.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Inventario</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {results.inventory.map((item) => (
              <Link
                key={item.id}
                to={item.href}
                className="group rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-xs hover:shadow-md transition"
              >
                <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-brand-orange">
                  {item.title}
                </p>
                {item.subtitle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</p>
                )}
                {item.meta && (
                  <p className="text-xs text-gray-400 dark:text-gray-400">{item.meta}</p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
