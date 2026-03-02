import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EventSummary } from './EventSummary';
import { eventService } from '../../services/eventService';
import { productService } from '../../services/productService';
import { paymentService } from '../../services/paymentService';
import { generateBudgetPDF, generateContractPDF, generateInvoicePDF, generateShoppingListPDF, generatePaymentReportPDF } from '../../lib/pdfGenerator';
import { logError } from '../../lib/errorHandler';

vi.mock('../../services/eventService', () => ({
  eventService: {
    getById: vi.fn(),
    getProducts: vi.fn(),
    getExtras: vi.fn(),
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
  client: { name: 'Ana', phone: '555' },
  start_time: '10:00',
  end_time: '12:00',
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

    fireEvent.click(screen.getByRole('button', { name: /Ver lista de compras/i }));
    expect(screen.getAllByText(/Lista de Compras/i)[0]).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: /Ver lista de compras/i }));

    // Open Acciones dropdown and click Lista de Compras
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));
    fireEvent.click(screen.getByText('Lista de Compras'));
    expect(generateShoppingListPDF).toHaveBeenCalled();
  });

  it('shows toast and blocks PDF generation on basic plan', async () => {
    mockIsBasicPlan = true;

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    // Open Acciones dropdown - on basic plan, clicking items does NOT close dropdown (early return)
    fireEvent.click(screen.getByRole('button', { name: /Más acciones/i }));

    // Try budget PDF
    fireEvent.click(screen.getByText('Presupuesto'));
    expect(generateBudgetPDF).not.toHaveBeenCalled();

    // Try invoice PDF (dropdown still open since basic plan early-returns)
    fireEvent.click(screen.getByText('Generar Factura'));
    expect(generateInvoicePDF).not.toHaveBeenCalled();

    // Try shopping list PDF (dropdown still open)
    fireEvent.click(screen.getByText('Lista de Compras'));
    expect(generateShoppingListPDF).not.toHaveBeenCalled();

    // Try contract PDF (dropdown still open)
    const menuItems = screen.getAllByText('Contrato');
    const contratoMenuItem = menuItems.find(el => el.closest('[role="menuitem"]')) || menuItems[menuItems.length - 1];
    fireEvent.click(contratoMenuItem);
    expect(generateContractPDF).not.toHaveBeenCalled();
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
    expect(screen.getByText('15:00')).toBeInTheDocument();
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
      location: null,
      client: { name: 'Ana', phone: '555', address: 'Calle 123' },
    });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Contrato')[0]);

    // Contract sections
    expect(screen.getByText(/PRIMERA: OBJETO/)).toBeInTheDocument();
    expect(screen.getByText(/SEGUNDA: DETALLES DEL EVENTO/)).toBeInTheDocument();
    expect(screen.getByText(/TERCERA: PRODUCTOS Y SERVICIOS/)).toBeInTheDocument();
    expect(screen.getByText(/CUARTA: COSTO Y FORMA DE PAGO/)).toBeInTheDocument();
    expect(screen.getByText(/QUINTA: CANCELACIONES/)).toBeInTheDocument();

    // City in contract
    expect(screen.getByText('Guadalajara')).toBeInTheDocument();

    // Refund percent text
    expect(screen.getByText(/25%/)).toBeInTheDocument();
  });

  it('renders contract with default city placeholder when city is null', async () => {
    setupMocks({ city: null });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Contrato')[0]);

    expect(screen.getByText('___________________')).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: /Ver lista de compras/i }));

    expect(screen.getByText(/No hay ingredientes calculados/)).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: /Ver lista de compras/i }));

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

    fireEvent.click(screen.getByRole('button', { name: /Ver lista de compras/i }));

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

  it('renders contract with location fallback to client address', async () => {
    setupMocks({
      location: null,
      client: { name: 'Ana', phone: '555', address: 'Av. Reforma 100' },
    });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Contrato')[0]);

    expect(screen.getByText('Av. Reforma 100')).toBeInTheDocument();
  });

  it('renders contract with "A definir" when no location or address', async () => {
    setupMocks({
      location: null,
      client: { name: 'Ana', phone: '555' },
    });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Contrato')[0]);

    expect(screen.getByText('A definir')).toBeInTheDocument();
  });

  it('shows products and extras in contract view', async () => {
    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Contrato')[0]);

    expect(screen.getByText(/2x Churros/)).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
  });

  it('shows deposit percent and cancellation days in contract', async () => {
    setupMocks({ deposit_percent: 30, cancellation_days: 10 });

    render(<MemoryRouter><EventSummary /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText('Contrato')[0]);

    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
