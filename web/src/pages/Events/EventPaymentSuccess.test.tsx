import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventPaymentSuccess from './EventPaymentSuccess';
import { eventPaymentService } from '@/services/eventPaymentService';
import { logError } from '@/lib/errorHandler';

let mockParams: { id?: string } = { id: 'event-1' };
let mockSearchParams = new URLSearchParams('session_id=sess_123');

vi.mock('@/services/eventPaymentService', () => ({
  eventPaymentService: { getPaymentSession: vi.fn() },
}));

vi.mock('@/lib/errorHandler', () => ({ logError: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useParams: () => mockParams,
    useSearchParams: () => [mockSearchParams],
  };
});

const renderComponent = () =>
  render(
    <MemoryRouter>
      <EventPaymentSuccess />
    </MemoryRouter>
  );

describe('EventPaymentSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'event-1' };
    mockSearchParams = new URLSearchParams('session_id=sess_123');
  });

  it('shows error when id param is missing', async () => {
    mockParams = {};
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/Información de pago faltante/)).toBeInTheDocument();
    });
  });

  it('shows error when session_id is missing', async () => {
    mockSearchParams = new URLSearchParams('');
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/Información de pago faltante/)).toBeInTheDocument();
    });
  });

  it('renders success view for paid status', async () => {
    (eventPaymentService.getPaymentSession as any).mockResolvedValue({
      session_id: 'sess_123',
      payment_status: 'paid',
      amount_total: 5000,
      customer_email: 'test@example.com',
    });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('¡Pago Exitoso!')).toBeInTheDocument();
    });
    expect(screen.getByText('$5000.00 MXN')).toBeInTheDocument();
    expect(screen.getByText('Pagado')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders pending view for non-paid status', async () => {
    (eventPaymentService.getPaymentSession as any).mockResolvedValue({
      session_id: 'sess_123',
      payment_status: 'unpaid',
      amount_total: 3000,
      customer_email: 'test@example.com',
    });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Pago Pendiente')).toBeInTheDocument();
    });
  });

  it('shows error state on API failure', async () => {
    (eventPaymentService.getPaymentSession as any).mockRejectedValue(new Error('API error'));
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Error al verificar pago')).toBeInTheDocument();
    });
    expect(logError).toHaveBeenCalled();
  });

  it('does not render email when empty', async () => {
    (eventPaymentService.getPaymentSession as any).mockResolvedValue({
      session_id: 'sess_123',
      payment_status: 'paid',
      amount_total: 100,
      customer_email: '',
    });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('¡Pago Exitoso!')).toBeInTheDocument();
    });
    expect(screen.queryByText('Email:')).not.toBeInTheDocument();
  });
});
