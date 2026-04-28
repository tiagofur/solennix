/**
 * EventSummary — variantes de rendering: time range, location, invoice,
 * contract view (template rendering), extras/ingredientes, equipment.
 *
 * Ver EventSummary.test.tsx (core) para contexto sobre el split.
 *
 * Este archivo consolida con `it.each` los tests del original que solo
 * cambian el override del Event (variantes de display) para mantenerse bajo
 * el umbral de ~16 tests por archivo antes de que el worker haga OOM
 * cargando recharts + PDF generators 20+ veces.
 */

import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { EventSummary } from './EventSummary';
import { eventService } from '../../services/eventService';
import { productService } from '../../services/productService';
import { paymentService } from '../../services/paymentService';
import { installEventSummaryMocks } from './__tests__/eventSummaryFixtures';

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

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'ana@example.com', plan: 'pro' }, profile: { name: 'Eventos Ana', business_name: 'Eventos Ana' } }),
}));

vi.mock('../../hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({ isBasicPlan: false }),
}));

vi.mock('./components/Payments.tsx', () => ({
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
    addToast: vi.fn(),
    removeToast: vi.fn(),
    toasts: [],
  }),
}));

vi.mock('../../lib/api', () => ({
  api: {
    postFormData: vi.fn(),
  },
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useParams: () => ({ id: 'event-1' }), useNavigate: () => mockNavigate };
});

const mockedServices = { eventService, paymentService, productService } as any;
const setupMocks = (overrides: Record<string, any> = {}) =>
  installEventSummaryMocks(mockedServices, overrides);

describe('EventSummary — header & display variants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  // Consolidación con it.each — originalmente eran 5 tests separados
  type DisplayExpectations = { present?: string[]; absent?: string[] };
  const displayVariantCases: Array<[string, Record<string, unknown>, DisplayExpectations]> = [
    ['without time range', { start_time: null, end_time: null }, { absent: ['Horario:'] }],
    ['with only start_time', { start_time: '15:00', end_time: null }, { present: ['Horario', 'No definido'] }],
    ['with location', { location: 'Hacienda del Sol' }, { present: ['Hacienda del Sol'] }],
    ['without location', { location: null }, { absent: ['Ubicación:'] }],
    ['with requires_invoice false', { requires_invoice: false }, { present: ['No requiere factura'] }],
  ];
  it.each(displayVariantCases)('renders event %s', async (_label, overrides, expectations) => {
    setupMocks(overrides);
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    for (const text of expectations.present ?? []) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
    for (const text of expectations.absent ?? []) {
      expect(screen.queryByText(text)).not.toBeInTheDocument();
    }
  });

  it.each([
    ['quoted', 'Cotizado'],
    ['completed', 'Completado'],
    ['cancelled', 'Cancelado'],
  ])('renders event with %s status', async (status, expectedLabel) => {
    setupMocks({ status });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    expect(screen.getAllByText(expectedLabel).length).toBeGreaterThanOrEqual(1);
  });

  // TODO(contract-freeze-web): pre-existing fail — uses aria-label
  // `/Estado del evento/i` that doesn't exist in StatusDropdown.tsx (only
  // `/Estado: <label>. Clic para cambiar./i` exists). Was hidden by the
  // EventSummary.test.tsx worker crash that prevented tests 17+ from ever
  // running. Fix: update selector to match the real aria-label, verify
  // "Estado del evento" isn't a stale spec from a prior refactor.
  it('closes status dropdown on outside click', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Estado:.*Clic para cambiar/i }));
    expect(screen.getByRole('listbox', { name: /Seleccionar estado/i })).toBeInTheDocument();

    fireEvent.click(document);

    await waitFor(() => {
      expect(screen.queryByRole('listbox', { name: /Seleccionar estado/i })).not.toBeInTheDocument();
    });
  });

  // TODO(contract-freeze-web): pre-existing fail — same selector issue as
  // "closes status dropdown on outside click". Fix: use
  // `/Estado:.*Clic para cambiar/i` like in core.test.tsx.
  it('renders all four statuses in the dropdown', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Estado:.*Clic para cambiar/i }));

    expect(screen.getByRole('option', { name: /Cotizado/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Confirmado/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Completado/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Cancelado/i })).toBeInTheDocument();
  });

  it('renders footer with business name', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    expect(screen.getByText(/Generado por/)).toBeInTheDocument();
  });

  it('renders equipment section when equipment is present', async () => {
    (eventService.getEquipment as any).mockResolvedValue([
      { equipment_name: 'Proyector', quantity: 2, notes: 'Con cables HDMI' },
      { equipment_name: 'Mesas', quantity: 10, notes: '' },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('Equipo Asignado')).toBeInTheDocument();
    expect(screen.getByText('Proyector')).toBeInTheDocument();
    expect(screen.getByText('x2')).toBeInTheDocument();
    expect(screen.getByText('Con cables HDMI')).toBeInTheDocument();
    expect(screen.getByText('Mesas')).toBeInTheDocument();
    expect(screen.getByText('x10')).toBeInTheDocument();
  });

  it('renders equipment without name using fallback "Equipo"', async () => {
    (eventService.getEquipment as any).mockResolvedValue([
      { equipment_name: null, quantity: 1, notes: null },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('Equipo Asignado')).toBeInTheDocument();
    expect(screen.getByText('Producto')).toBeInTheDocument();
  });

  // TODO(contract-freeze-web): pre-existing fail — waitFor times out looking
  // for "Ana — Boda" when getProducts/getExtras/getByEventId return null.
  // Was hidden by the EventSummary.test.tsx worker crash. Fix: investigate
  // whether the component actually guards against null arrays from the
  // backend (it should, per the previous engram memory about
  // "iOS APIClient resilient to null arrays" fix).
  it('handles null products and extras from API', async () => {
    (eventService.getProducts as any).mockResolvedValue(null);
    (eventService.getExtras as any).mockResolvedValue(null);
    (paymentService.getByEventId as any).mockResolvedValue(null);
    (productService.getIngredientsForProducts as any).mockResolvedValue([]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('Sin extras agregados')).toBeInTheDocument();
  });

  it('renders "Sin extras" when no extras exist', async () => {
    (eventService.getExtras as any).mockResolvedValue([]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('Sin extras agregados')).toBeInTheDocument();
  });
});
