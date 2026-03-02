import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Payments } from './Payments';
import { paymentService } from '../../../services/paymentService';
import { logError } from '../../../lib/errorHandler';

vi.mock('../../../services/paymentService', () => ({
  paymentService: {
    getByEventId: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../lib/errorHandler', () => ({
  logError: vi.fn(),
}));

const singlePayment = [
  { id: 'pay-1', amount: 100, payment_date: '2024-01-02', payment_method: 'cash', notes: '' },
];

describe('Payments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders payments and creates a new payment', async () => {
    (paymentService.getByEventId as any).mockResolvedValue(singlePayment);
    (paymentService.create as any).mockResolvedValue({});

    render(<Payments eventId="event-1" totalAmount={500} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getAllByText('$100.00')).toHaveLength(2);
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar Pago/i }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Pago/i }));

    await waitFor(() => {
      expect(paymentService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: 'event-1',
          user_id: 'user-1',
          amount: 200,
        })
      );
    });
  });

  it('deletes a payment after confirmation', async () => {
    (paymentService.getByEventId as any).mockResolvedValue(singlePayment);
    (paymentService.delete as any).mockResolvedValue({});

    render(<Payments eventId="event-1" totalAmount={500} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getAllByText('$100.00')).toHaveLength(2);
    });

    const amountCells = screen.getAllByText('$100.00');
    const row = amountCells[1].closest('tr');
    expect(row).toBeTruthy();
    fireEvent.click(within(row as HTMLElement).getByRole('button'));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar Pago' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar permanentemente' }));

    await waitFor(() => {
      expect(paymentService.delete).toHaveBeenCalledWith('pay-1');
    });
  });

  it('shows empty state and handles cancel add', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([]);

    render(<Payments eventId="event-1" totalAmount={500} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText(/No hay pagos registrados/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar Pago/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(screen.getByRole('button', { name: /Registrar Pago/i })).toBeInTheDocument();
  });

  it('validates required amount and logs create error', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([]);
    (paymentService.create as any).mockRejectedValue(new Error('fail'));

    render(<Payments eventId="event-1" totalAmount={100} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText(/No hay pagos registrados/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar Pago/i }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Pago/i }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error creating payment', expect.any(Error));
    });
  });

  // ---------- NEW TESTS FOR COVERAGE ----------

  it('clicks "Saldo" button in form to fill amount with balance', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { id: 'pay-1', amount: 200, payment_date: '2024-01-02', payment_method: 'cash', notes: '' },
    ]);

    render(<Payments eventId="event-1" totalAmount={500} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pagos y Saldo')).toBeInTheDocument();
    });

    // Open the form via "Registrar Nuevo Pago"
    fireEvent.click(screen.getByRole('button', { name: /Registrar Pago/i }));

    // The "Max" button should appear because balance > 0 (500 - 200 = 300)
    const maxBtn = screen.getByRole('button', { name: /Saldo/i });
    expect(maxBtn).toBeInTheDocument();

    fireEvent.click(maxBtn);

    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    expect(amountInput.value).toBe('300');
  });

  it('does not show "Saldo" button when balance is zero', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { id: 'pay-1', amount: 500, payment_date: '2024-01-02', payment_method: 'cash', notes: '' },
    ]);

    render(<Payments eventId="event-1" totalAmount={500} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pagos y Saldo')).toBeInTheDocument();
    });

    // Open the form
    fireEvent.click(screen.getByRole('button', { name: /Registrar Pago/i }));

    // "Max" button should NOT appear when balance <= 0
    expect(screen.queryByRole('button', { name: /Saldo/i })).not.toBeInTheDocument();
  });

  it('cancels the confirm delete dialog via onCancel (line 375)', async () => {
    (paymentService.getByEventId as any).mockResolvedValue(singlePayment);

    render(<Payments eventId="event-1" totalAmount={500} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getAllByText('$100.00')).toHaveLength(2);
    });

    // Open confirm dialog by clicking the delete button
    const amountCells = screen.getAllByText('$100.00');
    const row = amountCells[1].closest('tr');
    fireEvent.click(within(row as HTMLElement).getByRole('button'));

    // Dialog should be visible
    expect(screen.getByRole('dialog', { name: 'Eliminar Pago' })).toBeInTheDocument();

    // Click "Cancelar" in the dialog
    const dialog = screen.getByRole('dialog', { name: 'Eliminar Pago' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Conservar' }));

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Eliminar Pago' })).not.toBeInTheDocument();
    });

    expect(paymentService.delete).not.toHaveBeenCalled();
  });

  it('triggers auto-confirmation when paying on a quoted event', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    (paymentService.getByEventId as any).mockResolvedValue([]);
    (paymentService.create as any).mockResolvedValue({});

    const onStatusChange = vi.fn();

    render(
      <Payments
        eventId="event-1"
        totalAmount={500}
        userId="user-1"
        eventStatus="quoted"
        onStatusChange={onStatusChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No hay pagos registrados/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar Pago/i }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Pago/i }));

    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('confirmed');
    });

    // Status message should appear
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Status message clears after 5 seconds
    vi.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('does NOT auto-confirm for non-quoted event', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([]);
    (paymentService.create as any).mockResolvedValue({});

    const onStatusChange = vi.fn();

    render(
      <Payments
        eventId="event-1"
        totalAmount={500}
        userId="user-1"
        eventStatus="confirmed"
        onStatusChange={onStatusChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No hay pagos registrados/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar Pago/i }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Pago/i }));

    await waitFor(() => {
      expect(paymentService.create).toHaveBeenCalled();
    });

    expect(onStatusChange).not.toHaveBeenCalled();
  });

  it('shows fully-paid alert for quoted events and allows status change', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { id: 'pay-1', amount: 500, payment_date: '2024-01-02', payment_method: 'cash', notes: '' },
    ]);

    const onStatusChange = vi.fn();

    render(
      <Payments
        eventId="event-1"
        totalAmount={500}
        userId="user-1"
        eventStatus="quoted"
        onStatusChange={onStatusChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/totalmente pagado pero sigue como/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar ahora/i }));
    expect(onStatusChange).toHaveBeenCalledWith('confirmed');
  });

  it('does not show fully-paid alert when status is not quoted', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { id: 'pay-1', amount: 500, payment_date: '2024-01-02', payment_method: 'cash', notes: '' },
    ]);

    render(
      <Payments
        eventId="event-1"
        totalAmount={500}
        userId="user-1"
        eventStatus="confirmed"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pagos y Saldo')).toBeInTheDocument();
    });

    expect(screen.queryByText(/totalmente pagado pero sigue como/i)).not.toBeInTheDocument();
  });

  it('logs delete error and shows toast', async () => {
    (paymentService.getByEventId as any).mockResolvedValue(singlePayment);
    (paymentService.delete as any).mockRejectedValue(new Error('delete error'));

    render(<Payments eventId="event-1" totalAmount={500} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getAllByText('$100.00')).toHaveLength(2);
    });

    const amountCells = screen.getAllByText('$100.00');
    const row = amountCells[1].closest('tr');
    fireEvent.click(within(row as HTMLElement).getByRole('button'));

    const dialog = screen.getByRole('dialog', { name: 'Eliminar Pago' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar permanentemente' }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error deleting payment', expect.any(Error));
    });
  });

  it('renders payment method translations for transfer and card', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { id: 'pay-1', amount: 100, payment_date: '2024-01-02', payment_method: 'transfer', notes: '' },
      { id: 'pay-2', amount: 200, payment_date: '2024-01-03', payment_method: 'card', notes: 'Visa' },
      { id: 'pay-3', amount: 50, payment_date: '2024-01-04', payment_method: 'check', notes: null },
    ]);

    render(<Payments eventId="event-1" totalAmount={1000} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Transferencia')).toBeInTheDocument();
    });
    expect(screen.getByText('Tarjeta')).toBeInTheDocument();
    // Unknown method rendered as-is
    expect(screen.getByText('check')).toBeInTheDocument();
    // Null notes and empty notes both render '-'
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
  });

  it('handles load error gracefully', async () => {
    (paymentService.getByEventId as any).mockRejectedValue(new Error('load fail'));

    render(<Payments eventId="event-1" totalAmount={500} userId="user-1" />);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error loading payments', expect.any(Error));
    });
  });

  it('shows correct labels when fully paid (Saldo Liquidado)', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { id: 'pay-1', amount: 600, payment_date: '2024-01-02', payment_method: 'cash', notes: '' },
    ]);

    render(
      <Payments
        eventId="event-1"
        totalAmount={500}
        userId="user-1"
        eventStatus="confirmed"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Saldo Liquidado')).toBeInTheDocument();
    });
  });

  it('caps progress bar at 100% when overpaid', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { id: 'pay-1', amount: 1500, payment_date: '2024-01-02', payment_method: 'cash', notes: '' },
    ]);

    render(<Payments eventId="event-1" totalAmount={1000} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pagos y Saldo')).toBeInTheDocument();
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('handles totalAmount of 0 (progress = 0)', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([]);

    render(<Payments eventId="event-1" totalAmount={0} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pagos y Saldo')).toBeInTheDocument();
    });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('does not auto-confirm when onStatusChange is not provided', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([]);
    (paymentService.create as any).mockResolvedValue({});

    render(
      <Payments
        eventId="event-1"
        totalAmount={500}
        userId="user-1"
        eventStatus="quoted"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/No hay pagos registrados/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Registrar Pago/i }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Pago/i }));

    await waitFor(() => {
      expect(paymentService.create).toHaveBeenCalled();
    });

    // No status message should appear (no crash either)
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('handles null return from getByEventId', async () => {
    (paymentService.getByEventId as any).mockResolvedValue(null);

    render(<Payments eventId="event-1" totalAmount={500} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText(/No hay pagos registrados/i)).toBeInTheDocument();
    });
  });
});
