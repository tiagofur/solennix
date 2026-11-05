import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen, waitFor } from '@tests/customRender';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StaffDetails, getInviteShareText } from './StaffDetails';
import { staffService } from '@/services/staffService';
import { logError } from '@/lib/errorHandler';

const mockUseStaffMember = vi.fn();
const mockUseDeleteStaff = vi.fn();
const mockUseStaffAvailabilityRange = vi.fn();
const mockUseStaffLimits = vi.fn();
const mockUseAuth = vi.fn();
const mockAddToast = vi.fn();
const mockMutateAsync = vi.fn();
const mockRefetch = vi.fn();

vi.mock('@/hooks/queries/useStaffQueries', () => ({
  useStaffMember: (...args: unknown[]) => mockUseStaffMember(...args),
  useDeleteStaff: (...args: unknown[]) => mockUseDeleteStaff(...args),
  useStaffAvailabilityRange: (...args: unknown[]) => mockUseStaffAvailabilityRange(...args),
  useStaffLimits: (...args: unknown[]) => mockUseStaffLimits(...args),
}));

vi.mock('@/services/staffService', () => ({
  staffService: {
    inviteUser: vi.fn(),
    revokeInvite: vi.fn(),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

vi.mock('@/lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: (_error: unknown, fallback: string) => fallback,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key, i18n: { language: 'es' } }),
}));

const baseStaff = {
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
};

function mockStaff(data: Record<string, unknown> = {}) {
  mockUseStaffMember.mockReturnValue({
    isLoading: false,
    data: { ...baseStaff, ...data },
    refetch: mockRefetch,
  });
}

function mockInviteSuccess(url = 'https://app.solennix.com/team-invite?token=abc123') {
  (staffService.inviteUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    invite_id: 'inv-1',
    staff_id: 'staff-1',
    email: 'staff@example.com',
    status: 'pending',
    accept_url: url,
    expires_at: '2026-05-20T00:00:00Z',
    created_at: '2026-05-10T00:00:00Z',
  });
}

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
    mockUseDeleteStaff.mockReturnValue({ mutateAsync: mockMutateAsync });
    mockUseStaffAvailabilityRange.mockReturnValue({ data: [] });
    mockUseStaffLimits.mockReturnValue({ data: undefined });
    mockUseAuth.mockReturnValue({ user: null });
    mockRefetch.mockResolvedValue({ data: null });
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders loading state', () => {
    mockUseStaffMember.mockReturnValue({ isLoading: true, data: null });

    renderPage();

    expect(screen.getByText('staff:details.loading')).toBeInTheDocument();
  });

  it('renders not-found state with return link', () => {
    mockUseStaffMember.mockReturnValue({ isLoading: false, data: null });

    renderPage();

    expect(screen.getByText((content) => content.includes('staff:details.not_found'))).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'staff:details.return_list' })).toHaveAttribute('href', '/staff');
  });

  it('shows invite button and reveals invite URL after success', async () => {
    mockStaff();
    mockInviteSuccess();

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.invite' }));

    await waitFor(() => {
      expect(staffService.inviteUser).toHaveBeenCalledWith('staff-1', 'team_member');
    });

    expect(screen.getByText('https://app.solennix.com/team-invite?token=abc123')).toBeInTheDocument();
    expect(mockAddToast).toHaveBeenCalledWith('staff:details.actions.invite_sent', 'success');
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('hides invite button when staff is already linked to invited user', () => {
    mockStaff({ invited_user_id: 'user-2' });

    renderPage();

    expect(screen.queryByRole('button', { name: 'staff:details.actions.invite' })).not.toBeInTheDocument();
  });

  it('shows error toast when invite request fails', async () => {
    mockStaff();
    (staffService.inviteUser as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.invite' }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error creating staff invite', expect.any(Error));
    });
    expect(mockAddToast).toHaveBeenCalledWith('staff:details.actions.invite_error', 'error');
  });

  it('copies invite link to clipboard and shows success toast', async () => {
    mockStaff();
    mockInviteSuccess('https://app.solennix.com/team-invite?token=copy-me');

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.invite' }));
    await screen.findByText('https://app.solennix.com/team-invite?token=copy-me');

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.copy_link' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://app.solennix.com/team-invite?token=copy-me');
    });
    expect(mockAddToast).toHaveBeenCalledWith('staff:details.actions.invite_copied', 'success');
  });

  it('falls back to info toast when copying invite link fails', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('no clipboard')),
      },
    });

    mockStaff();
    mockInviteSuccess('https://app.solennix.com/team-invite?token=show-me');

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.invite' }));
    await screen.findByText('https://app.solennix.com/team-invite?token=show-me');

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.copy_link' }));

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('https://app.solennix.com/team-invite?token=show-me', 'info');
    });
  });

  it('shares invite link via navigator.share with pre-built text', async () => {
    const shareFn = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share: shareFn,
    });

    mockStaff();
    mockInviteSuccess('https://app.solennix.com/team-invite?token=share-me');

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.invite' }));
    await screen.findByText('https://app.solennix.com/team-invite?token=share-me');

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.share_link' }));

    await waitFor(() => {
      expect(shareFn).toHaveBeenCalledTimes(1);
    });
    const payload = shareFn.mock.calls[0][0] as { title: string; text: string; url: string };
    expect(payload.url).toBe('https://app.solennix.com/team-invite?token=share-me');
    expect(typeof payload.text).toBe('string');
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('falls back to clipboard copy when navigator.share is missing', async () => {
    mockStaff();
    mockInviteSuccess('https://app.solennix.com/team-invite?token=fallback-me');

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.invite' }));
    await screen.findByText('https://app.solennix.com/team-invite?token=fallback-me');

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.share_link' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
    expect(mockAddToast).toHaveBeenCalledWith('staff:details.actions.invite_copied', 'success');
  });

  it('falls back to clipboard copy when navigator.share rejects', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      share: vi.fn().mockRejectedValue(new Error('share failed')),
    });

    mockStaff();
    mockInviteSuccess('https://app.solennix.com/team-invite?token=share-fail');

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.invite' }));
    await screen.findByText('https://app.solennix.com/team-invite?token=share-fail');

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.share_link' }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
    expect(mockAddToast).toHaveBeenCalledWith('staff:details.actions.invite_copied', 'success');
  });

  it.each(['pending', 'active', 'invited', 'sent'])(
    'keeps pending invite visible after remount without in-memory URL (status=%s)',
    async (invite_status) => {
      mockStaff({ invite_status, invited_user_id: null });

      const first = renderPage();
      expect(screen.getByText('staff:details.actions.invite_pending')).toBeInTheDocument();
      expect(screen.getByText('staff:details.actions.invite_pending_hint')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'staff:details.actions.revoke_invite' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'staff:details.actions.invite' })).not.toBeInTheDocument();
      first.unmount();

      // Remount: in-memory inviteURL is gone, server invite_status persists.
      renderPage();
      expect(screen.getByText('staff:details.actions.invite_pending')).toBeInTheDocument();
      expect(screen.getByText('staff:details.actions.invite_pending_hint')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'staff:details.actions.invite' })).not.toBeInTheDocument();
    },
  );

  it('hides the role picker when plan is not business', () => {
    mockStaff();
    mockUseStaffLimits.mockReturnValue({ data: { used: 1, max: 10, unlimited: false, plan: 'pro' } });

    renderPage();

    expect(screen.getByRole('button', { name: 'staff:details.actions.invite' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('shows the role picker on business plan and sends target_role assistant', async () => {
    mockStaff();
    mockUseStaffLimits.mockReturnValue({ data: { used: 1, max: 10, unlimited: false, plan: 'business' } });
    mockInviteSuccess();

    renderPage();

    const picker = screen.getByRole('combobox');
    expect(picker).toBeInTheDocument();
    fireEvent.change(picker, { target: { value: 'assistant' } });
    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.invite' }));

    await waitFor(() => {
      expect(staffService.inviteUser).toHaveBeenCalledWith('staff-1', 'assistant');
    });
  });

  it('revokes a server-side pending invite without in-memory URL', async () => {
    mockStaff({ invite_status: 'pending', invited_user_id: null });
    (staffService.revokeInvite as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.revoke_invite' }));
    fireEvent.click(screen.getByRole('button', { name: 'staff:details.revoke_confirm.confirm' }));

    await waitFor(() => {
      expect(staffService.revokeInvite).toHaveBeenCalledWith('staff-1');
    });
    expect(mockAddToast).toHaveBeenCalledWith('staff:details.actions.invite_revoked', 'info');
  });

  it('renders no hardcoded Spanish in the invite flow (keys resolve via catalog)', async () => {
    mockStaff();
    mockInviteSuccess();

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.invite' }));
    await screen.findByText('https://app.solennix.com/team-invite?token=abc123');

    for (const spanish of [
      'Invitar acceso',
      'Invitando...',
      'Invitación creada correctamente.',
      'Copiar',
      'Compartir',
      'Link de invitación',
      'Hay una invitación activa pendiente.',
      'Revocar invitación',
    ]) {
      expect(screen.queryByText(spanish)).not.toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'staff:details.actions.share_link' })).toBeInTheDocument();
    expect(screen.getByText('staff:details.actions.invite_pending_hint')).toBeInTheDocument();
  });

  it('deletes staff after confirmation and navigates to list', async () => {
    mockStaff();

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'staff:details.actions.delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'staff:details.delete_confirm.confirm' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith('staff-1');
    });
    await waitFor(() => {
      expect(screen.getByText('staff-list')).toBeInTheDocument();
    });
  });

  it('renders and sorts upcoming assignments with shift labels', () => {
    mockStaff();
    mockUseStaffAvailabilityRange.mockReturnValue({
      data: [
        {
          staff_id: 'staff-1',
          staff_name: 'Carlos',
          assignments: [
            {
              event_id: 'ev-2',
              event_name: 'Evento B',
              event_date: '2026-06-15',
              shift_start: '2026-06-15T14:00:00.000Z',
              shift_end: null,
              status: 'pending',
            },
            {
              event_id: 'ev-1',
              event_name: 'Evento A',
              event_date: '2026-06-01',
              shift_start: null,
              shift_end: '2026-06-01T20:00:00.000Z',
              status: 'confirmed',
            },
          ],
        },
      ],
    });

    renderPage();

    const eventLinks = screen.getAllByRole('link', { name: /Evento/ });
    expect(eventLinks[0]).toHaveAttribute('href', '/events/ev-1/summary');
    expect(eventLinks[1]).toHaveAttribute('href', '/events/ev-2/summary');
    expect(screen.getByText('staff:details.status.pending')).toBeInTheDocument();
    expect(screen.getByText('staff:details.status.confirmed')).toBeInTheDocument();
    expect(screen.getByText(/staff:details.upcoming.shift_to/)).toBeInTheDocument();
    expect(screen.getByText(/staff:details.upcoming.shift_from/)).toBeInTheDocument();
  });
});

describe('staff invite catalog (es/en)', () => {
  const esStaff = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'src/i18n/locales/es/staff.json'), 'utf8'),
  );
  const enStaff = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'src/i18n/locales/en/staff.json'), 'utf8'),
  );

  const actionKeys = [
    'invite',
    'inviting',
    'invite_sent',
    'invite_error',
    'invite_revoked',
    'invite_revoke_error',
    'invite_copied',
    'invite_link',
    'copy_link',
    'share_link',
    'revoke_invite',
    'invite_pending',
    'invite_pending_hint',
    'invite_share_text',
    'invite_share_text_generic',
    'invite_share_title',
    'invite_share_title_generic',
    'invite_share_role_default',
  ];

  it.each(actionKeys)('has translated details.actions.%s in EN without Spanish leftovers', (key) => {
    const es = esStaff.details.actions[key];
    const en = enStaff.details.actions[key];
    expect(typeof es).toBe('string');
    expect(typeof en).toBe('string');
    expect(en.length).toBeGreaterThan(0);
    expect(en).not.toBe(es);
    const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
    expect(placeholders(en)).toEqual(placeholders(es));
  });

  it.each(['title', 'description', 'confirm', 'cancel'])('has translated details.revoke_confirm.%s in EN', (key) => {
    expect(typeof enStaff.details.revoke_confirm[key]).toBe('string');
    expect(enStaff.details.revoke_confirm[key]).not.toBe(esStaff.details.revoke_confirm[key]);
  });

  it('builds the ES share text with business, role and url', () => {
    const t = catalogT(esStaff);
    const { title, text } = getInviteShareText(t, {
      business: 'Estudio Luna',
      role: 'Fotógrafa',
      url: 'https://app.solennix.com/team-invite?token=abc',
    });
    expect(title).toContain('Estudio Luna');
    expect(text).toContain('Estudio Luna');
    expect(text).toContain('Fotógrafa');
    expect(text).toContain('https://app.solennix.com/team-invite?token=abc');
  });

  it('builds the EN share text without Spanish leftovers', () => {
    const t = catalogT(enStaff);
    const { title, text } = getInviteShareText(t, {
      business: 'Luna Studio',
      role: 'Photographer',
      url: 'https://app.solennix.com/team-invite?token=abc',
    });
    expect(title).toContain('Luna Studio');
    expect(text).toContain('Luna Studio');
    expect(text).toContain('Photographer');
    expect(text).toContain('https://app.solennix.com/team-invite?token=abc');
    for (const spanish of ['Te invito', 'como', 'aquí', 'Invitación de', 'Colaborador']) {
      expect(text).not.toContain(spanish);
      expect(title).not.toContain(spanish);
    }
  });

  it('falls back to the generic share text without business', () => {
    const t = catalogT(esStaff);
    const { text } = getInviteShareText(t, {
      business: null,
      role: 'DJ',
      url: 'https://app.solennix.com/team-invite?token=abc',
    });
    expect(text).toContain('DJ');
    expect(text).toContain('https://app.solennix.com/team-invite?token=abc');
  });
});

function catalogT(catalog: unknown) {
  return (key: string, vars?: Record<string, unknown>): string => {
    const [, ...rest] = key.split(':');
    let value: unknown = catalog;
    for (const part of rest.join(':').split('.')) {
      value = (value as Record<string, unknown>)?.[part];
    }
    if (typeof value !== 'string') throw new Error(`Missing catalog string for ${key}`);
    return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(vars?.[name] ?? ''));
  };
}
