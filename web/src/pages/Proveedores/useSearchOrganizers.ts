import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  organizersDirectoryService,
  type DirectoryFilters,
  type DirectorySearchResult,
} from "@/services/organizersDirectoryService";

/**
 * React Query hook for the directory search (#1117, design D2).
 * Uses keepPreviousData so the grid stays visible while the next page/filter
 * loads — avoids layout shift and flashes of empty state.
 */
export function useSearchOrganizers(filters: DirectoryFilters) {
  return useQuery<DirectorySearchResult>({
    queryKey: ["directory", filters],
    queryFn: ({ signal }) => organizersDirectoryService.search(filters, signal),
    placeholderData: keepPreviousData,
    staleTime: 60_000, // 1 min — directory data changes little
  });
}
