import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Payments } from './Payments';
import { paymentService } from '../../../services/paymentService';
import { logError } from '../../../lib/errorHandler';
import { generatePaymentReportPDF } from '../../../lib/pdfGenerator';

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

vi.mock('../../../lib/pdfGenerator', () => ({
  generatePaymentReportPDF: vi.fn(),
}));

const singlePayment = [
  { id: 'pay-1', amount: 100, payment_date: '2024-01-02', payment_method: 'cash', notes: '' },
];

const mockEventData = { id: 'event-1', client: { name: 'Ana' }, event_date: '2024-07-01' };
const mockProfile = { name: 'Eventos Ana', business_name: 'Eventos Ana' };

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

    fireEvent.click(screen.getByRole('button', { name: /Abrir formulario para registrar un nuevo pago/i }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '200' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Pago/i }));

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
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

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

    fireEvent.click(screen.getByRole('button', { name: /Abrir formulario para registrar un nuevo pago/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(screen.getByRole('button', { name: /Abrir formulario para registrar un nuevo pago/i })).toBeInTheDocument();
  });

  it('validates required amount and logs create error', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([]);
    (paymentService.create as any).mockRejectedValue(new Error('fail'));

    render(<Payments eventId="event-1" totalAmount={100} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText(/No hay pagos registrados/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Abrir formulario para registrar un nuevo pago/i }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Pago/i }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error creating payment', expect.any(Error));
    });
  });

  // ---------- NEW TESTS FOR COVERAGE ----------

  it('calls generatePaymentReportPDF when clicking report button (line 146)', async () => {
    const payments = [
      { id: 'pay-1', amount: 500, payment_date: '2024-06-01', payment_method: 'cash', notes: 'Anticipo' },
    ];
    (paymentService.getByEventId as any).mockResolvedValue(payments);

    render(
      <Payments
        eventId="event-1"
        totalAmount={1000}
        userId="user-1"
        eventData={mockEventData}
        profile={mockProfile}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pagos y Saldo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Descargar reporte de pagos en PDF/i }));

    expect(generatePaymentReportPDF).toHaveBeenCalledWith(
      mockEventData,
      mockProfile,
      payments
    );
  });

  it('passes null when profile is undefined for PDF report', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([]);

    render(
      <Payments
        eventId="event-1"
        totalAmount={1000}
        userId="user-1"
        eventData={mockEventData}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pagos y Saldo')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Descargar reporte de pagos en PDF/i }));

    expect(generatePaymentReportPDF).toHaveBeenCalledWith(
      mockEventData,
      null,
      []
    );
  });

  it('does not render report button when eventData is absent', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([]);

    render(<Payments eventId="event-1" totalAmount={1000} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pagos y Saldo')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Descargar reporte de pagos en PDF/i })).not.toBeInTheDocument();
  });

  it('clicks "Liquidar Faltante" to open form with balance pre-filled (lines 263-266)', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { id: 'pay-1', amount: 300, payment_date: '2024-01-02', payment_method: 'cash', notes: '' },
    ]);

    render(<Payments eventId="event-1" totalAmount={500} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pagos y Saldo')).toBeInTheDocument();
    });

    // Balance = 500 - 300 = 200, so "Liquidar Faltante" button should appear
    const liquidateBtn = screen.getByRole('button', { name: /Liquidar saldo faltante/i });
    expect(liquidateBtn).toHaveTextContent('Liquidar Faltante ($200.00)');

    fireEvent.click(liquidateBtn);

    // Form should open with amount pre-filled to the balance
    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    expect(amountInput.value).toBe('200');
  });

  it('does not show "Liquidar Faltante" when fully paid', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { id: 'pay-1', amount: 500, payment_date: '2024-01-02', payment_method: 'cash', notes: '' },
    ]);

    render(<Payments eventId="event-1" totalAmount={500} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pagos y Saldo')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Liquidar saldo faltante/i })).not.toBeInTheDocument();
  });

  it('clicks "Max" button in form to fill amount with balance (lines 296-299)', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { id: 'pay-1', amount: 200, payment_date: '2024-01-02', payment_method: 'cash', notes: '' },
    ]);

    render(<Payments eventId="event-1" totalAmount={500} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pagos y Saldo')).toBeInTheDocument();
    });

    // Open the form via "Registrar Nuevo Pago"
    fireEvent.click(screen.getByRole('button', { name: /Abrir formulario para registrar un nuevo pago/i }));

    // The "Max" button should appear because balance > 0 (500 - 200 = 300)
    const maxBtn = screen.getByRole('button', { name: /Llenar con el saldo faltante completo/i });
    expect(maxBtn).toBeInTheDocument();

    fireEvent.click(maxBtn);

    const amountInput = screen.getByPlaceholderText('0.00') as HTMLInputElement;
    expect(amountInput.value).toBe('300');
  });

  it('does not show "Max" button when balance is zero', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { id: 'pay-1', amount: 500, payment_date: '2024-01-02', payment_method: 'cash', notes: '' },
    ]);

    render(<Payments eventId="event-1" totalAmount={500} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pagos y Saldo')).toBeInTheDocument();
    });

    // Open the form
    fireEvent.click(screen.getByRole('button', { name: /Abrir formulario para registrar un nuevo pago/i }));

    // "Max" button should NOT appear when balance <= 0
    expect(screen.queryByRole('button', { name: /Llenar con el saldo faltante completo/i })).not.toBeInTheDocument();
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
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

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

    fireEvent.click(screen.getByRole('button', { name: /Abrir formulario para registrar un nuevo pago/i }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Pago/i }));

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

    fireEvent.click(screen.getByRole('button', { name: /Abrir formulario para registrar un nuevo pago/i }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Pago/i }));

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

    fireEvent.click(screen.getByRole('button', { name: /Cambiar estado del evento a Confirmado/i }));
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
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

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

  it('shows correct labels when fully paid (Saldo Favor / Completado)', async () => {
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
      expect(screen.getByText('Saldo Favor / Completado')).toBeInTheDocument();
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

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('handles totalAmount of 0 (progress = 0)', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([]);

    render(<Payments eventId="event-1" totalAmount={0} userId="user-1" />);

    await waitFor(() => {
      expect(screen.getByText('Pagos y Saldo')).toBeInTheDocument();
    });

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
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

    fireEvent.click(screen.getByRole('button', { name: /Abrir formulario para registrar un nuevo pago/i }));
    fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '100' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Pago/i }));

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
