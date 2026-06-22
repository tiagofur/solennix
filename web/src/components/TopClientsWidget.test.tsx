import { render, screen, fireEvent } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { TopClientsWidget } from './TopClientsWidget';
import { useTopClients } from '@/hooks/queries/useDashboardQueries';
import { vi } from 'vitest';

vi.mock('@/hooks/queries/useDashboardQueries', () => ({
  useTopClients: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('TopClientsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    vi.mocked(useTopClients).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<TopClientsWidget />);
    expect(screen.getByText('Clientes principales')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    vi.mocked(useTopClients).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<TopClientsWidget />);
    expect(screen.getByText('Sin datos de clientes aún')).toBeInTheDocument();
  });

  it('renders error state', () => {
    vi.mocked(useTopClients).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);

    render(<TopClientsWidget />);
    expect(screen.getByText(/Algo salió mal/i)).toBeInTheDocument();
  });

  it('navigates to client details on click', () => {
    vi.mocked(useTopClients).mockReturnValue({
      data: [
        { id: 'client-1', name: 'John Doe', total_spent: 1000, total_events: 2 },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(
      <MemoryRouter>
        <TopClientsWidget />
      </MemoryRouter>
    );

    const clientName = screen.getByText('John Doe');
    expect(clientName).toBeInTheDocument();

    const clientRow = clientName.closest('.cursor-pointer');
    expect(clientRow).toBeInTheDocument();

    fireEvent.click(clientRow!);
    expect(mockNavigate).toHaveBeenCalledWith('/clients/client-1');
  });
});
