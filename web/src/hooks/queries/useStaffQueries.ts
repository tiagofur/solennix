import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { staffService } from '@/services/staffService';
import { queryKeys } from './queryKeys';
import { useToast } from '@/hooks/useToast';
import { logError, getErrorMessage } from '@/lib/errorHandler';
import type {
  AssignmentPortalResponse,
  AssignmentExecutionState,
  PaginationParams,
  StaffInsert,
  StaffTeamInsert,
  StaffTeamUpdate,
  StaffUpdate,
} from '@/types/entities';
import { useTranslation } from 'react-i18next';

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

export function useMyAssignments() {
  return useQuery({
    queryKey: queryKeys.staff.myAssignments,
    queryFn: () => staffService.getMyAssignments(),
    refetchInterval: 30 * 1000,
  });
}

export function useMyTimeline(unreadOnly = false, limit = 50) {
  return useQuery({
    queryKey: queryKeys.staff.myTimeline(unreadOnly, limit),
    queryFn: () => staffService.getMyTimeline({ unreadOnly, limit }),
    refetchInterval: 30 * 1000,
  });
}

export function useMarkMyTimelineRead() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('staff');

  return useMutation({
    mutationKey: ['staff', 'timeline', 'mark-read'],
    mutationFn: (ids?: string[]) => staffService.markMyTimelineRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', 'my-timeline'] });
    },
    onError: (error) => {
      logError('Error marking timeline as read', error);
      addToast(getErrorMessage(error, t('list.error_mark_read')), 'error');
    },
  });
}

export function useRespondAssignment() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('staff');

  return useMutation({
    mutationKey: ['staff', 'respond-assignment'],
    mutationFn: ({ id, response }: { id: string; response: AssignmentPortalResponse }) =>
      staffService.respondAssignment(id, response),
    onSuccess: (_result, { response }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.myAssignments });
      queryClient.invalidateQueries({ queryKey: ['staff', 'my-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['staff', 'availability'] });
      addToast(response === 'accept' ? t('form.messages.accepted', { defaultValue: 'Asignación aceptada.' }) : t('form.messages.declined', { defaultValue: 'Asignación rechazada.' }), 'success');
    },
    onError: (error) => {
      logError('Error responding assignment', error);
      addToast(getErrorMessage(error, t('list.error_respond_assignment')), 'error');
    },
  })
}

// ── Execution state (team-member portal, #875) ──
// Previously device-only localStorage; now server-backed so state survives
// device changes. Optimistic update keeps the checkbox snappy.

const defaultExecutionState: AssignmentExecutionState = {
  checklist: { arrival: false, materials: false, closing: false },
  quick_note: '',
};

export function useExecutionState(eventStaffId: string | null | undefined) {
  return useQuery({
    queryKey: eventStaffId ? queryKeys.staff.executionState(eventStaffId) : ['staff', 'execution-state', 'none'],
    queryFn: () => staffService.getExecutionState(eventStaffId!),
    enabled: !!eventStaffId,
    staleTime: 0,
  });
}

export function useSaveExecutionState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['staff', 'save-execution-state'],
    mutationFn: ({ eventStaffId, state }: { eventStaffId: string; state: AssignmentExecutionState }) =>
      staffService.putExecutionState(eventStaffId, state),
    onMutate: async ({ eventStaffId, state }) => {
      const key = queryKeys.staff.executionState(eventStaffId);
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<AssignmentExecutionState>(key);
      queryClient.setQueryData<AssignmentExecutionState>(key, state);
      return { prev };
    },
    onError: (_err, { eventStaffId }, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(queryKeys.staff.executionState(eventStaffId), ctx.prev);
      }
    },
    onSettled: (_data, _err, { eventStaffId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.executionState(eventStaffId) });
    },
  })
}

export { defaultExecutionState };


// ── Mutations ──

export function useCreateStaff() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('staff');

  return useMutation({
    mutationKey: ['staff', 'create'],
    mutationFn: (data: StaffInsert) => staffService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
    },
    onError: (error) => {
      logError('Error creating staff', error);
      addToast(getErrorMessage(error, t('list.error_create')), 'error');
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('staff');

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
      addToast(getErrorMessage(error, t('list.error_update')), 'error');
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('staff');

  return useMutation({
    mutationKey: ['staff', 'delete'],
    mutationFn: (id: string) => staffService.delete(id) || staffService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.all });
      addToast(t('list.success_delete'), 'success');
    },
    onError: (error) => {
      logError('Error deleting staff', error);
      addToast(getErrorMessage(error, t('list.error_delete')), 'error');
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
  const { t } = useTranslation('staff');

  return useMutation({
    mutationKey: ['staff', 'teams', 'create'],
    mutationFn: (data: StaffTeamInsert) => staffService.createTeam(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.teams });
    },
    onError: (error) => {
      logError('Error creating staff team', error);
      addToast(getErrorMessage(error, t('teams.list.error_create')), 'error');
    },
  });
}

export function useUpdateStaffTeam() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('staff');

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
      addToast(getErrorMessage(error, t('teams.list.error_update')), 'error');
    },
  });
}

export function useDeleteStaffTeam() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('staff');

  return useMutation({
    mutationKey: ['staff', 'teams', 'delete'],
    mutationFn: (id: string) => staffService.deleteTeam(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staff.teams });
      addToast(t('teams.list.success_delete'), 'success');
    },
    onError: (error) => {
      logError('Error deleting staff team', error);
      addToast(getErrorMessage(error, t('teams.list.error_delete')), 'error');
    },
  });
}
