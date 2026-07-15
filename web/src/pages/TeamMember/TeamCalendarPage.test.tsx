import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { TeamCalendarPage } from './TeamCalendarPage';

vi.mock('@/hooks/queries/useStaffQueries', () => ({
  useMyAssignments: vi.fn(() => ({ data: [], isLoading: false, isError: false, refetch: vi.fn() })),
  useRespondAssignment: vi.fn(() => ({ mutate: vi.fn() })),
  useExecutionState: vi.fn(() => ({ data: { checklist: { arrival: false, materials: false, closing: false }, quick_note: '' } })),
  useSaveExecutionState: vi.fn(() => ({ mutate: vi.fn() })),
  defaultExecutionState: { checklist: { arrival: false, materials: false, closing: false }, quick_note: '' },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <TeamCalendarPage />
    </MemoryRouter>,
  );

describe('TeamCalendarPage smoke', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the page title without crashing', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Calendario de trabajo')).toBeInTheDocument();
    });
  });

  it('renders the subtitle', async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText('Usá un calendario real para planear tu carga de trabajo.'),
      ).toBeInTheDocument();
    });
  });
});
