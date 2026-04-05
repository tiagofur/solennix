import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { logError } from '@/lib/errorHandler';
import { useToast } from '@/hooks/useToast';

const STALE_TIME = 2 * 60 * 1000; // 2 minutes
const GC_TIME = 10 * 60 * 1000; // 10 minutes

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      logError(`Query error [${String(query.queryKey)}]`, error);
      // Only toast for queries that already had data visible (background refetch failed)
      if (query.state.data !== undefined) {
        useToast.getState().addToast('Error al actualizar los datos. Intenta recargar la página.', 'error');
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const key = mutation.options.mutationKey
        ? String(mutation.options.mutationKey)
        : 'unknown';
      logError(`Mutation error [${key}]`, error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME,
      gcTime: GC_TIME,
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
});
