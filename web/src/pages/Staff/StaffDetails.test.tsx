import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@tests/customRender';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StaffDetails } from './StaffDetails';
import { staffService } from '@/services/staffService';

const mockUseStaffMember = vi.fn();
const mockUseDeleteStaff = vi.fn();
const mockUseStaffAvailabilityRange = vi.fn();
const mockAddToast = vi.fn();

vi.mock('@/hooks/queries/useStaffQueries', () => ({
  useStaffMember: (...args: unknown[]) => mockUseStaffMember(...args),
  useDeleteStaff: (...args: unknown[]) => mockUseDeleteStaff(...args),
  useStaffAvailabilityRange: (...args: unknown[]) => mockUseStaffAvailabilityRange(...args),
}));

vi.mock('@/services/staffService', () => ({
  staffService: {
    inviteUser: vi.fn(),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key, i18n: { language: 'es' } }),
}));

function renderPage(path = '/staff/staff-1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/staff/:id" element={<StaffDetails />} />
        <Route path="/staff" element={<div>staff-list</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StaffDetails invite access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDeleteStaff.mockReturnValue({ mutateAsync: vi.fn() });
    mockUseStaffAvailabilityRange.mockReturnValue({ data: [] });
  });

  it('shows invite button and reveals invite URL after success', async () => {
    mockUseStaffMember.mockReturnValue({
      isLoading: false,
      data: {
        id: 'staff-1',
        user_id: 'owner-1',
        name: 'Carlos',
        role_label: 'Fotografo',
        phone: null,
        email: 'staff@example.com',
        notes: null,
        notification_email_opt_in: false,
        invited_user_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });

    (staffService.inviteUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      invite_id: 'inv-1',
      staff_id: 'staff-1',
      email: 'staff@example.com',
      status: 'pending',
      accept_url: 'https://app.solennix.com/team-invite?token=abc123',
      expires_at: '2026-05-20T00:00:00Z',
      created_at: '2026-05-10T00:00:00Z',
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /invitar acceso/i }));

    await waitFor(() => {
      expect(staffService.inviteUser).toHaveBeenCalledWith('staff-1');
    });

    expect(screen.getByText('https://app.solennix.com/team-invite?token=abc123')).toBeInTheDocument();
    expect(mockAddToast).toHaveBeenCalled();
  });

  it('hides invite button when staff is already linked to invited user', () => {
    mockUseStaffMember.mockReturnValue({
      isLoading: false,
      data: {
        id: 'staff-1',
        user_id: 'owner-1',
        name: 'Carlos',
        role_label: 'Fotografo',
        phone: null,
        email: 'staff@example.com',
        notes: null,
        notification_email_opt_in: false,
        invited_user_id: 'user-2',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    });

    renderPage();

    expect(screen.queryByRole('button', { name: /invitar acceso/i })).not.toBeInTheDocument();
  });
});
