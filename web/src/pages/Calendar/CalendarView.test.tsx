import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { CalendarView } from './CalendarView';
import { eventService } from '../../services/eventService';
import { unavailableDatesService } from '../../services/unavailableDatesService';
import { logError } from '../../lib/errorHandler';
import { Event } from '../../types/entities';

type EventWithClient = Partial<Event> & {
  client?: { name: string; phone?: string; email?: string };
};

const mockNavigate = vi.fn();

vi.mock('../../services/eventService', () => ({
  eventService: {
    getByDateRange: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    getByClientId: vi.fn(),
    getUpcoming: vi.fn(),
    getProducts: vi.fn(),
    getExtras: vi.fn(),
    getEquipment: vi.fn(),
    getSupplies: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    updateItems: vi.fn(),
    checkEquipmentConflicts: vi.fn(),
    getEquipmentSuggestions: vi.fn(),
    getSupplySuggestions: vi.fn(),
    addProducts: vi.fn(),
    updateProducts: vi.fn(),
    updateExtras: vi.fn(),
  },
}));

vi.mock('../../services/unavailableDatesService', () => ({
  unavailableDatesService: {
    getDates: vi.fn(),
    removeDate: vi.fn(),
    addDate: vi.fn(),
    updateDate: vi.fn(),
  },
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((error: unknown, defaultMsg?: string) => defaultMsg || 'Error'),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    toasts: [],
  }),
}));

vi.mock('react-day-picker', () => ({
  DayPicker: ({ onSelect, onMonthChange }: any) => (
    <div>
      <button data-testid="mock-select" onClick={() => onSelect?.(new Date(2024, 0, 2))}>Select</button>
      <button data-testid="mock-clear" onClick={() => onSelect?.(undefined)}>Clear</button>
      <button data-testid="mock-next" onClick={() => onMonthChange?.(new Date(2024, 1, 1))}>Next</button>
    </div>
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderCalendar = () =>
  render(
    <MemoryRouter>
      <CalendarView />
    </MemoryRouter>
  );

const waitForLoading = async () => {
  await waitFor(() => {
    expect(eventService.getByDateRange).toHaveBeenCalled();
  }, { timeout: 2000 });

  await waitFor(() => {
    expect(screen.queryByRole('status', { name: /Cargando/i })).not.toBeInTheDocument();
  }, { timeout: 5000 });
};

// Helper: full event data with all fields populated
const makeEvent = (overrides: Record<string, any> = {}) => ({
  id: '1',
  event_date: '2024-01-02',
  status: 'confirmed',
  service_type: 'Boda',
  num_people: 100,
  start_time: '10:00',
  end_time: '14:00',
  location: 'Salón Rosa',
  total_amount: 5000,
  client: { name: 'Ana', phone: '5551234567' },
  ...overrides,
});

// Helper: select Jan 2 date (the initial date with fake timers is already Jan 2,
// but clicking "Select" re-confirms it after any operations)
const selectDate = () => {
  fireEvent.click(screen.getByTestId('mock-select'));
};

describe('CalendarView', () => {
  const mockEvents: EventWithClient[] = [
    {
      id: '1',
      event_date: '2024-01-02',
      service_type: 'Catering',
      status: 'confirmed',
      client: { name: 'Ana', email: 'ana@example.com' },
      client_id: 'c1',
      created_at: '',
      updated_at: '',
    },
    {
      id: '2',
      event_date: '2024-01-02',
      service_type: 'Boda',
      status: 'quoted',
      client: { name: 'Juan', email: 'juan@example.com' },
      client_id: 'c2',
      created_at: '',
      updated_at: '',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2024, 0, 2));

    (eventService.getByDateRange as any).mockResolvedValue(mockEvents);
    (eventService.getAll as any).mockResolvedValue(mockEvents);
    (unavailableDatesService.getDates as any).mockResolvedValue([]);
    (unavailableDatesService.removeDate as any).mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders events for selected date', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      {
        id: '1',
        event_date: '2024-01-02',
        status: 'confirmed',
        service_type: 'Boda',
        num_people: 100,
        client: { name: 'Ana' },
      },
    ]);

    renderCalendar();
    await waitForLoading();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });

  it('navigates to edit on event click', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      {
        id: '1',
        event_date: '2024-01-02',
        status: 'confirmed',
        service_type: 'Boda',
        num_people: 100,
        client: { name: 'Ana' },
      },
    ]);

    renderCalendar();
    await waitForLoading();

    // Initial selectedDate is Jan 2 (today with fake timers), events already visible
    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Ana'));
    expect(mockNavigate).toHaveBeenCalledWith('/events/1/summary');
  });

  it('shows empty state when no events', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([]);

    renderCalendar();
    selectDate();

    await waitFor(() => {
      expect(screen.getByText(/No hay eventos para este día/i)).toBeInTheDocument();
    });
  });

  it('clears selected date', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([]);

    renderCalendar();

    await waitFor(() => {
      expect(screen.getByTestId('mock-clear')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('mock-clear'));

    await waitFor(() => {
      expect(screen.getByLabelText('Crear nuevo evento o cotización')).toBeInTheDocument();
    });
  });

  it('logs errors when events fetch fails', async () => {
    (eventService.getByDateRange as any).mockRejectedValue(new Error('fail'));

    renderCalendar();

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('CalendarView:fetchEvents', expect.any(Error));
    });
  });

  // ---------- COVERAGE TESTS ----------

  it('displays event card with all detail fields (time, location, phone, total)', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([makeEvent()]);

    renderCalendar();
    await waitForLoading();

    // Events show on initial load (selectedDate = Jan 2 = today)
    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    expect(screen.getByText('Boda')).toBeInTheDocument();
    expect(screen.getByText(/100 pax/)).toBeInTheDocument();
    expect(screen.getByText('Salón Rosa')).toBeInTheDocument();
    expect(screen.getByText('5551234567')).toBeInTheDocument();
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
  });

  it('shows "Sin tel." when client has no phone', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ client: { name: 'Luis', phone: null } }),
    ]);

    renderCalendar();
    await waitForLoading();

    await waitFor(() => {
      expect(screen.getByText('Luis')).toBeInTheDocument();
    });
    expect(screen.getByText('Sin tel.')).toBeInTheDocument();
  });

  it('shows "S/H" when event has no start_time', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ start_time: null, end_time: null }),
    ]);

    renderCalendar();
    await waitForLoading();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });
    expect(screen.getByText('S/H')).toBeInTheDocument();
  });

  it('does not render location when event.location is null', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ location: null }),
    ]);

    renderCalendar();
    await waitForLoading();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });
    expect(screen.queryByText('Salón Rosa')).not.toBeInTheDocument();
  });

  it('renders all four status labels in calendar view', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ id: '1', status: 'confirmed', client: { name: 'C1', phone: '1' } }),
      makeEvent({ id: '2', status: 'completed', client: { name: 'C2', phone: '2' } }),
      makeEvent({ id: '3', status: 'cancelled', client: { name: 'C3', phone: '3' } }),
      makeEvent({ id: '4', status: 'quoted', client: { name: 'C4', phone: '4' } }),
    ]);

    renderCalendar();
    await waitForLoading();

    await waitFor(() => {
      expect(screen.getByText('C1')).toBeInTheDocument();
    });

    expect(screen.getByText('Confirmado')).toBeInTheDocument();
    expect(screen.getByText('Completado')).toBeInTheDocument();
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
    expect(screen.getByText('Cotizado')).toBeInTheDocument();
  });

  it('shows badge count when multiple events on selected date', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ id: '1', client: { name: 'A1', phone: '1' } }),
      makeEvent({ id: '2', client: { name: 'A2', phone: '2' } }),
    ]);

    renderCalendar();
    await waitForLoading();

    await waitFor(() => {
      expect(screen.getByText('A1')).toBeInTheDocument();
    });
    expect(screen.getByText(/2 Eventos/)).toBeInTheDocument();
  });

  it('shows singular "Evento" badge for one event', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([makeEvent()]);

    renderCalendar();
    await waitForLoading();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });
    expect(screen.getByText(/1 Evento/)).toBeInTheDocument();
  });

  it('navigates via keyboard (Enter) on event card', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([makeEvent()]);

    renderCalendar();
    await waitForLoading();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    const card = screen.getByRole('button', { name: /Ver detalles del evento/i });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/events/1/summary');
  });

  it('navigates via keyboard (Space) on event card', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([makeEvent()]);

    renderCalendar();
    await waitForLoading();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    const card = screen.getByRole('button', { name: /Ver detalles del evento/i });
    fireEvent.keyDown(card, { key: ' ' });
    expect(mockNavigate).toHaveBeenCalledWith('/events/1/summary');
  });

  it('does not navigate on non-Enter/Space keydown on event card', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([makeEvent()]);

    renderCalendar();
    await waitForLoading();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    const card = screen.getByRole('button', { name: /Ver detalles del evento/i });
    fireEvent.keyDown(card, { key: 'Tab' });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('includes selected date in Nuevo Evento link when in calendar mode', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([]);

    renderCalendar();
    selectDate();

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Crear evento para esta fecha' });
      expect(link.getAttribute('href')).toContain('/events/new?date=2024-01-02');
    });
  });

  it('handles null data from getByDateRange gracefully', async () => {
    (eventService.getByDateRange as any).mockResolvedValue(null);

    renderCalendar();
    selectDate();

    await waitFor(() => {
      expect(screen.getByText(/No hay eventos para este día/i)).toBeInTheDocument();
    });
  });

  it('shows empty state link in calendar empty state', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([]);

    renderCalendar();
    selectDate();

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Crear evento para esta fecha' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', expect.stringContaining('/events/new'));
    });
  });
});
