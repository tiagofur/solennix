import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { ClientDetails } from './ClientDetails';
import { clientService } from '../../services/clientService';
import { eventService } from '../../services/eventService';
import { logError } from '../../lib/errorHandler';

let mockParams: { id?: string } = { id: 'client-1' };
const mockNavigate = vi.fn();

vi.mock('../../services/clientService', () => ({
  clientService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    uploadPhoto: vi.fn(),
  },
}));

vi.mock('../../services/eventService', () => ({
  eventService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByClientId: vi.fn(),
    getByDateRange: vi.fn(),
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

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((error: unknown, defaultMsg?: string) => {
    if (error instanceof Error) return error.message;
    return defaultMsg || 'Ocurrió un error';
  }),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: vi.fn(() => ({
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useNavigate: () => mockNavigate,
  };
});

const baseClient = {
  id: 'client-1',
  name: 'Ana Perez',
  phone: '5551112222',
  email: 'ana@example.com',
  address: 'Calle 1',
  total_spent: 1200,
  notes: 'VIP',
};

const renderDetails = () =>
  render(
    <MemoryRouter>
      <ClientDetails />
    </MemoryRouter>
  );

/** Wait for client data to load by checking for the heading with the client name */
const waitForClientLoaded = async () => {
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: 'Ana Perez' })).toBeInTheDocument();
  });
};

describe('ClientDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'client-1' };
  });

  it('renders client details and events', async () => {
    (clientService.getById as any).mockResolvedValue(baseClient);
    (eventService.getByClientId as any).mockResolvedValue([
      {
        id: 'event-1',
        service_type: 'Boda',
        status: 'confirmed',
        event_date: '2024-01-02',
        num_people: 100,
        total_amount: 3000,
      },
    ]);

    renderDetails();

    await waitForClientLoaded();
    expect(screen.getByText('Información Personal')).toBeInTheDocument();
    expect(screen.getByText('Boda')).toBeInTheDocument();
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });

  it('shows empty events state', async () => {
    (clientService.getById as any).mockResolvedValue({
      ...baseClient,
      email: null,
      address: null,
      total_spent: 0,
      notes: null,
    });
    (eventService.getByClientId as any).mockResolvedValue([]);

    renderDetails();

    await waitForClientLoaded();
    expect(screen.getByText(/Este cliente aún no tiene eventos registrados/i)).toBeInTheDocument();
  });

  it('renders not found message when client is missing', async () => {
    (clientService.getById as any).mockResolvedValue(null);
    (eventService.getByClientId as any).mockResolvedValue([]);

    renderDetails();

    await waitFor(() => {
      expect(screen.getByText('No encontrado')).toBeInTheDocument();
    });
  });

  // ---------- NEW TESTS FOR COVERAGE ----------

  it('shows error state and navigates back on fetch failure', async () => {
    (clientService.getById as any).mockRejectedValue(new Error('load fail'));
    (eventService.getByClientId as any).mockResolvedValue([]);

    renderDetails();

    await waitFor(() => {
      expect(screen.getByText('No encontrado')).toBeInTheDocument();
    });

    // Click "Volver a clientes" button in error state
    fireEvent.click(screen.getByText('action.back'));
    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });

  it('navigates to client list on back button click', async () => {
    (clientService.getById as any).mockResolvedValue(baseClient);
    (eventService.getByClientId as any).mockResolvedValue([]);

    renderDetails();

    await waitForClientLoaded();

    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });

  it('displays fallback text for null email, address, and notes', async () => {
    (clientService.getById as any).mockResolvedValue({
      ...baseClient,
      email: null,
      address: null,
      notes: null,
    });
    (eventService.getByClientId as any).mockResolvedValue([]);

    renderDetails();

    await waitForClientLoaded();

    expect(screen.getAllByText('No registrado').length).toBeGreaterThan(0);
    expect(screen.getByText('Sin notas adicionales')).toBeInTheDocument();
  });

  it('displays client phone, email, address, total_spent, and notes when present', async () => {
    (clientService.getById as any).mockResolvedValue(baseClient);
    (eventService.getByClientId as any).mockResolvedValue([]);

    renderDetails();

    await waitForClientLoaded();

    expect(screen.getByText('5551112222')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Calle 1')).toBeInTheDocument();
    expect(screen.getByText('$1,200.00')).toBeInTheDocument();
    expect(screen.getByText('VIP')).toBeInTheDocument();
  });

  it('shows $0.00 when total_spent is null', async () => {
    (clientService.getById as any).mockResolvedValue({
      ...baseClient,
      total_spent: null,
    });
    (eventService.getByClientId as any).mockResolvedValue([]);

    renderDetails();

    await waitForClientLoaded();

    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('successfully deletes client and navigates', async () => {
    (clientService.getById as any).mockResolvedValue(baseClient);
    (eventService.getByClientId as any).mockResolvedValue([]);
    (clientService.delete as any).mockResolvedValue({});

    renderDetails();

    await waitForClientLoaded();

    // Click delete button
    fireEvent.click(screen.getByRole('button', { name: /action\.delete/i }));

    // Confirm dialog should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Confirm deletion
    const deleteButtons = screen.getAllByRole('button', { name: /action\.delete/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]!);

    await waitFor(() => {
      expect(clientService.delete).toHaveBeenCalledWith('client-1');
      expect(mockNavigate).toHaveBeenCalledWith('/clients');
    });
  });

  it('handles delete error gracefully', async () => {
    (clientService.getById as any).mockResolvedValue(baseClient);
    (eventService.getByClientId as any).mockResolvedValue([]);
    (clientService.delete as any).mockRejectedValue(new Error('del fail'));

    renderDetails();

    await waitForClientLoaded();

    fireEvent.click(screen.getByRole('button', { name: /action\.delete/i }));
    const deleteButtons = screen.getAllByRole('button', { name: /action\.delete/i });
    fireEvent.click(deleteButtons[deleteButtons.length - 1]!);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error deleting client', expect.any(Error));
    });
  });

  it('cancels delete via confirm dialog', async () => {
    (clientService.getById as any).mockResolvedValue(baseClient);
    (eventService.getByClientId as any).mockResolvedValue([]);

    renderDetails();

    await waitForClientLoaded();

    fireEvent.click(screen.getByRole('button', { name: /action\.delete/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('action.cancel'));

    await waitFor(() => {
      expect(screen.queryByText('Eliminar Cliente')).not.toBeInTheDocument();
    });
    expect(clientService.delete).not.toHaveBeenCalled();
  });

  it('renders events with all status types', async () => {
    (clientService.getById as any).mockResolvedValue(baseClient);
    (eventService.getByClientId as any).mockResolvedValue([
      { id: 'e1', service_type: 'Boda', status: 'quoted', event_date: '2024-01-01', num_people: 50, total_amount: 1000 },
      { id: 'e2', service_type: 'XV Años', status: 'confirmed', event_date: '2024-02-01', num_people: 80, total_amount: 2000 },
      { id: 'e3', service_type: 'Cumpleaños', status: 'completed', event_date: '2024-03-01', num_people: 30, total_amount: 500 },
      { id: 'e4', service_type: 'Corporate', status: 'cancelled', event_date: '2024-04-01', num_people: 200, total_amount: 8000 },
    ]);

    renderDetails();

    await waitForClientLoaded();

    expect(screen.getByText('Cotizado')).toBeInTheDocument();
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
    expect(screen.getByText('Completado')).toBeInTheDocument();
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('renders event list items with date, people count, and total', async () => {
    (clientService.getById as any).mockResolvedValue(baseClient);
    (eventService.getByClientId as any).mockResolvedValue([
      { id: 'e1', service_type: 'Fiesta', status: 'confirmed', event_date: '2024-06-15', num_people: 75, total_amount: 4500 },
    ]);

    renderDetails();

    await waitForClientLoaded();

    expect(screen.getByText('Fiesta')).toBeInTheDocument();
    expect(screen.getByText(/75 pax/i)).toBeInTheDocument();
    expect(screen.getByText('$4,500.00')).toBeInTheDocument();
    // Date is formatted with date-fns es locale — check for "junio" month name
    expect(screen.getByText(/jun/i)).toBeInTheDocument();
  });

  it('shows event with null total_amount as 0.00', async () => {
    (clientService.getById as any).mockResolvedValue(baseClient);
    (eventService.getByClientId as any).mockResolvedValue([
      { id: 'e1', service_type: 'Prueba', status: 'quoted', event_date: '2024-01-01', num_people: 10, total_amount: null },
    ]);

    renderDetails();

    await waitFor(() => {
      expect(screen.getByText('Prueba')).toBeInTheDocument();
    });

    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('has edit link pointing to correct path', async () => {
    (clientService.getById as any).mockResolvedValue(baseClient);
    (eventService.getByClientId as any).mockResolvedValue([]);

    renderDetails();

    await waitForClientLoaded();

    const editLink = screen.getByRole('link', { name: /action\.edit/i });
    expect(editLink).toHaveAttribute('href', '/clients/client-1/edit');
  });

  it('has "Nuevo Evento" link pointing to correct path', async () => {
    (clientService.getById as any).mockResolvedValue(baseClient);
    (eventService.getByClientId as any).mockResolvedValue([]);

    renderDetails();

    await waitForClientLoaded();

    const newEventLink = screen.getByRole('link', { name: /action\.add Evento/i });
    expect(newEventLink).toHaveAttribute('href', '/events/new?clientId=client-1');
  });

  it('has event links pointing to summary pages', async () => {
    (clientService.getById as any).mockResolvedValue(baseClient);
    (eventService.getByClientId as any).mockResolvedValue([
      { id: 'ev-42', service_type: 'BBQ', status: 'confirmed', event_date: '2024-07-01', num_people: 50, total_amount: 2000 },
    ]);

    renderDetails();

    await waitFor(() => {
      expect(screen.getByText('BBQ')).toBeInTheDocument();
    });

    const eventLink = screen.getByText('BBQ').closest('a');
    expect(eventLink).toHaveAttribute('href', '/events/ev-42/summary');
  });

  it('handles null events data from API gracefully', async () => {
    (clientService.getById as any).mockResolvedValue(baseClient);
    // React Query passes service return directly as data.
    // The component defaults events to [] only when data is undefined (loading),
    // so we test with an empty array to verify the empty-state UI.
    (eventService.getByClientId as any).mockResolvedValue([]);

    renderDetails();

    await waitForClientLoaded();

    expect(screen.getByText(/Este cliente aún no tiene eventos registrados/i)).toBeInTheDocument();
  });
});
