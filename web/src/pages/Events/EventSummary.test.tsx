import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EventSummary } from './EventSummary';
import { eventService } from '../../services/eventService';
import { productService } from '../../services/productService';
import { paymentService } from '../../services/paymentService';
import { eventPaymentService } from '../../services/eventPaymentService';
import { generateBudgetPDF, generateContractPDF, generateInvoicePDF, generateShoppingListPDF, generatePaymentReportPDF } from '../../lib/pdfGenerator';
import { logError } from '../../lib/errorHandler';
import { api } from '../../lib/api';
import { ContractTemplateError } from '../../lib/contractTemplate';

vi.mock('../../services/eventService', () => ({
  eventService: {
    getById: vi.fn(),
    getProducts: vi.fn(),
    getExtras: vi.fn(),
    getEquipment: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../services/paymentService', () => ({
  paymentService: {
    getByEventId: vi.fn(),
  },
}));

vi.mock('../../services/productService', () => ({
  productService: {
    getIngredientsForProducts: vi.fn(),
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

const baseEvent = {
  id: 'event-1',
  event_date: '2024-01-02',
  service_type: 'Boda',
  num_people: 100,
  status: 'confirmed',
  total_amount: 1000,
  tax_amount: 160,
  requires_invoice: true,
  tax_rate: 16,
  client: { name: 'Ana', phone: '555', email: 'ana@test.com', address: 'Calle 1', city: 'CDMX' },
  start_time: '10:00',
  end_time: '12:00',
  location: 'Salón Principal',
  city: 'CDMX',
  deposit_percent: 50,
  cancellation_days: 15,
  refund_percent: 0,
};

const setupMocks = (eventOverrides: Record<string, any> = {}) => {
  (eventService.getById as any).mockResolvedValue({ ...baseEvent, ...eventOverrides });
  (eventService.getProducts as any).mockResolvedValue([
    { product_id: 'p1', quantity: 2, unit_price: 100, products: { name: 'Churros' } },
  ]);
  (eventService.getExtras as any).mockResolvedValue([
    { description: 'Transporte', price: 50, cost: 20 },
  ]);
  (eventService.getEquipment as any).mockResolvedValue([]);
  (paymentService.getByEventId as any).mockResolvedValue([]);
  (productService.getIngredientsForProducts as any).mockResolvedValue([
    { product_id: 'p1', inventory_id: 'i1', quantity_required: 1, ingredient_name: 'Harina', unit: 'kg', unit_cost: 2 },
  ]);
};

describe('EventSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsBasicPlan = false;
    setupMocks();
  });

  it('renders summary and switches views', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver lista de insumos/i }));
    expect(screen.getAllByText(/Lista de Insumos/i)[0]).toBeInTheDocument();
    expect(screen.getByText('Harina')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('Contrato')[0]);
    expect(screen.getAllByText(/Contrato de Servicios/i)[0]).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ver pagos del evento/i }));
    expect(screen.getByText('PAYMENTS_VIEW')).toBeInTheDocument();
  });

  it('triggers pdf generation', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Open Acciones dropdown and click Presupuesto
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    fireEvent.click(screen.getByText('Presupuesto'));
    expect(generateBudgetPDF).toHaveBeenCalled();

    // Open Acciones dropdown and click Contrato (menuitem, not the tab)
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    const menuItems = screen.getAllByText('Contrato');
    const contratoMenuItem = menuItems.find(el => el.closest('[role="menuitem"]')) || menuItems[menuItems.length - 1];
    fireEvent.click(contratoMenuItem);
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
      expect(logError).toHaveBeenCalledWith('Error loading summary', expect.any(Error));
    });
  });

  it('shows time range and navigates back', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('10:00 - 12:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  // ---------- NEW TESTS FOR COVERAGE ----------

  it('opens status dropdown and changes status successfully', async () => {
    (eventService.update as any).mockResolvedValue({});

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Open status dropdown
    const statusButton = screen.getByRole('button', { name: /Estado del evento/i });
    fireEvent.click(statusButton);

    // Should show status menu items
    await waitFor(() => {
      expect(screen.getByRole('menu', { name: /Cambiar estado/i })).toBeInTheDocument();
    });

    // Click on "Completado"
    fireEvent.click(screen.getByRole('menuitem', { name: /Cambiar estado a Completado/i }));

    await waitFor(() => {
      expect(eventService.update).toHaveBeenCalledWith('event-1', { status: 'completed' });
    });
  });

  it('does not update when selecting the same status', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Open dropdown and click confirmed (current status)
    fireEvent.click(screen.getByRole('button', { name: /Estado del evento/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Cambiar estado a Confirmado/i }));

    expect(eventService.update).not.toHaveBeenCalled();
  });

  it('handles status change error', async () => {
    (eventService.update as any).mockRejectedValue(new Error('update fail'));

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Estado del evento/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Cambiar estado a Cancelado/i }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error updating status', expect.any(Error));
    });
  });

  it('navigates to edit page when clicking edit button', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Editar este evento/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/events/event-1/edit');
  });

  it('opens delete confirmation and successfully deletes', async () => {
    (eventService.delete as any).mockResolvedValue({});

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Open Acciones dropdown and click Eliminar Evento
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    fireEvent.click(screen.getByText('Eliminar Evento'));

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Eliminar permanentemente')).toBeInTheDocument();
    });

    // Confirm deletion
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
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Open Acciones dropdown and click Eliminar Evento
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    fireEvent.click(screen.getByText('Eliminar Evento'));
    fireEvent.click(screen.getByText('Eliminar permanentemente'));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error deleting event', expect.any(Error));
    });
  });

  it('cancels delete via confirm dialog', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Open Acciones dropdown and click Eliminar Evento
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    fireEvent.click(screen.getByText('Eliminar Evento'));

    fireEvent.click(screen.getByText('Cancelar'));

    await waitFor(() => {
      expect(screen.queryByText('Eliminar permanentemente')).not.toBeInTheDocument();
    });
    expect(eventService.delete).not.toHaveBeenCalled();
  });

  it('triggers invoice PDF generation in summary view', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Open Acciones dropdown and click Generar Factura
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    fireEvent.click(screen.getByText('Generar Factura'));
    expect(generateInvoicePDF).toHaveBeenCalled();
  });

  it('triggers shopping list PDF generation in ingredients view', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Switch to ingredients view
    fireEvent.click(screen.getByRole('button', { name: /Ver lista de insumos/i }));

    // Open Acciones dropdown and click Lista de Insumos
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    fireEvent.click(screen.getAllByText('Lista de Insumos')[0]);
    expect(generateShoppingListPDF).toHaveBeenCalled();
  });

  it('generates PDFs even on basic plan (no plan guard)', async () => {
    mockIsBasicPlan = true;

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Budget PDF
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    fireEvent.click(screen.getByText('Presupuesto'));
    expect(generateBudgetPDF).toHaveBeenCalled();

    // Invoice PDF — re-open dropdown since it closes after each action
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    fireEvent.click(screen.getByText('Generar Factura'));
    expect(generateInvoicePDF).toHaveBeenCalled();

    // Shopping list PDF
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
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
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Financial summary labels
    expect(screen.getByText('Venta Bruta')).toBeInTheDocument();
    expect(screen.getByText('IVA')).toBeInTheDocument();
    expect(screen.getByText('Total Cobrado')).toBeInTheDocument();
    expect(screen.getByText('Pagado')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Costos')).toBeInTheDocument();
    expect(screen.getByText('Utilidad Neta')).toBeInTheDocument();
    expect(screen.getByText('Margen')).toBeInTheDocument();

    // Paid amount: 300 + 200 = $500.00 (appears in both "Total Pagado" and "Faltante por Pagar")
    expect(screen.getAllByText('$500.00').length).toBeGreaterThanOrEqual(1);
  });

  it('renders event without time range', async () => {
    setupMocks({ start_time: null, end_time: null });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // "Horario:" should not appear when no time range
    expect(screen.queryByText('Horario:')).not.toBeInTheDocument();
  });

  it('renders event with only start_time', async () => {
    setupMocks({ start_time: '15:00', end_time: null });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('Horario')).toBeInTheDocument();
    // Component shows "No definido" when either start_time or end_time is null
    expect(screen.getByText('No definido')).toBeInTheDocument();
  });

  it('renders event with location', async () => {
    setupMocks({ location: 'Hacienda del Sol' });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('Hacienda del Sol')).toBeInTheDocument();
  });

  it('renders event without location', async () => {
    setupMocks({ location: null });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.queryByText('Ubicación:')).not.toBeInTheDocument();
  });

  it('renders event with requires_invoice false', async () => {
    setupMocks({ requires_invoice: false });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Factura: No requiere factura
    expect(screen.getByText('No requiere factura')).toBeInTheDocument();
  });

  it('renders contract view with all details', async () => {
    setupMocks({
      city: 'Guadalajara',
      refund_percent: 25,
      client: { name: 'Ana', phone: '555', email: 'ana@test.com', address: 'Calle 123', city: 'Guadalajara' },
    });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Contrato')[0]);

    // Contract renders with data from template
    expect(screen.getByText('Contrato de Servicios')).toBeInTheDocument();
    // Contract text contains client name, service type, refund percent
    expect(screen.getByText(/El Cliente: Ana/)).toBeInTheDocument();
    expect(screen.getByText(/25%/)).toBeInTheDocument();
  });

  it('shows missing data warning in contract when city is null', async () => {
    setupMocks({ city: null, client: { name: 'Ana', phone: '555', email: 'ana@test.com', address: 'Calle 1' } });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Contrato')[0]);

    // With missing tokens (city, client_city), strict mode shows error
    expect(screen.getByText(/Faltan datos para renderizar el contrato/)).toBeInTheDocument();
  });

  it('renders "Sin extras" when no extras exist', async () => {
    (eventService.getExtras as any).mockResolvedValue([]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('Sin extras agregados')).toBeInTheDocument();
  });

  it('renders "no ingredients" message when none calculated', async () => {
    (eventService.getProducts as any).mockResolvedValue([]);
    (productService.getIngredientsForProducts as any).mockResolvedValue([]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver lista de insumos/i }));

    expect(screen.getByText(/No hay insumos calculados/)).toBeInTheDocument();
  });

  it('renders footer with business name', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getByText(/Generado por Eventos Ana/)).toBeInTheDocument();
  });

  it('aggregates ingredients from multiple products with the same inventory_id', async () => {
    (eventService.getProducts as any).mockResolvedValue([
      { product_id: 'p1', quantity: 2, unit_price: 100, products: { name: 'Churros' } },
      { product_id: 'p2', quantity: 3, unit_price: 80, products: { name: 'Waffles' } },
    ]);
    (productService.getIngredientsForProducts as any).mockResolvedValue([
      { product_id: 'p1', inventory_id: 'i1', quantity_required: 0.5, ingredient_name: 'Harina', unit: 'kg', unit_cost: 10 },
      { product_id: 'p2', inventory_id: 'i1', quantity_required: 0.3, ingredient_name: 'Harina', unit: 'kg', unit_cost: 10 },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver lista de insumos/i }));

    // Total quantity: (0.5 * 2) + (0.3 * 3) = 1.0 + 0.9 = 1.90
    expect(screen.getByText('1.90')).toBeInTheDocument();
  });

  it('uses inventory fallback fields for ingredient data', async () => {
    (productService.getIngredientsForProducts as any).mockResolvedValue([
      {
        product_id: 'p1',
        inventory_id: 'i1',
        quantity_required: 1,
        ingredient_name: undefined,
        unit: undefined,
        unit_cost: undefined,
        inventory: { ingredient_name: 'Azucar', unit: 'g', unit_cost: 5 },
      },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver lista de insumos/i }));

    expect(screen.getByText('Azucar')).toBeInTheDocument();
    expect(screen.getByText('g')).toBeInTheDocument();
  });

  it('handles null products and extras from API', async () => {
    (eventService.getProducts as any).mockResolvedValue(null);
    (eventService.getExtras as any).mockResolvedValue(null);
    (paymentService.getByEventId as any).mockResolvedValue(null);
    (productService.getIngredientsForProducts as any).mockResolvedValue([]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('Sin extras agregados')).toBeInTheDocument();
  });

  it('closes status dropdown on outside click', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /Estado del evento/i }));
    expect(screen.getByRole('menu', { name: /Cambiar estado/i })).toBeInTheDocument();

    // Click outside (document click)
    fireEvent.click(document);

    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: /Cambiar estado/i })).not.toBeInTheDocument();
    });
  });

  it('renders all four statuses in the dropdown', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Estado del evento/i }));

    expect(screen.getByRole('menuitem', { name: /Cambiar estado a Cotizado/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Cambiar estado a Confirmado/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Cambiar estado a Completado/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Cambiar estado a Cancelado/i })).toBeInTheDocument();
  });

  it('renders event with quoted status by default', async () => {
    setupMocks({ status: 'quoted' });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Cotizado').length).toBeGreaterThanOrEqual(1);
  });

  it('shows missing data warning when event location is null', async () => {
    setupMocks({
      location: null,
      client: { name: 'Ana', phone: '555', email: 'ana@test.com', address: 'Av. Reforma 100', city: 'CDMX' },
    });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Contrato')[0]);

    // Location token is missing, strict mode shows error
    expect(screen.getByText(/Faltan datos para renderizar el contrato/)).toBeInTheDocument();
  });

  it('shows missing data warning when location and address are missing', async () => {
    setupMocks({
      location: null,
      client: { name: 'Ana', phone: '555', email: 'ana@test.com' },
    });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Contrato')[0]);

    // Multiple missing tokens, strict mode shows error
    expect(screen.getByText(/Faltan datos para renderizar el contrato/)).toBeInTheDocument();
  });

  it('shows contract template text in contract view', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Contrato')[0]);

    // Contract view shows rendered template text with resolved values
    expect(screen.getByText('Contrato de Servicios')).toBeInTheDocument();
    expect(screen.getByText(/dedicada a Boda/)).toBeInTheDocument();
  });

  it('shows deposit percent and cancellation days in contract', async () => {
    setupMocks({ deposit_percent: 30, cancellation_days: 10 });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Contrato')[0]);

    // Contract text contains deposit and cancellation values
    expect(screen.getByText(/30%/)).toBeInTheDocument();
    expect(screen.getByText(/10 días/)).toBeInTheDocument();
  });

  // ---------- ADDITIONAL COVERAGE TESTS ----------

  it('renders equipment section when equipment is present', async () => {
    (eventService.getEquipment as any).mockResolvedValue([
      { equipment_name: 'Proyector', quantity: 2, notes: 'Con cables HDMI' },
      { equipment_name: 'Mesas', quantity: 10, notes: '' },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
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
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('Equipo Asignado')).toBeInTheDocument();
    expect(screen.getByText('Equipo')).toBeInTheDocument();
  });

  it('shows photos tab and empty state in photos view', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    expect(screen.getByText('Fotos del Evento')).toBeInTheDocument();
    expect(screen.getByText('No hay fotos del evento.')).toBeInTheDocument();
    expect(screen.getByText('Agrega fotos para documentar tu trabajo.')).toBeInTheDocument();
    expect(screen.getByText('Agregar Fotos')).toBeInTheDocument();
  });

  it('renders photos from event data and shows photo grid', async () => {
    setupMocks({ photos: JSON.stringify(['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']) });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    expect(screen.getByAltText('Foto 1 del evento')).toBeInTheDocument();
    expect(screen.getByAltText('Foto 2 del evento')).toBeInTheDocument();
    // Photo count badge on the tab
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders photos from event data when photos is already an array', async () => {
    setupMocks({ photos: ['https://example.com/a.jpg'] });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    expect(screen.getByAltText('Foto 1 del evento')).toBeInTheDocument();
  });

  it('handles malformed photos JSON gracefully', async () => {
    setupMocks({ photos: '{not valid json' });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    // Falls back to empty photos
    expect(screen.getByText('No hay fotos del evento.')).toBeInTheDocument();
  });

  it('opens lightbox when clicking a photo and closes it', async () => {
    setupMocks({ photos: JSON.stringify(['https://example.com/photo1.jpg']) });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    // Click the photo to open lightbox
    fireEvent.click(screen.getByAltText('Foto 1 del evento'));

    // Lightbox dialog appears
    expect(screen.getByRole('dialog', { name: /Vista ampliada/i })).toBeInTheDocument();
    expect(screen.getByAltText('Foto ampliada del evento')).toBeInTheDocument();

    // Close lightbox
    fireEvent.click(screen.getByRole('button', { name: /Cerrar vista ampliada/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Vista ampliada/i })).not.toBeInTheDocument();
    });
  });

  it('closes lightbox by clicking the overlay', async () => {
    setupMocks({ photos: JSON.stringify(['https://example.com/photo1.jpg']) });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));
    fireEvent.click(screen.getByAltText('Foto 1 del evento'));

    // Click the dialog overlay to close
    fireEvent.click(screen.getByRole('dialog', { name: /Vista ampliada/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /Vista ampliada/i })).not.toBeInTheDocument();
    });
  });

  it('uploads photos successfully', async () => {
    (api.postFormData as any).mockResolvedValue({ url: 'https://example.com/uploaded.jpg' });
    (eventService.update as any).mockResolvedValue({});

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    // Simulate file input change
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['photo-data'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 }); // 1KB
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(api.postFormData).toHaveBeenCalledWith('/uploads/image', expect.any(FormData));
    });

    await waitFor(() => {
      expect(eventService.update).toHaveBeenCalledWith('event-1', { photos: expect.any(String) });
    });
  });

  it('rejects oversized photos during upload', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const bigFile = new File(['x'], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(bigFile, 'size', { value: 11 * 1024 * 1024 }); // 11MB > 10MB limit

    fireEvent.change(fileInput, { target: { files: [bigFile] } });

    // Should not call API for oversized file
    await waitFor(() => {
      expect(api.postFormData).not.toHaveBeenCalled();
    });
  });

  it('handles photo upload error', async () => {
    (api.postFormData as any).mockRejectedValue(new Error('upload failed'));

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['photo'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error uploading event photos', expect.any(Error));
    });
  });

  it('removes a photo successfully', async () => {
    setupMocks({ photos: JSON.stringify(['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']) });
    (eventService.update as any).mockResolvedValue({});

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    // Click the remove button on the first photo
    fireEvent.click(screen.getByRole('button', { name: /Eliminar foto 1/i }));

    await waitFor(() => {
      expect(eventService.update).toHaveBeenCalledWith('event-1', {
        photos: JSON.stringify(['https://example.com/photo2.jpg']),
      });
    });
  });

  it('handles photo removal error', async () => {
    setupMocks({ photos: JSON.stringify(['https://example.com/photo1.jpg']) });
    (eventService.update as any).mockRejectedValue(new Error('remove failed'));

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));
    fireEvent.click(screen.getByRole('button', { name: /Eliminar foto 1/i }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error removing photo', expect.any(Error));
    });
  });

  it('shows payment progress bar when totalCharged > 0', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { amount: 400 },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('Progreso de Cobro')).toBeInTheDocument();
    // Shows paid/total
    expect(screen.getByText(/Cobrado: \$400\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Total: \$1,?000\.00/)).toBeInTheDocument();
  });

  it('shows "Registrar pago" button when remaining > 0 and not cancelled', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { amount: 200 },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Should show the register payment button with remaining amount
    expect(screen.getByText(/Registrar pago por/)).toBeInTheDocument();
  });

  it('does not show "Registrar pago" button when event is cancelled', async () => {
    setupMocks({ status: 'cancelled' });
    (paymentService.getByEventId as any).mockResolvedValue([
      { amount: 200 },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Registrar pago por/)).not.toBeInTheDocument();
  });

  it('does not show "Registrar pago" button when fully paid', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { amount: 1000 },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Registrar pago por/)).not.toBeInTheDocument();
  });

  it('shows Stripe payment button in actions when remaining > 0', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { amount: 200 },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));

    expect(screen.getByText('Cobro en Línea')).toBeInTheDocument();
    expect(screen.getByText('Pagar con Stripe')).toBeInTheDocument();
  });

  it('does not show Stripe payment button when cancelled', async () => {
    setupMocks({ status: 'cancelled' });
    (paymentService.getByEventId as any).mockResolvedValue([
      { amount: 200 },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));

    expect(screen.queryByText('Pagar con Stripe')).not.toBeInTheDocument();
  });

  it('handles Stripe payment click successfully', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { amount: 200 },
    ]);
    (eventPaymentService.createCheckoutSession as any).mockResolvedValue({ url: 'https://stripe.com/pay' });

    // Mock window.location.href
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    fireEvent.click(screen.getByText('Pagar con Stripe'));

    await waitFor(() => {
      expect(eventPaymentService.createCheckoutSession).toHaveBeenCalledWith('event-1');
    });

    // Restore
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('handles Stripe payment error', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { amount: 200 },
    ]);
    (eventPaymentService.createCheckoutSession as any).mockRejectedValue(new Error('stripe fail'));

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    fireEvent.click(screen.getByText('Pagar con Stripe'));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error creating checkout session', expect.any(Error));
    });
  });

  it('triggers payment report PDF when in payments view with payments', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { amount: 300 },
      { amount: 200 },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Switch to payments view
    fireEvent.click(screen.getByRole('button', { name: /Ver pagos del evento/i }));

    // Open actions menu
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));

    // Reporte de Pagos should be available
    expect(screen.getByText('Reporte de Pagos')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Reporte de Pagos'));

    expect(generatePaymentReportPDF).toHaveBeenCalled();
  });

  it('does not show payment report option when not in payments view', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { amount: 300 },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Stay in summary view, open actions
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));

    expect(screen.queryByText('Reporte de Pagos')).not.toBeInTheDocument();
  });

  it('handles contract PDF generation error with ContractTemplateError', async () => {
    const templateError = new ContractTemplateError('Missing tokens', [], ['event_city', 'client_address']);
    (generateContractPDF as any).mockImplementation(() => { throw templateError; });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Open Acciones dropdown and click Contrato (menuitem)
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    const menuItems = screen.getAllByText('Contrato');
    const contratoMenuItem = menuItems.find(el => el.closest('[role="menuitem"]')) || menuItems[menuItems.length - 1];
    fireEvent.click(contratoMenuItem);

    // Should NOT close the dropdown (since the error is caught)
    // The toast is called with the error message
    // The function was called and threw
    expect(generateContractPDF).toHaveBeenCalled();
  });

  it('handles contract PDF generation with generic error', async () => {
    (generateContractPDF as any).mockImplementation(() => { throw new Error('generic error'); });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    const menuItems = screen.getAllByText('Contrato');
    const contratoMenuItem = menuItems.find(el => el.closest('[role="menuitem"]')) || menuItems[menuItems.length - 1];
    fireEvent.click(contratoMenuItem);

    expect(generateContractPDF).toHaveBeenCalled();
  });

  it('renders ingredient stock status with "needs more" and "OK"', async () => {
    (productService.getIngredientsForProducts as any).mockResolvedValue([
      { product_id: 'p1', inventory_id: 'i1', quantity_required: 5, ingredient_name: 'Harina', unit: 'kg', unit_cost: 10, inventory: { current_stock: 2 } },
      { product_id: 'p1', inventory_id: 'i2', quantity_required: 1, ingredient_name: 'Azúcar', unit: 'kg', unit_cost: 8, inventory: { current_stock: 100 } },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver lista de insumos/i }));

    // Harina needs more (5*2 = 10 required > 2 in stock) → "Comprar" link
    expect(screen.getByText('Comprar')).toBeInTheDocument();
    // Azúcar is OK (1*2 = 2 required < 100 in stock) → "OK"
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('renders payment progress bar at 100% when fully paid', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { amount: 1000 },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('Progreso de Cobro')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clicking "Registrar pago" switches to payments view', async () => {
    (paymentService.getByEventId as any).mockResolvedValue([
      { amount: 200 },
    ]);

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Registrar pago por/));

    // Should switch to payments view
    expect(screen.getByText('PAYMENTS_VIEW')).toBeInTheDocument();
  });

  it('renders event with completed status', async () => {
    setupMocks({ status: 'completed' });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Completado').length).toBeGreaterThanOrEqual(1);
  });

  it('renders event with cancelled status', async () => {
    setupMocks({ status: 'cancelled' });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getAllByText('Cancelado').length).toBeGreaterThanOrEqual(1);
  });

  it('renders event without client phone', async () => {
    setupMocks({ client: { name: 'Ana', phone: null, email: 'ana@test.com', address: 'Calle 1', city: 'CDMX' } });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('Sin teléfono')).toBeInTheDocument();
  });

  it('renders margin as 0% when net sales are 0', async () => {
    setupMocks({ total_amount: 0, tax_amount: 0 });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('closes actions dropdown on outside click', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Open actions dropdown
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    expect(screen.getByText('Presupuesto')).toBeInTheDocument();

    // Click outside
    fireEvent.click(document);

    await waitFor(() => {
      expect(screen.queryByText('Exportar PDF')).not.toBeInTheDocument();
    });
  });

  it('clicking "Agregar Fotos" triggers the file input', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.click(screen.getByText('Agregar Fotos'));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it('clicking the lightbox image does not close the lightbox (stopPropagation)', async () => {
    setupMocks({ photos: JSON.stringify(['https://example.com/photo1.jpg']) });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));
    fireEvent.click(screen.getByAltText('Foto 1 del evento'));

    // Lightbox should be open
    expect(screen.getByRole('dialog', { name: /Vista ampliada/i })).toBeInTheDocument();

    // Click the lightbox image itself (should not close due to stopPropagation)
    fireEvent.click(screen.getByAltText('Foto ampliada del evento'));

    // Lightbox should still be open
    expect(screen.getByRole('dialog', { name: /Vista ampliada/i })).toBeInTheDocument();
  });

  it('shows uploading state when photo upload is in progress', async () => {
    // Make the upload take a while by creating a delayed promise
    let resolveUpload: (value: { url: string }) => void;
    (api.postFormData as any).mockImplementation(() => new Promise((resolve) => { resolveUpload = resolve; }));

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Ver fotos del evento/i }));

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['photo'], 'test.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Should show uploading state
    await waitFor(() => {
      expect(screen.getByText('Subiendo...')).toBeInTheDocument();
    });

    // Resolve to clean up
    resolveUpload!({ url: 'https://example.com/uploaded.jpg' });
    (eventService.update as any).mockResolvedValue({});

    await waitFor(() => {
      expect(screen.queryByText('Subiendo...')).not.toBeInTheDocument();
    });
  });

  it('logs error when ingredient aggregation fails', async () => {
    (productService.getIngredientsForProducts as any).mockRejectedValue(new Error('ingredient fail'));

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error aggregating ingredients', expect.any(Error));
    });
  });

  it('clicking Resumen tab switches back to summary from another view', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Switch to contract view
    fireEvent.click(screen.getByRole('button', { name: /Ver contrato del evento/i }));
    expect(screen.getByText('Contrato de Servicios')).toBeInTheDocument();

    // Switch back to summary
    fireEvent.click(screen.getByRole('button', { name: /Ver resumen del evento/i }));

    // Summary view content should be visible
    expect(screen.getByText('Resumen Financiero')).toBeInTheDocument();
  });
});
