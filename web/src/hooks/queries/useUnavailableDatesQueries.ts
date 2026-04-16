import { useQuery } from '@tanstack/react-query';
import { unavailableDatesService } from '../../services/unavailableDatesService';
import { queryKeys } from './queryKeys';

/**
 * Fetches unavailable date ranges for a given date window via React Query.
 * Cached and deduped across consumers so month navigation on the Calendar
 * does not re-fire network requests for the same window.
 */
export function useUnavailableDatesByRange(start: string, end: string) {
  return useQuery({
    queryKey: queryKeys.unavailableDates.byRange(start, end),
    queryFn: () => unavailableDatesService.getDates(start, end),
    enabled: !!start && !!end,
  });
}
