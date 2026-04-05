import { useQuery } from '@tanstack/react-query';
import { searchService } from '@/services/searchService';
import { queryKeys } from './queryKeys';

export function useSearch(query: string) {
  return useQuery({
    queryKey: queryKeys.search.results(query),
    queryFn: () => searchService.searchAll(query),
    enabled: query.trim().length > 0,
    staleTime: 30 * 1000, // Search results go stale faster
    placeholderData: (prev) => prev, // Keep previous results while typing
  });
}
