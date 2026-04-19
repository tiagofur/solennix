import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '@/services/paymentService';
import { queryKeys } from './queryKeys';
import { useToast } from '@/hooks/useToast';
import { logError, getErrorMessage } from '@/lib/errorHandler';
import type { PaymentInsert } from '@/types/entities';

// ── Queries ──

export function usePaymentsByEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.payments.byEvent(eventId!),
    queryFn: () => paymentService.getByEventId(eventId!),
    enabled: !!eventId,
  });
}

export function usePaymentsByEventIds(eventIds: string[]) {
  return useQuery({
    queryKey: queryKeys.payments.byEventIds(eventIds),
    queryFn: () => paymentService.getByEventIds(eventIds),
    enabled: eventIds.length > 0,
  });
}

export function usePaymentsByDateRange(start: string, end: string) {
  return useQuery({
    queryKey: queryKeys.payments.byDateRange(start, end),
    queryFn: () => paymentService.getByPaymentDateRange(start, end),
    enabled: !!start && !!end,
  });
}

// ── Mutations ──

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['payments', 'create'],
    mutationFn: (data: PaymentInsert) =>
      paymentService.create(data),
    onSuccess: (_result, { event_id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.byEvent(event_id) });
      // Prefix invalidation reaches every active usePaymentsByEventIds
      // query regardless of its specific id list. TanStack Query v5
      // invalidateQueries matches partial keys from the start by default.
      // Required because the dashboard's saldo pendiente reads from this
      // aggregated cache and per-event invalidation alone leaves it stale.
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.byEventIdsPrefix });
      addToast('Pago registrado correctamente.', 'success');
    },
    onError: (error) => {
      logError('Error creating payment', error);
      addToast(getErrorMessage(error, 'Error al registrar el pago.'), 'error');
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['payments', 'delete'],
    mutationFn: ({ id, eventId }: { id: string; eventId: string }) =>
      paymentService.delete(id),
    onSuccess: (_result, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.byEvent(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.byEventIdsPrefix });
      addToast('Pago eliminado correctamente.', 'success');
    },
    onError: (error) => {
      logError('Error deleting payment', error);
      addToast(getErrorMessage(error, 'Error al eliminar el pago.'), 'error');
    },
  });
}
