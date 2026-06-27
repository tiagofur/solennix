import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockGetAll = vi.fn();
const mockGetPage = vi.fn();
const mockGetById = vi.fn();
const mockGetByEvent = vi.fn();
const mockGetAvailability = vi.fn();
const mockGetMyAssignments = vi.fn();
const mockRespondAssignment = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockListTeams = vi.fn();
const mockGetTeam = vi.fn();
const mockCreateTeam = vi.fn();
const mockUpdateTeam = vi.fn();
const mockDeleteTeam = vi.fn();

const mockAddToast = vi.fn();
const mockLogError = vi.fn();

vi.mock('@/services/staffService', () => ({
  staffService: {
    getAll: (...args: unknown[]) => mockGetAll(...args),
    getPage: (...args: unknown[]) => mockGetPage(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    getByEvent: (...args: unknown[]) => mockGetByEvent(...args),
    getAvailability: (...args: unknown[]) => mockGetAvailability(...args),
    getMyAssignments: (...args: unknown[]) => mockGetMyAssignments(...args),
    respondAssignment: (...args: unknown[]) => mockRespondAssignment(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    listTeams: (...args: unknown[]) => mockListTeams(...args),
    getTeam: (...args: unknown[]) => mockGetTeam(...args),
    createTeam: (...args: unknown[]) => mockCreateTeam(...args),
    updateTeam: (...args: unknown[]) => mockUpdateTeam(...args),
    deleteTeam: (...args: unknown[]) => mockDeleteTeam(...args),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/lib/errorHandler', () => ({
  logError: (...args: unknown[]) => mockLogError(...args),
  getErrorMessage: (_err: unknown, fallback: string) => fallback,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

import {
  useStaff,
  useStaffPaginated,
  useStaffMember,
  useEventStaff,
  useStaffAvailability,
  useStaffAvailabilityRange,
  useMyAssignments,
  useRespondAssignment,
  useCreateStaff,
  useUpdateStaff,
  useDeleteStaff,
  useStaffTeams,
  useStaffTeam,
  useCreateStaffTeam,
  useUpdateStaffTeam,
  useDeleteStaffTeam,
} from './useStaffQueries';

const createWrapper = () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useStaffQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches staff list and paginated list', async () => {
    mockGetAll.mockResolvedValue([{ id: 'staff-1' }]);
    mockGetPage.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, total_pages: 0 });

    const all = renderHook(() => useStaff(), { wrapper: createWrapper() });
    const paginated = renderHook(
      () => useStaffPaginated({ page: 1, limit: 10, sort: 'name', order: 'asc' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(all.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(paginated.result.current.isSuccess).toBe(true));

    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(mockGetPage).toHaveBeenCalledWith({ page: 1, limit: 10, sort: 'name', order: 'asc' });
  });

  it('enables member and event staff queries only with ids', async () => {
    mockGetById.mockResolvedValue({ id: 'staff-1' });
    mockGetByEvent.mockResolvedValue([]);

    const idleMember = renderHook(() => useStaffMember(undefined), { wrapper: createWrapper() });
    const idleEventStaff = renderHook(() => useEventStaff(undefined), { wrapper: createWrapper() });

    expect(idleMember.result.current.fetchStatus).toBe('idle');
    expect(idleEventStaff.result.current.fetchStatus).toBe('idle');

    const activeMember = renderHook(() => useStaffMember('staff-1'), { wrapper: createWrapper() });
    const activeEventStaff = renderHook(() => useEventStaff('event-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(activeMember.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(activeEventStaff.result.current.isSuccess).toBe(true));

    expect(mockGetById).toHaveBeenCalledWith('staff-1');
    expect(mockGetByEvent).toHaveBeenCalledWith('event-1');
  });

  it('enables availability queries only with complete date filters', async () => {
    mockGetAvailability.mockResolvedValue([]);

    const singleIdle = renderHook(() => useStaffAvailability(null), { wrapper: createWrapper() });
    const rangeIdle = renderHook(() => useStaffAvailabilityRange('2026-06-01', null), { wrapper: createWrapper() });

    expect(singleIdle.result.current.fetchStatus).toBe('idle');
    expect(rangeIdle.result.current.fetchStatus).toBe('idle');

    const singleActive = renderHook(() => useStaffAvailability('2026-06-01'), { wrapper: createWrapper() });
    const rangeActive = renderHook(
      () => useStaffAvailabilityRange('2026-06-01', '2026-06-30'),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(singleActive.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(rangeActive.result.current.isSuccess).toBe(true));

    expect(mockGetAvailability).toHaveBeenCalledWith({ date: '2026-06-01' });
    expect(mockGetAvailability).toHaveBeenCalledWith({ start: '2026-06-01', end: '2026-06-30' });
  });

  it('fetches my assignments', async () => {
    mockGetMyAssignments.mockResolvedValue([]);

    const { result } = renderHook(() => useMyAssignments(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetMyAssignments).toHaveBeenCalledTimes(1);
  });

  it('respond assignment mutation shows accepted toast on success and invalidates queries', async () => {
    const invalidateSpy = vi.spyOn(QueryClient.prototype, 'invalidateQueries');
    mockRespondAssignment.mockResolvedValue({ final_status: 'confirmed' });

    const { result } = renderHook(() => useRespondAssignment(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: 'assign-1', response: 'accept' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRespondAssignment).toHaveBeenCalledWith('assign-1', 'accept');
    expect(mockAddToast).toHaveBeenCalledWith('Asignación aceptada.', 'success');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['staff', 'my-assignments'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['staff', 'my-timeline'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['staff', 'availability'] });
    invalidateSpy.mockRestore();
  });

  it('respond assignment mutation logs and toasts on error', async () => {
    mockRespondAssignment.mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useRespondAssignment(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: 'assign-1', response: 'decline' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockLogError).toHaveBeenCalledWith('Error responding assignment', expect.any(Error));
    expect(mockAddToast).toHaveBeenCalledWith('list.error_respond_assignment', 'error');
  });

  it('create/update/delete staff mutations call service', async () => {
    mockCreate.mockResolvedValue({ id: 'staff-1' });
    mockUpdate.mockResolvedValue({ id: 'staff-1' });
    mockDelete.mockResolvedValue(undefined);

    const createHook = renderHook(() => useCreateStaff(), { wrapper: createWrapper() });
    const updateHook = renderHook(() => useUpdateStaff(), { wrapper: createWrapper() });
    const deleteHook = renderHook(() => useDeleteStaff(), { wrapper: createWrapper() });

    await act(async () => {
      createHook.result.current.mutate({ name: 'A', notification_email_opt_in: false } as any);
      updateHook.result.current.mutate({ id: 'staff-1', data: { name: 'B' } as any });
      deleteHook.result.current.mutate('staff-1');
    });

    await waitFor(() => expect(createHook.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(updateHook.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(deleteHook.result.current.isSuccess).toBe(true));

    expect(mockCreate).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith('staff-1', { name: 'B' });
    expect(mockDelete).toHaveBeenCalledWith('staff-1');
    expect(mockAddToast).toHaveBeenCalledWith('list.success_delete', 'success');
  });

  it('staff team queries and mutations call service', async () => {
    mockListTeams.mockResolvedValue([]);
    mockGetTeam.mockResolvedValue({ id: 'team-1', name: 'Foto' });
    mockCreateTeam.mockResolvedValue({ id: 'team-1' });
    mockUpdateTeam.mockResolvedValue({ id: 'team-1' });
    mockDeleteTeam.mockResolvedValue(undefined);

    const teamsHook = renderHook(() => useStaffTeams(), { wrapper: createWrapper() });
    const teamHook = renderHook(() => useStaffTeam('team-1'), { wrapper: createWrapper() });
    const createTeamHook = renderHook(() => useCreateStaffTeam(), { wrapper: createWrapper() });
    const updateTeamHook = renderHook(() => useUpdateStaffTeam(), { wrapper: createWrapper() });
    const deleteTeamHook = renderHook(() => useDeleteStaffTeam(), { wrapper: createWrapper() });

    await waitFor(() => expect(teamsHook.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(teamHook.result.current.isSuccess).toBe(true));

    await act(async () => {
      createTeamHook.result.current.mutate({ name: 'Foto' });
      updateTeamHook.result.current.mutate({ id: 'team-1', data: { notes: 'updated' } });
      deleteTeamHook.result.current.mutate('team-1');
    });

    await waitFor(() => expect(createTeamHook.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(updateTeamHook.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(deleteTeamHook.result.current.isSuccess).toBe(true));

    expect(mockListTeams).toHaveBeenCalledTimes(1);
    expect(mockGetTeam).toHaveBeenCalledWith('team-1');
    expect(mockCreateTeam).toHaveBeenCalledWith({ name: 'Foto' });
    expect(mockUpdateTeam).toHaveBeenCalledWith('team-1', { notes: 'updated' });
    expect(mockDeleteTeam).toHaveBeenCalledWith('team-1');
    expect(mockAddToast).toHaveBeenCalledWith('teams.list.success_delete', 'success');
  });

  it('staff team detail stays idle when id is undefined', () => {
    const { result } = renderHook(() => useStaffTeam(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
  });
});
