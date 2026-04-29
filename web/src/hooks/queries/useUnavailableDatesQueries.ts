import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export function useCreateUnavailableDates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { start_date: string; end_date: string; reason?: string }) =>
      unavailableDatesService.addDates(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.unavailableDates.all });
    },
  });
}

export function useDeleteUnavailableDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unavailableDatesService.removeDate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.unavailableDates.all });
    },
  });
}
