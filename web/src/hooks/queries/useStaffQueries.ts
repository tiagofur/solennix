import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { staffService } from '@/services/staffService';
import { queryKeys } from './queryKeys';
import { useToast } from '@/hooks/useToast';
import { logError, getErrorMessage } from '@/lib/errorHandler';
import type { PaginationParams, StaffInsert, StaffUpdate } from '@/types/entities';

// ── Queries ──

export function useStaff() {
  return useQuery({
    queryKey: queryKeys.staff.all,
    queryFn: () => staffService.getAll(),
  });
}

export function useStaffPaginated(params: PaginationParams) {
  return useQuery({
    queryKey: queryKeys.staff.paginated(params.page, params.limit, params.sort, params.order),
    queryFn: () => staffService.getPage(params),
    placeholderData: keepPreviousData,
  });
}

export function useStaffMember(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.staff.detail(id!),
    queryFn: () => staffService.getById(id!),
    enabled: !!id,
  });
}

export function useEventStaff(eventId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.events.staff(eventId!),
    queryFn: () => staffService.getByEvent(eventId!),
    enabled: !!eventId,
  });
}

// ── Mutations ──

export function useCreateStaff() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['staff', 'create'],
    mutationFn: (data: StaffInsert) => staffService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
    },
    onError: (error) => {
      logError('Error creating staff', error);
      addToast(getErrorMessage(error, 'Error al crear el colaborador.'), 'error');
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['staff', 'update'],
    mutationFn: ({ id, data }: { id: string; data: StaffUpdate }) =>
      staffService.update(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.detail(id) });
    },
    onError: (error) => {
      logError('Error updating staff', error);
      addToast(getErrorMessage(error, 'Error al actualizar el colaborador.'), 'error');
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['staff', 'delete'],
    mutationFn: (id: string) => staffService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
      addToast('Colaborador eliminado correctamente.', 'success');
    },
    onError: (error) => {
      logError('Error deleting staff', error);
      addToast(getErrorMessage(error, 'Error al eliminar el colaborador.'), 'error');
    },
  });
}
