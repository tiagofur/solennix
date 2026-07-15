import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { StaffTeamList } from './StaffTeamList';

vi.mock('@/hooks/queries/useStaffQueries', () => ({
  useStaffTeams: vi.fn(() => ({ data: [], isLoading: false })),
  useDeleteStaffTeam: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <StaffTeamList />
    </MemoryRouter>,
  );

describe('StaffTeamList smoke', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the page title without crashing', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Equipos')).toBeInTheDocument();
    });
  });

  it('renders empty state when no teams exist', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sin equipos todavía')).toBeInTheDocument();
    });
  });

  it('renders the create-team button', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /Crear equipo/i }).length).toBeGreaterThan(0);
    });
  });
});
