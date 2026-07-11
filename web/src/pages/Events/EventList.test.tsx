import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { EventList } from './EventList';

const mockNavigate = vi.fn();
const mockDeleteMutate = vi.fn();

const mockUseEvents = vi.fn();
const mockUseEventsPaginated = vi.fn();
const mockUseEventSearch = vi.fn();
const mockUsePagination = vi.fn();
const mockExportToCsv = vi.fn();

const mockUseEventsByDateRange = vi.fn();
const mockUseUnavailableDatesByRange = vi.fn();
const mockUseCreateUnavailableDates = vi.fn();
const mockUseDeleteUnavailableDate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../hooks/queries/useEventQueries', () => ({
  useEvents: () => mockUseEvents(),
  useEventsPaginated: (params: any) => mockUseEventsPaginated(params),
  useEventSearch: (filters: any) => mockUseEventSearch(filters),
  useDeleteEvent: () => ({ mutate: mockDeleteMutate }),
  useEventsByDateRange: (start: string, end: string) => mockUseEventsByDateRange(start, end),
}));

vi.mock('../../hooks/queries/useUnavailableDatesQueries', () => ({
  useCreateUnavailableDates: () => mockUseCreateUnavailableDates(),
  useDeleteUnavailableDate: () => mockUseDeleteUnavailableDate(),
  useUnavailableDatesByRange: (start: string, end: string) => mockUseUnavailableDatesByRange(start, end),
}));

vi.mock('../../hooks/usePagination', () => ({
  usePagination: (params: any) => mockUsePagination(params),
}));

vi.mock('../../components/StatusDropdown', () => ({
  StatusDropdown: ({ currentStatus }: { currentStatus: string }) => (
    <span data-testid="status-dropdown">{currentStatus}</span>
  ),
  EventStatus: {
    quoted: 'quoted',
    confirmed: 'confirmed',
    completed: 'completed',
    cancelled: 'cancelled',
  },
}));

vi.mock('../../components/Skeleton', () => ({
  SkeletonTable: () => <div data-testid="skeleton-table" />,
}));

vi.mock('../../components/Pagination', () => ({
  Pagination: ({ currentPage, totalPages }: any) => (
    <div data-testid="pagination">Pagina {currentPage} de {totalPages}</div>
  ),
}));

vi.mock('../../components/RowActionMenu', () => ({
  RowActionMenu: ({ items }: { items: Array<{ label: string; onClick: () => void }> }) => (
    <div data-testid="row-action-menu">
      {items.map((item, index) => (
        <button
          key={index}
          type="button"
          data-testid={`row-action-${index}`}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../../components/ConfirmDialog', () => ({
  ConfirmDialog: ({ open, onConfirm, onCancel }: any) =>
    open ? (
      <div data-testid="confirm-dialog">
        <button type="button" data-testid="confirm-delete" onClick={onConfirm}>
          confirmar
        </button>
        <button type="button" data-testid="cancel-delete" onClick={onCancel}>
          cancelar
        </button>
      </div>
    ) : null,
}));

vi.mock('../../components/Empty', () => ({
  __esModule: true,
  default: ({ title, action }: { title: string; action?: React.ReactNode }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      {action}
    </div>
  ),
}));

vi.mock('../../lib/exportCsv', () => ({
  exportToCsv: (...args: any[]) => mockExportToCsv(...args),
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
    client: { name: 'Maria Garcia' },
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
    client: null,
  },
];

function renderPage(initialEntries = ['/events']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <EventList />
    </MemoryRouter>,
  );
}

describe('EventList', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseEvents.mockReturnValue({
      data: mockEvents,
      isLoading: false,
      isError: false,
    });

    mockUseEventsPaginated.mockReturnValue({
      data: {
        data: mockEvents,
        total: mockEvents.length,
        total_pages: 1,
      },
      isLoading: false,
      isError: false,
    });

    mockUseEventSearch.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    mockUsePagination.mockReturnValue({
      currentData: mockEvents,
      currentPage: 1,
      totalPages: 1,
      totalItems: mockEvents.length,
      sortKey: 'event_date',
      sortOrder: 'desc',
      handlePageChange: vi.fn(),
      handleSort: vi.fn(),
    });

    mockUseEventsByDateRange.mockReturnValue({
      data: mockEvents,
      isLoading: false,
      isFetching: false,
      error: null,
    });

    mockUseUnavailableDatesByRange.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
    });

    mockUseCreateUnavailableDates.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
    });

    mockUseDeleteUnavailableDate.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
    });
  });

  it('renders title and header count', () => {
    renderPage();

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain('Eventos');
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('focuses search input with slash keyboard shortcut', () => {
    renderPage();

    const searchInput = screen.getByLabelText(/Buscar eventos por cliente/i);
    fireEvent.keyDown(window, { key: '/' });

    expect(document.activeElement).toBe(searchInput);
  });

  it('renders loading skeleton when paginated query is loading', () => {
    mockUseEventsPaginated.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    renderPage();

    expect(screen.getByTestId('skeleton-table')).toBeInTheDocument();
  });

  it('shows no-events empty state and create action when there are no events and no filters', () => {
    mockUseEvents.mockReturnValue({ data: [], isLoading: false, isError: false });
    mockUseEventsPaginated.mockReturnValue({
      data: { data: [], total: 0, total_pages: 1 },
      isLoading: false,
      isError: false,
    });

    renderPage();

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('Crear evento')).toBeInTheDocument();
  });

  it('uses search query results when filters are active', () => {
    const filtered = [
      {
        ...mockEvents[0],
        id: 'filtered-1',
        client: { name: 'Ana Lopez' },
      },
    ];

    mockUseEventSearch.mockReturnValue({
      data: filtered,
      isLoading: false,
      isError: false,
    });

    mockUsePagination.mockReturnValue({
      currentData: filtered,
      currentPage: 1,
      totalPages: 1,
      totalItems: filtered.length,
      sortKey: 'event_date',
      sortOrder: 'desc',
      handlePageChange: vi.fn(),
      handleSort: vi.fn(),
    });

    renderPage(['/events?q=ana']);

    expect(mockUseEventSearch).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'ana' }),
    );
    expect(screen.getByText('Ana Lopez')).toBeInTheDocument();
  });

  it('renders clear search button only when query exists and clears input', () => {
    renderPage(['/events?q=ana']);

    const searchInput = screen.getByLabelText(/Buscar eventos por cliente/i) as HTMLInputElement;
    expect(searchInput.value).toBe('ana');

    fireEvent.click(screen.getByLabelText(/Limpiar/i));

    expect(searchInput.value).toBe('');
  });

  it('updates server-side sort params when clicking sortable header without filters', () => {
    renderPage();

    fireEvent.click(screen.getByText(/Servicio/i));

    const lastCall = mockUseEventsPaginated.mock.calls[mockUseEventsPaginated.mock.calls.length - 1]?.[0];
    expect(lastCall).toEqual(
      expect.objectContaining({ sort: 'service_type', order: 'asc' }),
    );
  });

  it('navigates to summary when clicking an event row', () => {
    renderPage();

    fireEvent.click(screen.getByText('Maria Garcia'));

    expect(mockNavigate).toHaveBeenCalledWith('/events/ev1/summary');
  });

  it('exports csv with current rows', () => {
    renderPage();

    // Both the desktop toolbar and mobile header render the export button;
    // click the first match.
    fireEvent.click(screen.getAllByLabelText(/Exportar eventos a CSV/i)[0]);

    expect(mockExportToCsv).toHaveBeenCalledTimes(1);
    expect(mockExportToCsv.mock.calls[0][2]).toHaveLength(2);
  });

  it('opens delete confirmation and calls delete mutation when confirmed', () => {
    renderPage();

    fireEvent.click(screen.getAllByTestId('row-action-2')[0]);
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-delete'));

    expect(mockDeleteMutate).toHaveBeenCalledWith('ev1');
  });

  it('renders segmented control view toggle and respects view parameter', () => {
    renderPage(['/events?view=calendar']);

    // Should show Export .ics button in calendar view mode (present in both
    // desktop toolbar and mobile header — assert at least one renders).
    expect(screen.getAllByText('Exportar .ics', { exact: false }).length).toBeGreaterThan(0);
  });

  it('handles period chips in list mode', () => {
    renderPage(['/events?view=list']);

    // Check if period chips like 'Hoy' are present
    expect(screen.getByRole('button', { name: /Hoy/i })).toBeInTheDocument();
  });

  it('hides period chips in calendar mode', () => {
    renderPage(['/events?view=calendar']);

    // Check if period chips like 'Hoy' are NOT present
    expect(screen.queryByRole('button', { name: /Hoy/i })).not.toBeInTheDocument();
  });

  it('renders all events for the month by default in calendar mode', () => {
    renderPage(['/events?view=calendar']);

    // Since selectedDate is undefined by default, both events for the range/month should render in the side panel
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    expect(screen.getByText('Boda')).toBeInTheDocument();
  });
});
