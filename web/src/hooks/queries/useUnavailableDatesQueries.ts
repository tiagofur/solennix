import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unavailableDatesService, type UnavailableDateInput } from '../../services/unavailableDatesService';
import { queryKeys } from './queryKeys';
import { useToast } from '@/hooks/useToast';
import { logError } from '@/lib/errorHandler';
import { useTranslation } from 'react-i18next';

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
    mutationFn: (data: UnavailableDateInput) =>
      unavailableDatesService.addDates(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.unavailableDates.all });
    },
  });
}

export function useUpdateUnavailableDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UnavailableDateInput }) =>
      unavailableDatesService.updateDate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.unavailableDates.all });
    },
  });
}

export function useDeleteUnavailableDate() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('calendar');

  return useMutation({
    mutationFn: (id: string) => unavailableDatesService.removeDate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.unavailableDates.all });
    },
    onError: (error) => {
      logError('Error deleting unavailable date', error);
      addToast(t('error.unblock_failed', 'No se pudo eliminar la fecha. Intenta de nuevo.'), 'error');
    },
  });
}
