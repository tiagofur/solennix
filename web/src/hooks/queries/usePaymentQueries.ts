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
    queryKey: ['payments', 'byEventIds', ...eventIds.sort()] as const,
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
      addToast('Pago eliminado correctamente.', 'success');
    },
    onError: (error) => {
      logError('Error deleting payment', error);
      addToast(getErrorMessage(error, 'Error al eliminar el pago.'), 'error');
    },
  });
}
