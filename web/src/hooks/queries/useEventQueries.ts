import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { queryKeys } from './queryKeys';
import { useToast } from '@/hooks/useToast';
import { logError, getErrorMessage } from '@/lib/errorHandler';
import type { EventInsert, EventUpdate } from '@/types/entities';
import type { EventStatus } from '@/components/StatusDropdown';

// ── Queries ──

export function useEvents() {
  return useQuery({
    queryKey: queryKeys.events.all,
    queryFn: () => eventService.getAll(),
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.detail(id!),
    queryFn: () => eventService.getById(id!),
    enabled: !!id,
  });
}

export function useEventsByClient(clientId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.byClient(clientId!),
    queryFn: () => eventService.getByClientId(clientId!),
    enabled: !!clientId,
  });
}

export function useUpcomingEvents(limit = 5) {
  return useQuery({
    queryKey: queryKeys.events.upcoming(limit),
    queryFn: () => eventService.getUpcoming(limit),
  });
}

export function useEventsByDateRange(start: string, end: string) {
  return useQuery({
    queryKey: queryKeys.events.dateRange(start, end),
    queryFn: () => eventService.getByDateRange(start, end),
    enabled: !!start && !!end,
  });
}

export function useEventProducts(eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.products(eventId!),
    queryFn: () => eventService.getProducts(eventId!),
    enabled: !!eventId,
  });
}

export function useEventExtras(eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.extras(eventId!),
    queryFn: () => eventService.getExtras(eventId!),
    enabled: !!eventId,
  });
}

export function useEventEquipment(eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.equipment(eventId!),
    queryFn: () => eventService.getEquipment(eventId!),
    enabled: !!eventId,
  });
}

export function useEventSupplies(eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.supplies(eventId!),
    queryFn: () => eventService.getSupplies(eventId!),
    enabled: !!eventId,
  });
}

// ── Mutations ──

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['events', 'create'],
    mutationFn: (data: EventInsert) => eventService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.planLimits });
    },
    onError: (error) => {
      logError('Error creating event', error);
      addToast(getErrorMessage(error, 'Error al crear el evento.'), 'error');
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['events', 'update'],
    mutationFn: ({ id, data }: { id: string; data: EventUpdate }) =>
      eventService.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(id) });
    },
    onError: (error) => {
      logError('Error updating event', error);
    },
  });
}

export function useUpdateEventStatus() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['events', 'updateStatus'],
    mutationFn: ({ id, status }: { id: string; status: EventStatus }) =>
      eventService.update(id, { status }),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.upcoming(5) });
    },
    onError: (error) => {
      logError('Error updating event status', error);
      addToast('Error al actualizar el estado del evento.', 'error');
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['events', 'delete'],
    mutationFn: (id: string) => eventService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.planLimits });
      addToast('Evento eliminado correctamente.', 'success');
    },
    onError: (error) => {
      logError('Error deleting event', error);
      addToast(getErrorMessage(error, 'Error al eliminar el evento.'), 'error');
    },
  });
}
