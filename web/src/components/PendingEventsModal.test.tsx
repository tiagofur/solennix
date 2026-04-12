import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@tests/customRender';
import userEvent from '@testing-library/user-event';
import { PendingEventsModal } from './PendingEventsModal';

// Mock eventService (all methods required by useEventQueries)
vi.mock('../services/eventService', () => ({
  eventService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    getByDateRange: vi.fn(),
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

// Mock errorHandler
vi.mock('../lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((error: unknown, defaultMsg?: string) => defaultMsg || 'Error'),
}));

// Mock useToast
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    toasts: [],
  }),
}));

import { eventService } from '../services/eventService';
import { logError } from '../lib/errorHandler';

// Helper to create a past confirmed event
function makePastEvent(overrides: Record<string, unknown> = {}) {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 3);
  const dateStr = pastDate.toISOString().split('T')[0]; // YYYY-MM-DD

  return {
    id: 'event-1',
    user_id: 'user-1',
    client_id: 'client-1',
    event_date: dateStr,
    start_time: null,
    end_time: null,
    service_type: 'Catering',
    num_people: 50,
    status: 'confirmed',
    discount: 0,
    requires_invoice: false,
    tax_rate: 16,
    tax_amount: 0,
    total_amount: 5000,
    location: null,
    city: null,
    deposit_percent: null,
    cancellation_days: null,
    refund_percent: null,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    client: { name: 'Juan Perez' },
    ...overrides,
  };
}

describe('PendingEventsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when there are no pending events', async () => {
    vi.mocked(eventService.getAll).mockResolvedValue([]);

    const { container } = render(<PendingEventsModal />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders nothing when all events have future dates', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent({ event_date: futureDateStr }),
    ] as any);

    const { container } = render(<PendingEventsModal />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders nothing when past events are not confirmed', async () => {
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent({ status: 'completed' }),
      makePastEvent({ id: 'event-2', status: 'cancelled' }),
      makePastEvent({ id: 'event-3', status: 'quoted' }),
    ] as any);

    const { container } = render(<PendingEventsModal />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('shows modal with past confirmed events', async () => {
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent(),
    ] as any);

    render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByText('Eventos Pendientes de Cierre')).toBeInTheDocument();
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Juan Perez/)).toBeInTheDocument();
    expect(screen.getByText(/Catering/)).toBeInTheDocument();
  });

  it('displays correct count of pending events', async () => {
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent({ id: 'event-1' }),
      makePastEvent({ id: 'event-2', client: { name: 'Maria Lopez' }, service_type: 'Banquete' }),
    ] as any);

    render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByText(/2 evento\(s\)/)).toBeInTheDocument();
    });
  });

  it('shows "Sin Cliente" when client is null', async () => {
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent({ client: null }),
    ] as any);

    render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByText(/Sin Cliente/)).toBeInTheDocument();
    });
  });

  it('shows "Sin Cliente" when client has no name', async () => {
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent({ client: undefined }),
    ] as any);

    render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByText(/Sin Cliente/)).toBeInTheDocument();
    });
  });

  it('displays formatted event date in Spanish', async () => {
    // Use a fixed past date
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent({ event_date: '2024-06-15' }),
    ] as any);

    render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByText(/15 de junio, 2024/)).toBeInTheDocument();
    });
  });

  it('renders "Completar" and "Cancelar" action buttons for each event', async () => {
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent(),
    ] as any);

    render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByText('Completar')).toBeInTheDocument();
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });
  });

  it('marks event as completed when "Completar" is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent(),
    ] as any);
    vi.mocked(eventService.update).mockResolvedValue({} as any);

    render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByText('Completar')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Completar'));

    await waitFor(() => {
      expect(eventService.update).toHaveBeenCalledWith('event-1', { status: 'completed' });
    });
  });

  it('marks event as cancelled when "Cancelar" is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent(),
    ] as any);
    vi.mocked(eventService.update).mockResolvedValue({} as any);

    render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByText('Cancelar')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cancelar'));

    await waitFor(() => {
      expect(eventService.update).toHaveBeenCalledWith('event-1', { status: 'cancelled' });
    });
  });

  it('removes event from list after successful status update', async () => {
    const user = userEvent.setup();
    // First call returns both events; after mutation + refetch, first event is completed
    vi.mocked(eventService.getAll)
      .mockResolvedValueOnce([
        makePastEvent({ id: 'event-1', client: { name: 'Juan' } }),
        makePastEvent({ id: 'event-2', client: { name: 'Maria' }, service_type: 'Banquete' }),
      ] as any)
      .mockResolvedValue([
        makePastEvent({ id: 'event-1', client: { name: 'Juan' }, status: 'completed' }),
        makePastEvent({ id: 'event-2', client: { name: 'Maria' }, service_type: 'Banquete' }),
      ] as any);
    vi.mocked(eventService.update).mockResolvedValue({} as any);

    render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByText(/Juan/)).toBeInTheDocument();
      expect(screen.getByText(/Maria/)).toBeInTheDocument();
    });

    // Complete the first event
    const completarButtons = screen.getAllByText('Completar');
    await user.click(completarButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText(/Juan/)).not.toBeInTheDocument();
    });

    // Maria should still be visible
    expect(screen.getByText(/Maria/)).toBeInTheDocument();
  });

  it('closes modal when last event is resolved', async () => {
    const user = userEvent.setup();
    vi.mocked(eventService.getAll)
      .mockResolvedValueOnce([
        makePastEvent(),
      ] as any)
      .mockResolvedValue([
        makePastEvent({ status: 'completed' }),
      ] as any);
    vi.mocked(eventService.update).mockResolvedValue({} as any);

    const { container } = render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByText('Completar')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Completar'));

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('closes modal when clicking "Cerrar por ahora"', async () => {
    const user = userEvent.setup();
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent(),
    ] as any);

    const { container } = render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByText('Cerrar por ahora')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Cerrar por ahora'));

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('closes modal when clicking the X close button', async () => {
    const user = userEvent.setup();
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent(),
    ] as any);

    const { container } = render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByLabelText('Cerrar modal')).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText('Cerrar modal'));

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('closes modal when clicking the overlay backdrop', async () => {
    const user = userEvent.setup();
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent(),
    ] as any);

    const { container } = render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click the overlay (the div with aria-hidden="true")
    const overlay = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    await user.click(overlay);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('handles API error during fetch gracefully', async () => {
    vi.mocked(eventService.getAll).mockRejectedValue(new Error('Network error'));

    const { container } = render(<PendingEventsModal />);

    // React Query will retry by default, but our test client has retry: false
    // The component returns null when loading or no pending events
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('handles API error during status update gracefully', async () => {
    const user = userEvent.setup();
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent(),
    ] as any);
    vi.mocked(eventService.update).mockRejectedValue(new Error('Update failed'));

    render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByText('Completar')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Completar'));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error updating event status', expect.any(Error));
    });

    // Event should still be in the list since update failed
    expect(screen.getByText(/Juan Perez/)).toBeInTheDocument();
  });

  it('disables action buttons while an event is being updated', async () => {
    const user = userEvent.setup();

    // Make update hang (never resolve) to test disabled state
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent(),
    ] as any);
    vi.mocked(eventService.update).mockReturnValue(new Promise(() => {}) as any);

    render(<PendingEventsModal />);

    await waitFor(() => {
      expect(screen.getByText('Completar')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Completar'));

    // Both buttons should be disabled while updating
    await waitFor(() => {
      const completarBtn = screen.getByLabelText(/Marcar evento como completado/);
      const cancelarBtn = screen.getByLabelText(/Marcar evento como cancelado/);
      expect(completarBtn).toBeDisabled();
      expect(cancelarBtn).toBeDisabled();
    });
  });

  it('has correct aria attributes on the modal', async () => {
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent(),
    ] as any);

    render(<PendingEventsModal />);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    });
  });

  it('renders correct aria-labels on action buttons', async () => {
    vi.mocked(eventService.getAll).mockResolvedValue([
      makePastEvent(),
    ] as any);

    render(<PendingEventsModal />);

    await waitFor(() => {
      expect(
        screen.getByLabelText('Marcar evento como completado: Juan Perez - Catering')
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Marcar evento como cancelado: Juan Perez - Catering')
      ).toBeInTheDocument();
    });
  });

  it('handles null data from getAll gracefully', async () => {
    vi.mocked(eventService.getAll).mockResolvedValue(null as any);

    const { container } = render(<PendingEventsModal />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
