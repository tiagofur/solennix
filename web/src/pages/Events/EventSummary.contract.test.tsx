/**
 * EventSummary — tests de integración del contract view.
 *
 * La lógica del parser de templates vive en contractTemplate.test.ts.
 * Este archivo solo cubre que el componente llama bien al renderer y
 * maneja los estados de warning / render completo. Se mantiene corto
 * (5 tests) por el leak de memoria del componente que hace OOM al
 * worker con 20+ renders.
 *
 * Ver EventSummary.test.tsx (core) para contexto sobre el split.
 */

import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { EventSummary } from './EventSummary';
import { eventService } from '../../services/eventService';
import { productService } from '../../services/productService';
import { paymentService } from '../../services/paymentService';
import { installEventSummaryMocks } from './__tests__/eventSummaryFixtures';

const mockAddToast = vi.fn();

vi.mock('../../services/eventService', () => ({
  eventService: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    getByDateRange: vi.fn().mockResolvedValue([]),
    getByClientId: vi.fn().mockResolvedValue([]),
    getUpcoming: vi.fn().mockResolvedValue([]),
    getProducts: vi.fn(),
    getExtras: vi.fn(),
    getEquipment: vi.fn(),
    getSupplies: vi.fn(),
    getEventPhotos: vi.fn().mockResolvedValue([]),
    addEventPhoto: vi.fn(),
    deleteEventPhoto: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateItems: vi.fn(),
    delete: vi.fn(),
    checkEquipmentConflicts: vi.fn().mockResolvedValue([]),
    getEquipmentSuggestions: vi.fn().mockResolvedValue([]),
    getSupplySuggestions: vi.fn().mockResolvedValue([]),
    addProducts: vi.fn(),
    updateProducts: vi.fn(),
    updateExtras: vi.fn(),
  },
}));

vi.mock('../../services/paymentService', () => ({
  paymentService: {
    getAll: vi.fn().mockResolvedValue([]),
    getByEventId: vi.fn(),
    getByEventIds: vi.fn().mockResolvedValue([]),
    getByPaymentDateRange: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../services/productService', () => ({
  productService: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    getIngredients: vi.fn().mockResolvedValue([]),
    getIngredientsForProducts: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    uploadImage: vi.fn(),
    addIngredients: vi.fn(),
    updateIngredients: vi.fn(),
  },
}));

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../services/clientService', () => ({
  clientService: {
    getAll: vi.fn().mockResolvedValue([]),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    uploadPhoto: vi.fn(),
  },
}));

vi.mock('../../services/subscriptionService', () => ({
  subscriptionService: {
    getStatus: vi.fn().mockResolvedValue({ plan: 'pro', has_stripe_account: false }),
  },
}));

vi.mock('../../lib/pdfGenerator', () => ({
  generateBudgetPDF: vi.fn(),
  generateContractPDF: vi.fn(),
  generateInvoicePDF: vi.fn(),
  generateShoppingListPDF: vi.fn(),
  generatePaymentReportPDF: vi.fn(),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'ana@example.com', plan: 'pro' }, profile: { name: 'Eventos Ana', business_name: 'Eventos Ana' } }),
}));

vi.mock('../../hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({ isBasicPlan: false }),
}));

vi.mock('./components/Payments', () => ({
  Payments: () => <div>PAYMENTS_VIEW</div>,
}));

vi.mock('../../services/eventPaymentService', () => ({
  eventPaymentService: {
    createCheckoutSession: vi.fn(),
  },
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((_err: unknown, fallback?: string) => fallback || 'Error'),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    addToast: mockAddToast,
    removeToast: vi.fn(),
    toasts: [],
  }),
}));

vi.mock('../../lib/api', () => ({
  api: {
    postFormData: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useParams: () => ({ id: 'event-1' }), useNavigate: () => vi.fn() };
});

const mockedServices = { eventService, paymentService, productService } as any;
const setupMocks = (overrides: Record<string, any> = {}) =>
  installEventSummaryMocks(mockedServices, overrides);

describe('EventSummary — contract view', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddToast.mockReset();
    setupMocks();
  });

  it('renders contract view with all details', async () => {
    setupMocks({
      city: 'Guadalajara',
      refund_percent: 25,
      client: { name: 'Ana', phone: '555', email: 'ana@test.com', address: 'Calle 123', city: 'Guadalajara' },
    });
    (paymentService.getByEventId as any).mockResolvedValue([{ amount: 600 }]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Ver contrato del evento|Ver contrato/i));

    expect(screen.getByText('Contrato de Servicios')).toBeInTheDocument();
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  it('renders contract view when city is null', async () => {
    setupMocks({ city: null, client: { name: 'Ana', phone: '555', email: 'ana@test.com', address: 'Calle 1' } });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Ver contrato del evento|Ver contrato/i));

    expect(screen.getByText('Contrato de Servicios')).toBeInTheDocument();
    expect(mockAddToast).not.toHaveBeenCalled();
  });

  // TODO(contract-freeze-web): pre-existing fail — looks for /dedicada a Boda/
  // which isn't in the current default contract template. Pre-existing because
  // hidden by worker crash. Fix: check the current default template text in
  // src/lib/contractTemplate.ts and update the expectation.
  it('shows contract template text in contract view', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([{ amount: 600 }]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver contrato del evento/i }));

    expect(screen.getByText('Contrato de Servicios')).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/empresa dedicada a Boda/i);
  });

  // TODO(contract-freeze-web): pre-existing fail — looks for /30%/ which may
  // be rendered as "30 %" (with space) or a different format in the current
  // template. Same root cause as "shows contract template text".
  it('shows deposit percent and cancellation days in contract', async () => {
    setupMocks({ deposit_percent: 30, cancellation_days: 10 });
    (paymentService.getByEventId as any).mockResolvedValue([{ amount: 600 }]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver contrato del evento/i }));

    expect(document.body.textContent).toMatch(/30\s*%/);
    expect(document.body.textContent).toMatch(/10\s*d[ií]as/i);
  });
});
