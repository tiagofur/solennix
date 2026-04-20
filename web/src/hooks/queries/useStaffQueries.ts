import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { staffService } from '@/services/staffService';
import { queryKeys } from './queryKeys';
import { useToast } from '@/hooks/useToast';
import { logError, getErrorMessage } from '@/lib/errorHandler';
import type {
  PaginationParams,
  StaffInsert,
  StaffTeamInsert,
  StaffTeamUpdate,
  StaffUpdate,
} from '@/types/entities';

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

// Staff availability for a single date — used inside EventStaff picker to
// badge collaborators already booked that day. Skips when date is falsy.
export function useStaffAvailability(date: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.staff.availability(date ?? ''),
    queryFn: () => staffService.getAvailability({ date: date! }),
    enabled: !!date,
    staleTime: 30 * 1000,
  });
}

// Range variant — used in StaffDetails "Próximas asignaciones". Only enabled
// when both bounds are provided.
export function useStaffAvailabilityRange(start: string | null | undefined, end: string | null | undefined) {
  return useQuery({
    queryKey: ['staff', 'availability', 'range', start ?? '', end ?? ''] as const,
    queryFn: () => staffService.getAvailability({ start: start!, end: end! }),
    enabled: !!start && !!end,
    staleTime: 30 * 1000,
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

// ── Staff Teams (Ola 2) ──

export function useStaffTeams() {
  return useQuery({
    queryKey: queryKeys.staff.teams,
    queryFn: () => staffService.listTeams(),
  });
}

export function useStaffTeam(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.staff.team(id!),
    queryFn: () => staffService.getTeam(id!),
    enabled: !!id,
  });
}

export function useCreateStaffTeam() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['staff', 'teams', 'create'],
    mutationFn: (data: StaffTeamInsert) => staffService.createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.teams });
    },
    onError: (error) => {
      logError('Error creating staff team', error);
      addToast(getErrorMessage(error, 'Error al crear el equipo.'), 'error');
    },
  });
}

export function useUpdateStaffTeam() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['staff', 'teams', 'update'],
    mutationFn: ({ id, data }: { id: string; data: StaffTeamUpdate }) =>
      staffService.updateTeam(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.teams });
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.team(id) });
    },
    onError: (error) => {
      logError('Error updating staff team', error);
      addToast(getErrorMessage(error, 'Error al actualizar el equipo.'), 'error');
    },
  });
}

export function useDeleteStaffTeam() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['staff', 'teams', 'delete'],
    mutationFn: (id: string) => staffService.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.teams });
      addToast('Equipo eliminado correctamente.', 'success');
    },
    onError: (error) => {
      logError('Error deleting staff team', error);
      addToast(getErrorMessage(error, 'Error al eliminar el equipo.'), 'error');
    },
  });
}
