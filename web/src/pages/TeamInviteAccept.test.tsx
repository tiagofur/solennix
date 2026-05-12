import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { TeamInviteAccept } from './TeamInviteAccept';
import { authService } from '@/services/authService';
import { useAuth } from '@/contexts/AuthContext';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/services/authService', () => ({
  authService: {
    acceptTeamInvite: vi.fn(),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function renderPage(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TeamInviteAccept />
    </MemoryRouter>,
  );
}

describe('TeamInviteAccept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ checkAuth: vi.fn() });
  });

  it('shows invalid token state without token in URL', () => {
    renderPage('/team-invite');

    expect(screen.getByText('Enlace inválido')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir a iniciar sesión/i })).toHaveAttribute('href', '/login');
  });

  it('accepts invite and redirects team member to team portal', async () => {
    const checkAuth = vi.fn().mockResolvedValue(undefined);
    (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ checkAuth });
    (authService.acceptTeamInvite as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { role: 'team_member' },
      tokens: {},
    });

    renderPage('/team-invite?token=token-123');

    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'StrongPass1' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'StrongPass1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /aceptar invitación/i }));

    await waitFor(() => {
      expect(authService.acceptTeamInvite).toHaveBeenCalledWith('token-123', 'StrongPass1');
    });
    await waitFor(() => {
      expect(checkAuth).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/team/events', { replace: true });
    });
  });

  it('shows API error if invite acceptance fails', async () => {
    (authService.acceptTeamInvite as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Token expirado'));

    renderPage('/team-invite?token=bad-token');

    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'StrongPass1' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'StrongPass1' },
    });

    fireEvent.click(screen.getByRole('button', { name: /aceptar invitación/i }));

    await waitFor(() => {
      expect(screen.getByText('Token expirado')).toBeInTheDocument();
    });
  });
});
