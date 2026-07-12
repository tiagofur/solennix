import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

let mockAuthState = { user: null as any, loading: true };

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div>{`redirect:${to}`}</div>,
  };
});

describe('ProtectedRoute', () => {
  it('renders loading spinner while checking auth', () => {
    mockAuthState = { user: null, loading: true };
    const { container } = render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>contenido</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('redirects to login when unauthenticated', () => {
    mockAuthState = { user: null, loading: false };
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>contenido</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('redirect:/login')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    mockAuthState = { user: { id: '1' }, loading: false };
    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>contenido</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('contenido')).toBeInTheDocument();
  });

  it('redirects team member to canonical /team/work (no extra hop)', () => {
    mockAuthState = { user: { id: '1', role: 'team_member' }, loading: false };
    render(
      <MemoryRouter>
        <ProtectedRoute allowTeamMember={false}>
          <div>contenido</div>
        </ProtectedRoute>
      </MemoryRouter>
    );
    expect(screen.getByText('redirect:/team/work')).toBeInTheDocument();
  });
});
