import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { AssistantAgendaPage } from './AssistantAgendaPage';

const mockUseUpcomingEvents = vi.fn();
const mockUseEventStaff = vi.fn();
const mockGetEventStaffSummary = vi.fn();

vi.mock('@/hooks/queries/useEventQueries', () => ({
  useUpcomingEvents: (...args: unknown[]) => mockUseUpcomingEvents(...args),
}));

vi.mock('@/hooks/queries/useStaffQueries', () => ({
  useEventStaff: (...args: unknown[]) => mockUseEventStaff(...args),
}));

vi.mock('@/services/staffService', () => ({
  staffService: {
    getEventStaffSummary: (...args: unknown[]) => mockGetEventStaffSummary(...args),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    i18n: { language: 'es' },
  }),
}));

const upcomingEvents = [
  {
    id: 'e1',
    event_date: '2026-11-10',
    service_type: 'Boda',
    location: 'Salón Rosa',
    city: 'CDMX',
    client: { name: 'Ana y Luis' },
  },
  {
    id: 'e2',
    event_date: '2026-11-15',
    service_type: 'XV años',
    location: null,
    city: null,
    client: null,
  },
];

const eventStaff = [
  {
    id: 'es1',
    event_id: 'e1',
    staff_id: 's1',
    status: 'confirmed',
    staff_name: 'María',
    staff_role_label: 'Fotógrafa',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'es2',
    event_id: 'e1',
    staff_id: 's2',
    status: 'pending',
    staff_name: 'Jorge',
    staff_role_label: 'DJ',
    created_at: '2026-01-01T00:00:00Z',
  },
];

function mockQueries(options?: { loadingEvents?: boolean; eventsError?: boolean }) {
  mockUseUpcomingEvents.mockReturnValue({
    data: options?.loadingEvents ? undefined : upcomingEvents,
    isLoading: !!options?.loadingEvents,
    isError: !!options?.eventsError,
    refetch: vi.fn(),
  });
  mockUseEventStaff.mockReturnValue({ data: eventStaff, isLoading: false });
  mockGetEventStaffSummary.mockResolvedValue({
    total: 2,
    confirmed: 1,
    pending: 1,
    declined: 0,
    cancelled: 0,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AssistantAgendaPage />
    </MemoryRouter>,
  );
}

describe('AssistantAgendaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueries();
  });

  it('renders the upcoming events agenda', async () => {
    renderPage();
    expect(await screen.findByText('Agenda de eventos')).toBeInTheDocument();
    expect(screen.getByText('Boda')).toBeInTheDocument();
    expect(screen.getByText('XV años')).toBeInTheDocument();
  });

  it('shows staffing and attendance summary for the selected event', async () => {
    renderPage();
    expect(await screen.findByText('Dotación del evento')).toBeInTheDocument();
    await waitFor(() => {
      expect(mockGetEventStaffSummary).toHaveBeenCalledWith('e1');
    });
    expect(await screen.findByText('María')).toBeInTheDocument();
    expect(screen.getByText('Jorge')).toBeInTheDocument();
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
  });

  it('switches staffing when another event is selected', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('XV años'));
    await waitFor(() => {
      expect(mockGetEventStaffSummary).toHaveBeenCalledWith('e2');
    });
  });

  it('is read-only: no RSVP, checklist or availability mutations', async () => {
    renderPage();
    await screen.findByText('Agenda de eventos');
    expect(screen.queryByRole('button', { name: /aceptar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /rechazar/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/disponibilidad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/finanzas|pagos|clientes/i)).not.toBeInTheDocument();
  });

  it('renders empty state without upcoming events', async () => {
    mockUseUpcomingEvents.mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn() });
    renderPage();
    expect(await screen.findByText('No hay próximos eventos.')).toBeInTheDocument();
  });
});
