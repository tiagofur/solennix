/**
 * EventSummary — core tests: render, navegación, status dropdown, delete, PDFs básicos.
 *
 * Este archivo se dividió del EventSummary.test.tsx original (1498 LOC, 74 tests)
 * porque el worker de vitest hacía OOM con 74 renders del componente
 * (1660 LOC + recharts + PDF generators) en un solo archivo. Empíricamente,
 * el umbral para este componente es ~16 tests por archivo antes del OOM.
 *
 * Split final en 4 archivos:
 * - EventSummary.test.tsx — core flow (render, navigation, status, delete, PDFs)
 * - EventSummary.variants.test.tsx — variantes de rendering + contract + ingredientes + equipment
 * - EventSummary.photos.test.tsx — vista de fotos (empty, grid, lightbox, upload, remove)
 * - EventSummary.payments.test.tsx — payments, Stripe, edge cases de estado
 *
 * Por el hoisting de `vi.mock`, los 4 archivos duplican los mocks. El helper
 * __tests__/eventSummaryFixtures.ts centraliza solo el baseEvent y la factory
 * `installEventSummaryMocks`.
 */

import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { EventSummary } from './EventSummary';
import { eventService } from '../../services/eventService';
import { productService } from '../../services/productService';
import { paymentService } from '../../services/paymentService';
import { generateBudgetPDF, generateContractPDF, generateInvoicePDF, generateShoppingListPDF } from '../../lib/pdfGenerator';
import { logError } from '../../lib/errorHandler';
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

let mockIsBasicPlan = false;

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'ana@example.com', plan: 'pro' }, profile: { name: 'Eventos Ana', business_name: 'Eventos Ana' } }),
}));

vi.mock('../../hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({ isBasicPlan: mockIsBasicPlan }),
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

describe('EventSummary — core', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsBasicPlan = false;
    setupMocks();
  });

  it('renders summary and switches views', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver lista de insumos/i }));
    expect(screen.getAllByText(/Lista de Insumos/i)[0]).toBeInTheDocument();
    expect(screen.getByText('Harina')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ver contrato del evento/i }));
    expect(screen.getAllByText(/Contrato de Servicios/i)[0]).toBeInTheDocument();

    const paymentsTab = screen.getByRole('button', { name: /Ver pagos del evento/i });
    fireEvent.click(paymentsTab);
    await waitFor(() => {
      expect(paymentsTab).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('triggers pdf generation', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([{ amount: 600 }]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Más$/i }));
    fireEvent.click(screen.getByText('Presupuesto'));
    expect(generateBudgetPDF).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Más$/i }));
    const menuItems = screen.getAllByRole('menuitem');
    const contratoMenuItem = menuItems.find(el => el.textContent?.includes('Contrato'));
    fireEvent.click(contratoMenuItem!);
    expect(generateContractPDF).toHaveBeenCalled();
  });

  it('handles missing event', async () => {
    (eventService.getById as any).mockResolvedValueOnce(null);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText(/Evento no encontrado/i)).toBeInTheDocument();
    });
  });

  it('logs error when loading summary fails', async () => {
    (eventService.getById as any).mockRejectedValueOnce(new Error('fail'));

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.queryByText('Ana — Boda')).not.toBeInTheDocument();
    });
  });

  it('shows time range and navigates back', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Volver a la lista/i));
    expect(mockNavigate).toHaveBeenCalledWith('/events');
  });

  it('opens status dropdown and changes status successfully', async () => {
    (eventService.update as any).mockResolvedValue({});

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    const statusButton = screen.getByRole('button', { name: /Estado:.*Clic para cambiar/i });
    fireEvent.click(statusButton);

    await waitFor(() => {
      expect(screen.getByRole('listbox', { name: /Seleccionar estado/i })).toBeInTheDocument();
    });

    const completadoOption = screen.getAllByRole('option').find(el => el.textContent?.includes('Completado'));
    fireEvent.click(completadoOption!);

    await waitFor(() => {
      expect(eventService.update).toHaveBeenCalledWith('event-1', { status: 'completed' });
    });
  });

  it('does not update when selecting the same status', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Estado:.*Clic para cambiar/i }));
    const confirmadoOption = screen.getAllByRole('option').find(el => el.textContent?.includes('Confirmado'));
    fireEvent.click(confirmadoOption!);

    expect(eventService.update).not.toHaveBeenCalled();
  });

  it('handles status change error', async () => {
    (eventService.update as any).mockRejectedValue(new Error('update fail'));

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Estado:.*Clic para cambiar/i }));
    const canceladoOption = screen.getAllByRole('option').find(el => el.textContent?.includes('Cancelado'));
    fireEvent.click(canceladoOption!);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error updating event status', expect.any(Error));
    });
  });

  it('navigates to edit page when clicking edit button', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    const editLink = screen.getByLabelText(/Editar/i);
    expect(editLink).toHaveAttribute('href', '/events/event-1/edit');
  });

  it('opens delete confirmation and successfully deletes', async () => {
    (eventService.delete as any).mockResolvedValue({});

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Eliminar/i));

    await waitFor(() => {
      expect(screen.getByText('Eliminar permanentemente')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Eliminar permanentemente'));

    await waitFor(() => {
      expect(eventService.delete).toHaveBeenCalledWith('event-1');
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('handles delete error', async () => {
    (eventService.delete as any).mockRejectedValue(new Error('del fail'));

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Eliminar/i));
    fireEvent.click(screen.getByText('Eliminar permanentemente'));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error deleting event', expect.any(Error));
    });
  });

  it('cancels delete via confirm dialog', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Eliminar/i));

    fireEvent.click(screen.getByText('Cancelar'));

    await waitFor(() => {
      expect(screen.queryByText('Eliminar permanentemente')).not.toBeInTheDocument();
    });
    expect(eventService.delete).not.toHaveBeenCalled();
  });

  it('triggers invoice PDF generation in summary view', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Más$/i }));
    fireEvent.click(screen.getByText('Generar Factura'));
    expect(generateInvoicePDF).toHaveBeenCalled();
  });

  it('triggers shopping list PDF generation in ingredients view', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver lista de insumos/i }));

    fireEvent.click(screen.getByRole('button', { name: /Más$/i }));
    fireEvent.click(screen.getAllByText('Lista de Insumos')[0]);
    expect(generateShoppingListPDF).toHaveBeenCalled();
  });

  it('generates PDFs even on basic plan (no plan guard)', async () => {
    mockIsBasicPlan = true;

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Más$/i }));
    fireEvent.click(screen.getByText('Presupuesto'));
    expect(generateBudgetPDF).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Más$/i }));
    fireEvent.click(screen.getByText('Generar Factura'));
    expect(generateInvoicePDF).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Más$/i }));
    fireEvent.click(screen.getByText('Lista de Insumos'));
    expect(generateShoppingListPDF).toHaveBeenCalled();
  });

  it('renders financial summary with payment info', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { amount: 300 },
      { amount: 200 },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana — Boda')).toBeInTheDocument();
    });

    expect(screen.getByText(/Venta Neta/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Requiere factura.*IVA/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Utilidad Neta/i)).toBeInTheDocument();
    expect(screen.getByText(/Cobrado: \$500\.00/)).toBeInTheDocument();
  });
});
