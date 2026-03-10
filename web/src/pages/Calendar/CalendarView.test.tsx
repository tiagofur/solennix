import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
  },
}));

vi.mock('../../services/unavailableDatesService', () => ({
  unavailableDatesService: {
    getDates: vi.fn(),
    removeDate: vi.fn(),
  },
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
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
  // Wait for fetches to start if they haven't started yet
  await waitFor(() => {
    expect(eventService.getByDateRange).toHaveBeenCalled();
  }, { timeout: 2000 });

  // Wait for fetches to finish (spinner should appear and then disappear)
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
    vi.useFakeTimers();
    // Set system time to Jan 2, 2024
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

    await waitFor(() => {
      expect(screen.getByTestId('mock-select')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('mock-select'));
    await waitForLoading();

    await waitFor(() => {
      expect(screen.getByTestId('mock-next')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('mock-next'));
    await waitForLoading();

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Ana'));
    expect(mockNavigate).toHaveBeenCalledWith('/events/1/summary');
  });

  it('shows empty state when no events', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([]);

    renderCalendar();
    fireEvent.click(screen.getByText('Select'));

    await waitFor(() => {
      expect(screen.getByText(/No hay eventos para este día/i)).toBeInTheDocument();
    });
  });

  it('clears selected date for new event link', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([]);

    renderCalendar();

    await waitFor(() => {
      expect(screen.getByTestId('mock-clear')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('mock-clear'));

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Crear nuevo evento' }).getAttribute('href')).toEqual('/events/new');
    });
  });

  it('logs errors when events fetch fails', async () => {
    (eventService.getByDateRange as any).mockRejectedValue(new Error('fail'));

    renderCalendar();

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('CalendarView:fetchEvents', expect.any(Error));
    });
  });

  // ---------- NEW TESTS FOR COVERAGE ----------

  it('displays event card with all detail fields (time, location, phone, total)', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([makeEvent()]);

    renderCalendar();
    fireEvent.click(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Next'));

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
    fireEvent.click(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Next'));

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
    fireEvent.click(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Next'));

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
    fireEvent.click(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Next'));

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
    fireEvent.click(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Next'));

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
    fireEvent.click(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('A1')).toBeInTheDocument();
    });
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Eventos')).toBeInTheDocument();
  });

  it('shows singular "Evento" badge for one event', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([makeEvent()]);

    renderCalendar();
    fireEvent.click(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });
    // Badge text is "1 Evento" inside a single span
    expect(screen.getByText(/1 Evento/)).toBeInTheDocument();
  });

  it('navigates via keyboard (Enter) on event card', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([makeEvent()]);

    renderCalendar();
    fireEvent.click(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Next'));

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
    fireEvent.click(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Next'));

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
    fireEvent.click(screen.getByText('Select'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    const card = screen.getByRole('button', { name: /Ver detalles del evento/i });
    fireEvent.keyDown(card, { key: 'Tab' });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ---- LIST VIEW TESTS ----

  it('switches to list view and fetches all events', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ id: '1', client: { name: 'ClienteA', phone: '111' } }),
    ]);

    renderCalendar();

    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    await waitFor(() => {
      expect(eventService.getByDateRange).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('ClienteA')).toBeInTheDocument();
    });

    // Table headers should be present
    expect(screen.getByText('Fecha')).toBeInTheDocument();
    expect(screen.getByText('Cliente / Tipo')).toBeInTheDocument();
    expect(screen.getByText('Estado')).toBeInTheDocument();
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('shows loading state in list view', async () => {
    let resolvePromise: (value: any) => void;
    const delayedPromise = new Promise((res) => { resolvePromise = res; });
    (eventService.getByDateRange as any).mockReturnValue(delayedPromise);

    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    // "Cargando eventos..." appears as both sr-only and visible text
    await waitFor(() => {
      expect(screen.getAllByText('Cargando eventos...').length).toBeGreaterThanOrEqual(1);
    });

    resolvePromise!([]);

    // After resolving, loading spinner is replaced by empty state
    await waitFor(() => {
      expect(screen.getByText('No se encontraron eventos')).toBeInTheDocument();
    });
  });

  it('shows empty state with filter hint when list is filtered with no results', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ id: '1', client: { name: 'Ana', phone: '111' }, status: 'confirmed' }),
    ]);

    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    // Filter by cancelled status (no events match)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelado' }));

    expect(screen.getByText('No se encontraron eventos')).toBeInTheDocument();
    expect(screen.getByText('Intenta ajustando los filtros.')).toBeInTheDocument();
  });

  it('shows empty state without filter hint when no events at all', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([]);

    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    await waitFor(() => {
      expect(screen.getByText('No se encontraron eventos')).toBeInTheDocument();
    });
    expect(screen.getByText('Agrega tu primer evento.')).toBeInTheDocument();
  });

  it('filters list view by search term', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ id: '1', client: { name: 'Ana', phone: '111' }, service_type: 'Boda' }),
      makeEvent({ id: '2', client: { name: 'Carlos', phone: '222' }, service_type: 'Cumpleaños' }),
    ]);

    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Buscar por cliente o servicio/i), {
      target: { value: 'Carlos' },
    });

    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });

  it('filters list view by status', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ id: '1', client: { name: 'Ana', phone: '111' }, status: 'confirmed' }),
      makeEvent({ id: '2', client: { name: 'Carlos', phone: '222' }, status: 'completed' }),
    ]);

    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    await waitFor(() => {
      expect(screen.getByText('Ana')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Completado' }));

    expect(screen.getByText('Carlos')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });

  it('navigates on list row click', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ id: 'ev-99', client: { name: 'ListClient', phone: '999' } }),
    ]);

    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    await waitFor(() => {
      expect(screen.getByText('ListClient')).toBeInTheDocument();
    });

    const row = screen.getByRole('button', { name: /Ver detalles del evento/i });
    fireEvent.click(row);
    expect(mockNavigate).toHaveBeenCalledWith('/events/ev-99/summary');
  });

  it('navigates on list row keyboard Enter', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ id: 'ev-88', client: { name: 'KeyClient', phone: '888' } }),
    ]);

    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    await waitFor(() => {
      expect(screen.getByText('KeyClient')).toBeInTheDocument();
    });

    const row = screen.getByRole('button', { name: /Ver detalles del evento/i });
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/events/ev-88/summary');
  });

  it('navigates on list row keyboard Space', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ id: 'ev-77', client: { name: 'SpaceClient', phone: '777' } }),
    ]);

    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    await waitFor(() => {
      expect(screen.getByText('SpaceClient')).toBeInTheDocument();
    });

    const row = screen.getByRole('button', { name: /Ver detalles del evento/i });
    fireEvent.keyDown(row, { key: ' ' });
    expect(mockNavigate).toHaveBeenCalledWith('/events/ev-77/summary');
  });

  it('renders all status labels in list view', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ id: '1', status: 'confirmed', client: { name: 'C1', phone: '1' } }),
      makeEvent({ id: '2', status: 'completed', client: { name: 'C2', phone: '2' } }),
      makeEvent({ id: '3', status: 'cancelled', client: { name: 'C3', phone: '3' } }),
      makeEvent({ id: '4', status: 'quoted', client: { name: 'C4', phone: '4' } }),
    ]);

    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    await waitFor(() => {
      expect(screen.getByText('C1')).toBeInTheDocument();
    });

    // Status labels also appear in filter <option> elements, so use getAllByText
    expect(screen.getAllByText('Confirmado').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Completado').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Cancelado').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Cotizado').length).toBeGreaterThanOrEqual(1);
  });

  it('shows location and time info in list view rows', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({
        id: '1',
        start_time: '09:00',
        end_time: '13:00',
        location: 'Hacienda',
        client: { name: 'T1', phone: '111' },
      }),
    ]);

    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    await waitFor(() => {
      expect(screen.getByText('T1')).toBeInTheDocument();
    });

    expect(screen.getByText('Hacienda')).toBeInTheDocument();
    expect(screen.getByText(/09:00/)).toBeInTheDocument();
  });

  it('shows "--" for missing start/end times in list view', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({
        id: '1',
        start_time: null,
        end_time: null,
        location: null,
        client: { name: 'NoTime', phone: '111' },
      }),
    ]);

    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    await waitFor(() => {
      expect(screen.getByText('NoTime')).toBeInTheDocument();
    });

    expect(screen.getByText('Sin locación')).toBeInTheDocument();
  });

  it('logs error when fetchAllEvents fails', async () => {
    (eventService.getByDateRange as any)
      .mockResolvedValueOnce([]) // initial calendar fetch
      .mockRejectedValueOnce(new Error('list fail')); // list fetch

    renderCalendar();

    await waitFor(() => {
      expect(eventService.getByDateRange).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('CalendarView:fetchAllEvents', expect.any(Error));
    });
  });

  it('switches back from list to calendar view', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([]);

    renderCalendar();

    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    // Empty list shows "No se encontraron eventos" instead of table
    await waitFor(() => {
      expect(screen.getByText('No se encontraron eventos')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en calendario/i }));

    await waitFor(() => {
      expect(screen.getByText('Select')).toBeInTheDocument();
    });
  });

  it('includes selected date in Nuevo Evento link when in calendar mode', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([]);

    renderCalendar();
    fireEvent.click(screen.getByText('Select'));

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Crear nuevo evento' });
      expect(link.getAttribute('href')).toContain('/events/new?date=2024-01-02');
    });
  });

  it('handles null data from getByDateRange gracefully', async () => {
    (eventService.getByDateRange as any).mockResolvedValue(null);

    renderCalendar();
    fireEvent.click(screen.getByText('Select'));

    await waitFor(() => {
      expect(screen.getByText(/No hay eventos para este día/i)).toBeInTheDocument();
    });
  });

  it('shows "Crear uno nuevo" link in calendar empty state', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([]);

    renderCalendar();
    fireEvent.click(screen.getByText('Select'));

    await waitFor(() => {
      const link = screen.getByText('Crear uno nuevo');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', expect.stringContaining('/events/new'));
    });
  });

  it('filters list by search on service_type', async () => {
    (eventService.getByDateRange as any).mockResolvedValue([
      makeEvent({ id: '1', client: { name: 'X', phone: '1' }, service_type: 'Barra de Churros' }),
      makeEvent({ id: '2', client: { name: 'Y', phone: '2' }, service_type: 'Coctel' }),
    ]);

    renderCalendar();
    fireEvent.click(screen.getByRole('button', { name: /Ver eventos en lista/i }));

    await waitFor(() => {
      expect(screen.getByText('X')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Buscar por cliente o servicio/i), { target: { value: 'churros' } });

    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.queryByText('Y')).not.toBeInTheDocument();
  });
});
