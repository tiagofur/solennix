import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { EventList } from './EventList';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock hooks
vi.mock('../../hooks/queries/useEventQueries', () => ({
  useEvents: () => ({
    data: mockEvents,
    isLoading: false,
    isError: false,
  }),
  useEventsPaginated: () => ({
    data: { data: mockPaginatedEvents, total: mockPaginatedEvents.length, total_pages: 1 },
    isLoading: false,
    isError: false,
  }),
  // `useEventSearch` is only enabled when at least one filter is active.
  // In the baseline "no filters" flow exercised by this test file, the hook
  // returns an empty disabled query; tests that exercise filters should
  // override this mock with mockImplementation. See Fase 6 of the slice
  // `backend-as-source-of-truth`.
  useEventSearch: () => ({
    data: undefined,
    isLoading: false,
    isError: false,
  }),
  useDeleteEvent: () => ({ mutate: vi.fn() }),
}));

// Mock components
vi.mock('../../components/StatusDropdown', () => ({
  StatusDropdown: ({ currentStatus }: { currentStatus: string }) => (
    <span data-testid="status-dropdown">{currentStatus}</span>
  ),
  EventStatus: { quoted: 'quoted', confirmed: 'confirmed', completed: 'completed', cancelled: 'cancelled' },
}));

vi.mock('../../components/Skeleton', () => ({
  SkeletonTable: () => <div data-testid="skeleton-table" />,
}));

vi.mock('../../components/Pagination', () => ({
  Pagination: ({ currentPage, totalPages }: any) => (
    <div data-testid="pagination">Página {currentPage} de {totalPages}</div>
  ),
}));

vi.mock('../../components/RowActionMenu', () => ({
  RowActionMenu: () => <div data-testid="row-action-menu" />,
}));

vi.mock('../../components/Empty', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock('../../lib/exportCsv', () => ({
  exportToCsv: vi.fn(),
}));

vi.mock('../../hooks/usePagination', () => ({
  usePagination: ({ data }: any) => ({
    currentData: data,
    currentPage: 1,
    totalPages: 1,
    totalItems: data.length,
    sortKey: 'event_date',
    sortOrder: 'desc',
    handlePageChange: vi.fn(),
    handleSort: vi.fn(),
  }),
}));

const mockEvents = [
  {
    id: 'ev1',
    event_date: '2025-06-15',
    start_time: '10:00',
    end_time: '22:00',
    service_type: 'Boda',
    num_people: 100,
    status: 'confirmed',
    total_amount: 50000,
    city: 'CDMX',
    client: { name: 'María García' },
  },
  {
    id: 'ev2',
    event_date: '2025-07-20',
    start_time: '14:00',
    end_time: '18:00',
    service_type: 'XV',
    num_people: 200,
    status: 'quoted',
    total_amount: 30000,
    city: 'Guadalajara',
    client: { name: 'Juan López' },
  },
];

const mockPaginatedEvents = [...mockEvents];

describe('EventList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    expect(screen.getByText(/Eventos/)).toBeInTheDocument();
  });

  it('renders event count in header', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    expect(screen.getByLabelText(/Buscar eventos por cliente/)).toBeInTheDocument();
  });

  it('renders status filter chips', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    expect(screen.getByText('Todos')).toBeInTheDocument();
    expect(screen.getByText('Cotizado')).toBeInTheDocument();
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });

  it('renders event rows in table', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    expect(screen.getByText('María García')).toBeInTheDocument();
    expect(screen.getByText('Juan López')).toBeInTheDocument();
  });

  it('renders service types', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    expect(screen.getByText('Boda')).toBeInTheDocument();
    expect(screen.getByText('XV')).toBeInTheDocument();
  });

  it('renders total amounts', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    expect(screen.getByText('$30,000.00')).toBeInTheDocument();
  });

  it('renders CSV export button when events exist', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    expect(screen.getByLabelText('Exportar eventos a CSV')).toBeInTheDocument();
  });

  it('renders Nuevo Evento link', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    expect(screen.getByText('Nuevo evento')).toBeInTheDocument();
  });

  it('renders Cotización Rápida link', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    expect(screen.getByText('Cotización rápida')).toBeInTheDocument();
  });

  it('renders status dropdowns for events', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    const dropdowns = screen.getAllByTestId('status-dropdown');
    expect(dropdowns.length).toBe(2);
  });

  it('renders pagination', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });

  it('renders cities when present', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    expect(screen.getByText('CDMX')).toBeInTheDocument();
    expect(screen.getByText('Guadalajara')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(
      <MemoryRouter>
        <EventList />
      </MemoryRouter>
    );
    expect(screen.getByText('Cliente')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
  });
});
