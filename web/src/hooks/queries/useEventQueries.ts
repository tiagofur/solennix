import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import type { EventPhotoCreateRequest, EventSearchFilters } from '@/services/eventService';
import { queryKeys } from './queryKeys';
import { useToast } from '@/hooks/useToast';
import { logError, getErrorMessage } from '@/lib/errorHandler';
import type { EventInsert, EventUpdate, PaginationParams } from '@/types/entities';
import type { EventStatus } from '@/components/StatusDropdown';

// ── Queries ──

export function useEvents() {
  return useQuery({
    queryKey: queryKeys.events.all,
    queryFn: () => eventService.getAll(),
  });
}

export function useEventsPaginated(params: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.events.paginated(params.page, params.limit, params.sort, params.order),
    queryFn: () => eventService.getPage(params),
    placeholderData: keepPreviousData,
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

/**
 * Advanced event search via the backend's `/api/events/search` FTS endpoint.
 * The query only runs when at least one filter is non-empty — otherwise the
 * backend rejects the request with 400 (it requires at least one filter).
 * Callers should fall back to the regular listing (useEventsPaginated) when
 * no filters are active.
 */
export function useEventSearch(filters: EventSearchFilters) {
  const hasAnyFilter = !!(filters.q || filters.status || filters.from || filters.to || filters.client_id);
  return useQuery({
    queryKey: queryKeys.events.search(filters as Record<string, string | undefined>),
    queryFn: () => eventService.searchAdvanced(filters),
    enabled: hasAnyFilter,
    placeholderData: keepPreviousData,
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

export function useEventPhotos(eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.photos(eventId!),
    queryFn: () => eventService.getEventPhotos(eventId!),
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

// ── Photo mutations ──

export function useAddEventPhoto(eventId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['events', eventId, 'photos', 'add'],
    mutationFn: (req: EventPhotoCreateRequest) => {
      if (!eventId) throw new Error('eventId is required');
      return eventService.addEventPhoto(eventId, req);
    },
    onSuccess: () => {
      if (!eventId) return;
      // Invalidate both the photos list and the event detail — the detail
      // still carries a `photos` JSON string that the backend keeps in sync.
      queryClient.invalidateQueries({ queryKey: queryKeys.events.photos(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
    },
    onError: (error) => {
      logError('Error uploading event photos', error);
    },
  });
}

export function useDeleteEventPhoto(eventId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['events', eventId, 'photos', 'delete'],
    mutationFn: (photoId: string) => {
      if (!eventId) throw new Error('eventId is required');
      return eventService.deleteEventPhoto(eventId, photoId);
    },
    onSuccess: () => {
      if (!eventId) return;
      queryClient.invalidateQueries({ queryKey: queryKeys.events.photos(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.events.detail(eventId) });
    },
    onError: (error) => {
      logError('Error removing photo', error);
    },
  });
}
