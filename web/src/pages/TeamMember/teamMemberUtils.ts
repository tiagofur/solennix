import type { TFunction } from 'i18next';
import type { TeamMemberAssignment } from '@/types/entities';

export type TeamStatusFilter = 'all' | 'pending' | 'confirmed' | 'declined' | 'cancelled';

export const filterAssignments = (
  assignments: TeamMemberAssignment[],
  statusFilter: TeamStatusFilter,
  searchTerm: string,
  fromDate?: string,
  toDate?: string,
): TeamMemberAssignment[] => {
  const term = searchTerm.trim().toLowerCase();

  return assignments.filter((assignment) => {
    if (statusFilter !== 'all' && assignment.status !== statusFilter) return false;
    if (fromDate && assignment.event_date < fromDate) return false;
    if (toDate && assignment.event_date > toDate) return false;
    if (term && !assignment.event_name.toLowerCase().includes(term)) return false;
    return true;
  });
};

export const formatEventDate = (value: string, locale: string) => {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatShiftLabel = (
  assignment: TeamMemberAssignment,
  locale: string,
  t: TFunction,
) => {
  const toTime = (iso?: string | null) => {
    if (!iso) return null;
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  const start = toTime(assignment.shift_start);
  const end = toTime(assignment.shift_end);
  if (start && end) return `${start} - ${end}`;
  if (start) return t('team.shift_from', { defaultValue: `Desde ${start}`, time: start });
  if (end) return t('team.shift_to', { defaultValue: `Hasta ${end}`, time: end });
  return null;
};

export const teamStatusOptions: TeamStatusFilter[] = [
  'all',
  'pending',
  'confirmed',
  'declined',
  'cancelled',
];
