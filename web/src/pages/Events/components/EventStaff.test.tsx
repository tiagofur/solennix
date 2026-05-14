import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { EventStaff, type SelectedStaffAssignment } from './EventStaff';
import type { Staff, StaffAvailability, StaffTeam } from '@/types/entities';

const mockUseStaffAvailability = vi.fn();
const mockUseStaffTeams = vi.fn();
const mockGetTeam = vi.fn();

vi.mock('@/hooks/queries/useStaffQueries', () => ({
  useStaffAvailability: (...args: unknown[]) => mockUseStaffAvailability(...args),
  useStaffTeams: (...args: unknown[]) => mockUseStaffTeams(...args),
}));

vi.mock('@/services/staffService', () => ({
  staffService: {
    getTeam: (...args: unknown[]) => mockGetTeam(...args),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const staffCatalog: Staff[] = [
  {
    id: 'staff-1',
    user_id: 'owner-1',
    name: 'Ana',
    role_label: 'Fotografa',
    phone: null,
    email: null,
    notes: null,
    notification_email_opt_in: false,
    invited_user_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'staff-2',
    user_id: 'owner-1',
    name: 'Luis',
    role_label: null,
    phone: null,
    email: null,
    notes: null,
    notification_email_opt_in: false,
    invited_user_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'staff-3',
    user_id: 'owner-1',
    name: 'Marta',
    role_label: null,
    phone: null,
    email: null,
    notes: null,
    notification_email_opt_in: false,
    invited_user_id: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

const selectedStaff: SelectedStaffAssignment[] = [
  {
    staff_id: 'staff-1',
    fee_amount: 1200,
    role_override: 'Lead',
    notes: 'Llegar temprano',
    shift_start: null,
    shift_end: null,
    status: null,
  },
];

const baseProps = {
  staffCatalog,
  selectedStaff,
  eventDate: '2026-07-20',
  eventId: 'event-1',
  onAdd: vi.fn(),
  onRemove: vi.fn(),
  onChange: vi.fn(),
  onAddTeamMembers: vi.fn(),
};

function renderComponent(overrides: Partial<typeof baseProps> = {}) {
  const props = { ...baseProps, ...overrides };
  return render(
    <MemoryRouter>
      <EventStaff {...props} />
    </MemoryRouter>,
  );
}

describe('EventStaff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStaffAvailability.mockReturnValue({ data: [] });
    mockUseStaffTeams.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders empty catalog state with create link', () => {
    renderComponent({ staffCatalog: [] });

    expect(screen.getByText((content) => content.includes('events:staff.empty_catalog'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'common:actions.create_new' })).toHaveAttribute('href', '/staff/new');
    expect(screen.queryByRole('button', { name: 'events:staff.add' })).not.toBeInTheDocument();
  });

  it('calls onAdd and onRemove from action buttons', () => {
    const onAdd = vi.fn();
    const onRemove = vi.fn();

    renderComponent({ onAdd, onRemove });

    fireEvent.click(screen.getByRole('button', { name: 'events:staff.add' }));
    fireEvent.click(screen.getByRole('button', { name: 'events:staff.remove' }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('marks busy staff in options and shows busy badge for selected collaborator', () => {
    const availability: StaffAvailability[] = [
      {
        staff_id: 'staff-1',
        staff_name: 'Ana',
        assignments: [
          {
            event_id: 'event-2',
            event_name: 'Boda',
            event_date: '2026-07-20',
            status: 'confirmed',
            shift_start: null,
            shift_end: null,
          },
        ],
      },
      {
        staff_id: 'staff-3',
        staff_name: 'Marta',
        assignments: [
          {
            event_id: 'event-3',
            event_name: 'Quince',
            event_date: '2026-07-20',
            status: 'confirmed',
            shift_start: null,
            shift_end: null,
          },
        ],
      },
    ];
    mockUseStaffAvailability.mockReturnValue({ data: availability });

    renderComponent();

    const options = screen.getAllByRole('option');
    expect(options.some((opt) => opt.textContent?.includes('Marta') && opt.textContent.includes('events:staff.busy_day'))).toBe(true);
    expect(screen.getByText('events:staff.busy_day')).toBeInTheDocument();
  });

  it('does not mark selected staff as busy when assignment belongs to same event', () => {
    const availability: StaffAvailability[] = [
      {
        staff_id: 'staff-1',
        staff_name: 'Ana',
        assignments: [
          {
            event_id: 'event-1',
            event_name: 'Mismo evento',
            event_date: '2026-07-20',
            status: 'confirmed',
            shift_start: null,
            shift_end: null,
          },
        ],
      },
    ];
    mockUseStaffAvailability.mockReturnValue({ data: availability });

    renderComponent();

    expect(screen.queryByText('events:staff.busy_day')).not.toBeInTheDocument();
  });

  it('opens shift controls and sends value update for time field', () => {
    const onChange = vi.fn();
    renderComponent({ onChange });

    fireEvent.click(screen.getByRole('button', { name: 'events:staff.add_shift' }));

    const timeInputs = screen.getAllByDisplayValue('');
    const shiftStartInput = timeInputs.find((input) => (input as HTMLInputElement).type === 'time') as HTMLInputElement;
    fireEvent.change(shiftStartInput, { target: { value: '09:30' } });

    expect(onChange).toHaveBeenCalledWith(0, 'shift_start', '09:30');
  });

  it('sends null update when clearing existing shift start', () => {
    const onChange = vi.fn();
    renderComponent({
      onChange,
      selectedStaff: [
        {
          ...selectedStaff[0],
          shift_start: '09:30',
        },
      ],
    });

    const shiftStartInput = screen.getByDisplayValue('09:30') as HTMLInputElement;
    fireEvent.change(shiftStartInput, { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(0, 'shift_start', null);
  });

  it('shows team picker empty state and closes when opening create link', () => {
    const onAddTeamMembers = vi.fn();
    mockUseStaffTeams.mockReturnValue({ data: [], isLoading: false });

    renderComponent({ onAddTeamMembers });

    fireEvent.click(screen.getByRole('button', { name: 'events:staff.add_team' }));
    expect(screen.getByText('events:staff.no_teams')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'common:actions.create_new' }));
    expect(screen.queryByText('events:staff.no_teams')).not.toBeInTheDocument();
  });

  it('shows loading state in team picker', () => {
    const onAddTeamMembers = vi.fn();
    mockUseStaffTeams.mockReturnValue({ data: [], isLoading: true });

    renderComponent({ onAddTeamMembers });

    fireEvent.click(screen.getByRole('button', { name: 'events:staff.add_team' }));
    expect(screen.getByText('common:loading…')).toBeInTheDocument();
  });

  it('adds non-duplicate team members with proper role fallback and closes modal', async () => {
    const onAddTeamMembers = vi.fn();
    const teams: StaffTeam[] = [
      {
        id: 'team-1',
        user_id: 'owner-1',
        name: 'Equipo Foto',
        role_label: 'Cobertura',
        notes: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        member_count: 3,
      },
    ];
    mockUseStaffTeams.mockReturnValue({ data: teams, isLoading: false });
    mockGetTeam.mockResolvedValue({
      id: 'team-1',
      user_id: 'owner-1',
      name: 'Equipo Foto',
      role_label: 'Cobertura',
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      members: [
        { team_id: 'team-1', staff_id: 'staff-1', is_lead: true, position: 2, created_at: '2026-01-01T00:00:00Z' },
        { team_id: 'team-1', staff_id: 'staff-2', is_lead: false, position: 1, created_at: '2026-01-01T00:00:00Z' },
        { team_id: 'team-1', staff_id: 'staff-3', is_lead: false, position: 3, created_at: '2026-01-01T00:00:00Z' },
      ],
    });

    renderComponent({ onAddTeamMembers });

    fireEvent.click(screen.getByRole('button', { name: 'events:staff.add_team' }));
    fireEvent.click(screen.getByRole('button', { name: /Equipo Foto/ }));

    await waitFor(() => {
      expect(mockGetTeam).toHaveBeenCalledWith('team-1');
    });

    expect(onAddTeamMembers).toHaveBeenCalledWith([
      {
        staff_id: 'staff-2',
        fee_amount: null,
        role_override: 'Cobertura',
        notes: '',
        shift_start: null,
        shift_end: null,
        status: null,
      },
      {
        staff_id: 'staff-3',
        fee_amount: null,
        role_override: 'Cobertura',
        notes: '',
        shift_start: null,
        shift_end: null,
        status: null,
      },
    ]);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Equipo Foto/ })).not.toBeInTheDocument();
    });
  });

  it('closes team picker when team load fails', async () => {
    const onAddTeamMembers = vi.fn();
    const teams: StaffTeam[] = [
      {
        id: 'team-1',
        user_id: 'owner-1',
        name: 'Equipo Foto',
        role_label: null,
        notes: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];
    mockUseStaffTeams.mockReturnValue({ data: teams, isLoading: false });
    mockGetTeam.mockRejectedValue(new Error('boom'));

    renderComponent({ onAddTeamMembers });

    fireEvent.click(screen.getByRole('button', { name: 'events:staff.add_team' }));
    fireEvent.click(screen.getByRole('button', { name: /Equipo Foto/ }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Equipo Foto/ })).not.toBeInTheDocument();
    });
    expect(onAddTeamMembers).not.toHaveBeenCalled();
  });
});
