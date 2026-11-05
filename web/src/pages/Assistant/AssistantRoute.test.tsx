import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { AssistantRoute, TeamPortalGuard } from './AssistantRoute';

let mockAuthState = { user: null as any, loading: true };

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div>{`redirect:${to}`}</div>,
  };
});

describe('AssistantRoute', () => {
  it('renders loading spinner while checking auth', () => {
    mockAuthState = { user: null, loading: true };
    const { container } = render(
      <MemoryRouter>
        <AssistantRoute>
          <div>contenido secretario</div>
        </AssistantRoute>
      </MemoryRouter>,
    );
    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('redirects to login when unauthenticated', () => {
    mockAuthState = { user: null, loading: false };
    render(
      <MemoryRouter>
        <AssistantRoute>
          <div>contenido secretario</div>
        </AssistantRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText('redirect:/login')).toBeInTheDocument();
  });

  it('renders children for assistant role', () => {
    mockAuthState = { user: { id: '1', role: 'assistant' }, loading: false };
    render(
      <MemoryRouter>
        <AssistantRoute>
          <div>contenido secretario</div>
        </AssistantRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText('contenido secretario')).toBeInTheDocument();
  });

  it('redirects team_member to the team portal', () => {
    mockAuthState = { user: { id: '1', role: 'team_member' }, loading: false };
    render(
      <MemoryRouter>
        <AssistantRoute>
          <div>contenido secretario</div>
        </AssistantRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText('redirect:/team/work')).toBeInTheDocument();
  });

  it('redirects organizer roles to the dashboard', () => {
    mockAuthState = { user: { id: '1', role: 'user' }, loading: false };
    render(
      <MemoryRouter>
        <AssistantRoute>
          <div>contenido secretario</div>
        </AssistantRoute>
      </MemoryRouter>,
    );
    expect(screen.getByText('redirect:/dashboard')).toBeInTheDocument();
  });
});

describe('TeamPortalGuard', () => {
  it('redirects assistant away from the team portal to /assistant', () => {
    mockAuthState = { user: { id: '1', role: 'assistant' }, loading: false };
    render(
      <MemoryRouter>
        <TeamPortalGuard>
          <div>portal equipo</div>
        </TeamPortalGuard>
      </MemoryRouter>,
    );
    expect(screen.getByText('redirect:/assistant')).toBeInTheDocument();
  });

  it('renders children for team_member', () => {
    mockAuthState = { user: { id: '1', role: 'team_member' }, loading: false };
    render(
      <MemoryRouter>
        <TeamPortalGuard>
          <div>portal equipo</div>
        </TeamPortalGuard>
      </MemoryRouter>,
    );
    expect(screen.getByText('portal equipo')).toBeInTheDocument();
  });

  it('renders children for organizer roles', () => {
    mockAuthState = { user: { id: '1', role: 'user' }, loading: false };
    render(
      <MemoryRouter>
        <TeamPortalGuard>
          <div>portal equipo</div>
        </TeamPortalGuard>
      </MemoryRouter>
    );
    expect(screen.getByText('portal equipo')).toBeInTheDocument();
  });
});
