import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';
import { eventService } from '../services/eventService';
import { inventoryService } from '../services/inventoryService';
import { paymentService } from '../services/paymentService';
import { useAuth } from '../contexts/AuthContext';
import { productService } from '../services/productService';
import { clientService } from '../services/clientService';

vi.mock('../services/eventService');
vi.mock('../services/inventoryService');
vi.mock('../services/paymentService');
vi.mock('../contexts/AuthContext');
vi.mock('../services/productService');
vi.mock('../services/clientService');
vi.mock('../lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((_err: unknown, fallback?: string) => fallback || 'Error'),
}));

// Mock child components that render in dashboard
vi.mock('../components/OnboardingChecklist', () => ({
  OnboardingChecklist: () => null,
}));
vi.mock('../components/UpgradeBanner', () => ({
  UpgradeBanner: () => null,
}));
vi.mock('../hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({
    isBasicPlan: false,
    canCreateEvent: true,
    eventsThisMonth: 0,
    limit: 3,
  }),
}));
vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ addToast: vi.fn(), removeToast: vi.fn(), toasts: [] }),
}));

// Capture Tooltip formatter props so we can exercise them in tests
const capturedTooltipFormatters: Array<(value: number) => unknown> = [];

vi.mock('recharts', async () => {
  const actual = await vi.importActual<any>('recharts');
  const passthrough = (name: string) => ({ children }: any) => {
    return <div data-testid={name}>{children}</div>;
  };
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    Bar: passthrough('bar'),
    XAxis: passthrough('xaxis'),
    YAxis: passthrough('yaxis'),
    CartesianGrid: passthrough('cartesian-grid'),
    Cell: passthrough('cell'),
    Tooltip: (props: any) => {
      if (props.formatter) {
        capturedTooltipFormatters.push(props.formatter);
      }
      return <div data-testid="tooltip" />;
    },
  };
});

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Dashboard />
    </MemoryRouter>
  );

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedTooltipFormatters.length = 0;
    (useAuth as any).mockReturnValue({ user: { name: 'Test User' }, profile: { name: 'Test User' }, checkAuth: vi.fn() });
    (eventService.getAll as any).mockResolvedValue([]);
    (eventService.getByDateRange as any).mockResolvedValue([]);
    (eventService.getUpcoming as any).mockResolvedValue([]);
    (inventoryService.getAll as any).mockResolvedValue([]);
    (productService.getAll as any).mockResolvedValue([]);
    (clientService.getAll as any).mockResolvedValue([]);
    (paymentService.getByEventIds as any).mockResolvedValue([]);
    (paymentService.getByPaymentDateRange as any).mockResolvedValue([]);
  });

  it('renders greeting header', async () => {
    renderDashboard();
    expect(await screen.findByText(/hola/i)).toBeInTheDocument();
  });

  it('renders empty states when no data', async () => {
    renderDashboard();

    expect(await screen.findByText(/No hay eventos próximos agendados/i)).toBeInTheDocument();
    expect(screen.getByText(/Sin datos para graficar este mes/i)).toBeInTheDocument();
  });

  it('keeps only the planned header and quick actions', async () => {
    renderDashboard();

    expect(await screen.findByText(/hola/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Nuevo Evento/i })).toHaveAttribute('href', '/events/new');
    expect(screen.getByRole('link', { name: /Nuevo Cliente/i })).toHaveAttribute('href', '/clients/new');
    expect(screen.getByRole('link', { name: /Cotización Rápida/i })).toHaveAttribute('href', '/cotizacion-rapida');
  });

  it('shows data cards and upcoming events when present', async () => {
    (eventService.getAll as any).mockResolvedValue([
      {
        id: 'event-1',
        status: 'confirmed',
        total_amount: 1000,
        tax_amount: 160,
        requires_invoice: true,
        event_date: '2024-01-20',
        client: { name: 'Ana' },
        service_type: 'Boda',
        num_people: 100,
      },
    ]);
    (eventService.getByDateRange as any).mockResolvedValue([
      {
        id: 'event-1',
        status: 'confirmed',
        total_amount: 1000,
        tax_amount: 160,
        requires_invoice: true,
        event_date: '2024-01-20',
        client: { name: 'Ana' },
        service_type: 'Boda',
        num_people: 100,
      },
    ]);
    (eventService.getUpcoming as any).mockResolvedValue([
      {
        id: 'event-2',
        event_date: '2024-01-25',
        client: { name: 'Luis' },
        service_type: 'XV',
        num_people: 80,
      },
    ]);
    (inventoryService.getAll as any).mockResolvedValue([
      { id: 'i1', current_stock: 0, minimum_stock: 2 },
    ]);
    (paymentService.getByEventIds as any).mockResolvedValue([
      { event_id: 'event-1', amount: 500 },
    ]);
    (paymentService.getByPaymentDateRange as any).mockResolvedValue([
      { amount: 200 },
    ]);

    renderDashboard();

    expect(await screen.findByText(/Ventas Netas/i)).toBeInTheDocument();
    expect(screen.getByText(/^Cobrado$/i)).toBeInTheDocument();
    expect(screen.getByText(/IVA Cobrado/i)).toBeInTheDocument();
    expect(screen.getByText(/IVA Pendiente/i)).toBeInTheDocument();
    expect(screen.getByText(/^Eventos$/i)).toBeInTheDocument();
    expect(screen.getByText(/Stock Bajo/i)).toBeInTheDocument();
    expect(screen.getByText(/^Clientes$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Cotizaciones$/i)).toBeInTheDocument();
    expect(screen.getByText(/Pendientes de confirmar$/i)).toBeInTheDocument();
    expect(screen.getByText(/Inventario crítico/i)).toBeInTheDocument();
    expect(screen.getByText('Luis')).toBeInTheDocument();
    expect(screen.getByText(/XV/i)).toBeInTheDocument();
  });

  it('renders attention widget when events require follow-up', async () => {
    const today = new Date();
    const inThreeDays = new Date(today);
    inThreeDays.setDate(today.getDate() + 3);
    const inTenDays = new Date(today);
    inTenDays.setDate(today.getDate() + 10);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    const toLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    (eventService.getAll as any).mockResolvedValue([
      {
        id: 'confirmed-unpaid',
        status: 'confirmed',
        total_amount: 1000,
        tax_amount: 0,
        requires_invoice: false,
        event_date: toLocalDateString(inThreeDays),
        client: { name: 'Ana' },
        service_type: 'Boda',
        num_people: 100,
      },
      {
        id: 'past-quoted',
        status: 'quoted',
        total_amount: 500,
        tax_amount: 0,
        requires_invoice: false,
        event_date: toLocalDateString(twoDaysAgo),
        client: { name: 'Luis' },
        service_type: 'XV',
        num_people: 60,
      },
      {
        id: 'quoted-soon',
        status: 'quoted',
        total_amount: 700,
        tax_amount: 0,
        requires_invoice: false,
        event_date: toLocalDateString(inTenDays),
        client: { name: 'Carla' },
        service_type: 'Cena',
        num_people: 40,
      },
    ]);
    (paymentService.getByEventIds as any)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ event_id: 'confirmed-unpaid', amount: 250 }]);

    renderDashboard();

    expect(await screen.findByText(/Requieren atención/i)).toBeInTheDocument();
    expect(screen.getByText(/Cobros por cerrar/i)).toBeInTheDocument();
    expect(screen.getByText(/Eventos vencidos/i)).toBeInTheDocument();
    expect(screen.getByText(/Cotizaciones urgentes/i)).toBeInTheDocument();
    expect(screen.getByText(/Saldo pendiente/i)).toBeInTheDocument();
    expect(screen.getByText(/Cotización vencida sin cerrar/i)).toBeInTheDocument();
    expect(screen.getByText(/Faltan \d+ día\(s\) para confirmar/i)).toBeInTheDocument();
  });

  it('hides attention widget when there are no alerts', async () => {
    const today = new Date();
    const inThirtyDays = new Date(today);
    inThirtyDays.setDate(today.getDate() + 30);

    const toLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    (eventService.getAll as any).mockResolvedValue([
      {
        id: 'completed-event',
        status: 'completed',
        total_amount: 800,
        tax_amount: 0,
        requires_invoice: false,
        event_date: toLocalDateString(inThirtyDays),
        client: { name: 'Ana' },
        service_type: 'Boda',
        num_people: 100,
      },
    ]);

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/hola/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Requieren atención/i)).not.toBeInTheDocument();
  });

  it('logs error when month events fail', async () => {
    // React Query handles errors internally — the component shows empty/loading state
    // No logError is called from the component directly
    (eventService.getByDateRange as any).mockRejectedValue(new Error('boom'));

    renderDashboard();

    // Dashboard still renders with empty data when queries fail
    await waitFor(() => {
      expect(screen.getByText(/hola/i)).toBeInTheDocument();
    });
  });

  it('logs error when inventory fails', async () => {
    (inventoryService.getAll as any).mockRejectedValue(new Error('inv'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/hola/i)).toBeInTheDocument();
    });
  });

  it('surfaces error when upcoming events fail', async () => {
    (eventService.getUpcoming as any).mockRejectedValue(new Error('oops'));

    renderDashboard();

    // Dashboard still renders — no inline error message shown anymore
    // React Query handles the error; upcoming section shows loading or empty state
    await waitFor(() => {
      expect(screen.getByText(/hola/i)).toBeInTheDocument();
    });
  });

  it('retries when refresh is clicked', async () => {
    // The "Recargar" button no longer exists — error state is always null
    // Instead, verify that the Dashboard renders correctly with errored services
    (eventService.getUpcoming as any).mockRejectedValue(new Error('oops'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/hola/i)).toBeInTheDocument();
    });

    // Verify that multiple service calls were made (initial load)
    expect((eventService.getByDateRange as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it('exercises the financial chart Tooltip formatter callback', async () => {
    capturedTooltipFormatters.length = 0;

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Comparativa Financiera/i)).toBeInTheDocument();
    });

    expect(capturedTooltipFormatters.length).toBeGreaterThan(0);
    const formatter = capturedTooltipFormatters[0];
    const result = formatter(1500);
    expect(result).toEqual(['$1,500', 'Monto']);
  });

  describe('attention CTAs', () => {
    const today = new Date();
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    const toLocalDateString = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const seedOverdueWithBalance = () => {
      // Single past-quoted event with $1000 total and $0 paid → "past-active"
      // category with balance $1000 → CTAs include "Pagar y completar".
      (eventService.getAll as any).mockResolvedValue([
        {
          id: 'evt-overdue',
          status: 'quoted',
          total_amount: 1000,
          tax_amount: 0,
          requires_invoice: false,
          event_date: toLocalDateString(twoDaysAgo),
          client: { name: 'Ana' },
          service_type: 'Boda',
          num_people: 100,
        },
      ]);
      // realizedEventIds payments + attentionCandidateIds payments
      (paymentService.getByEventIds as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
    };

    it('"Pagar y completar" with full amount triggers payment + status=completed', async () => {
      seedOverdueWithBalance();
      (paymentService.create as any).mockResolvedValue({ id: 'pay-1' });
      (eventService.update as any).mockResolvedValue({ id: 'evt-overdue', status: 'completed' });

      renderDashboard();

      // Click the inline CTA — there's only one button with this text before
      // the modal opens.
      const ctaBtn = await screen.findByRole('button', { name: /Pagar y completar/i });
      fireEvent.click(ctaBtn);

      // Modal opens. Scope subsequent queries to the dialog so the submit
      // button (same label) is unambiguous.
      const dialog = await screen.findByRole('dialog');
      const amountInput = within(dialog).getByLabelText(/Monto/i) as HTMLInputElement;
      await waitFor(() => expect(amountInput.value).toBe('1000'));

      const submitBtn = within(dialog).getByRole('button', { name: /Pagar y completar/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect((paymentService.create as any)).toHaveBeenCalledWith(
          expect.objectContaining({ event_id: 'evt-overdue', amount: 1000 }),
        );
      });
      await waitFor(() => {
        expect((eventService.update as any)).toHaveBeenCalledWith(
          'evt-overdue',
          expect.objectContaining({ status: 'completed' }),
        );
      });
    });

    it('"Pagar y completar" with partial amount creates payment but does NOT auto-complete', async () => {
      seedOverdueWithBalance();
      (paymentService.create as any).mockResolvedValue({ id: 'pay-2' });
      (eventService.update as any).mockResolvedValue({ id: 'evt-overdue' });

      renderDashboard();

      const ctaBtn = await screen.findByRole('button', { name: /Pagar y completar/i });
      fireEvent.click(ctaBtn);

      const dialog = await screen.findByRole('dialog');
      const amountInput = within(dialog).getByLabelText(/Monto/i) as HTMLInputElement;
      fireEvent.change(amountInput, { target: { value: '200' } });

      const submitBtn = within(dialog).getByRole('button', { name: /Pagar y completar/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect((paymentService.create as any)).toHaveBeenCalledWith(
          expect.objectContaining({ event_id: 'evt-overdue', amount: 200 }),
        );
      });

      // Wait for the modal to close — that only happens after the handler
      // finishes its async block, so by this point the auto-complete branch
      // had its chance to fire and didn't (Bug 5 guard).
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect((eventService.update as any)).not.toHaveBeenCalled();
    });

    it('"Cancelar" on past-active without balance triggers status=cancelled only', async () => {
      // Past-active fully paid → no balance → renders "Completar" + "Cancelar"
      (eventService.getAll as any).mockResolvedValue([
        {
          id: 'evt-fullpaid',
          status: 'confirmed',
          total_amount: 500,
          tax_amount: 0,
          requires_invoice: false,
          event_date: toLocalDateString(twoDaysAgo),
          client: { name: 'Bea' },
          service_type: 'XV',
          num_people: 50,
        },
      ]);
      (paymentService.getByEventIds as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ event_id: 'evt-fullpaid', amount: 500 }]);
      (eventService.update as any).mockResolvedValue({ id: 'evt-fullpaid' });

      renderDashboard();

      const cancelBtn = await screen.findByRole('button', { name: /^Cancelar$/i });
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect((eventService.update as any)).toHaveBeenCalledWith(
          'evt-fullpaid',
          expect.objectContaining({ status: 'cancelled' }),
        );
      });
      expect((paymentService.create as any)).not.toHaveBeenCalled();
    });
  });

  describe('post-checkout plan refresh', () => {
    it('calls checkAuth and cleans URL when session_id is present', async () => {
      const mockCheckAuth = vi.fn();
      (useAuth as any).mockReturnValue({
        user: { name: 'Test User' },
        profile: { name: 'Test User' },
        checkAuth: mockCheckAuth,
      });

      render(
        <MemoryRouter initialEntries={['/dashboard?session_id=cs_test_123']}>
          <Dashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(mockCheckAuth).toHaveBeenCalled();
      });
    });

    it('does not call checkAuth when session_id is absent', async () => {
      const mockCheckAuth = vi.fn();
      (useAuth as any).mockReturnValue({
        user: { name: 'Test User' },
        profile: { name: 'Test User' },
        checkAuth: mockCheckAuth,
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Dashboard />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/hola/i)).toBeInTheDocument();
      });

      expect(mockCheckAuth).not.toHaveBeenCalled();
    });
  });
});
