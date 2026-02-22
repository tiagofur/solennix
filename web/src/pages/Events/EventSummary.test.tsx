import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EventSummary } from './EventSummary';
import { eventService } from '../../services/eventService';
import { productService } from '../../services/productService';
import { generateBudgetPDF, generateContractPDF } from '../../lib/pdfGenerator';
import { logError } from '../../lib/errorHandler';

vi.mock('../../services/eventService', () => ({
  eventService: {
    getById: vi.fn(),
    getProducts: vi.fn(),
    getExtras: vi.fn(),
    getPayments: vi.fn(),
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
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'ana@example.com' }, profile: { name: 'Eventos Ana', business_name: 'Eventos Ana' } }),
}));

vi.mock('./components/Payments', () => ({
  Payments: () => <div>PAYMENTS_VIEW</div>,
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
}));

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useParams: () => ({ id: 'event-1' }), useNavigate: () => mockNavigate };
});

describe('EventSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (eventService.getById as any).mockResolvedValue({
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
    });
    (eventService.getProducts as any).mockResolvedValue([
      {
        product_id: 'p1',
        quantity: 2,
        unit_price: 100,
        products: { name: 'Churros' },
      },
    ]);
    (eventService.getExtras as any).mockResolvedValue([
      { description: 'Transporte', price: 50, cost: 20 },
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (eventService as any).getPayments = vi.fn().mockResolvedValue([]);
    (productService.getIngredientsForProducts as any).mockResolvedValue([
      { product_id: 'p1', inventory_id: 'i1', quantity_required: 1, ingredient_name: 'Harina', unit: 'kg', unit_cost: 2 },
    ]);
  });

  it('renders summary and switches views', async () => {
    render(<EventSummary />);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Compras/i }));
    expect(screen.getAllByText(/Lista de Compras/i)[0]).toBeInTheDocument();
    expect(screen.getByText('Harina')).toBeInTheDocument();
    expect(screen.getByText('kg')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('Contrato')[0]);
    expect(screen.getAllByText(/Contrato de Servicios/i)[0]).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Pagos/i }));
    expect(screen.getByText('PAYMENTS_VIEW')).toBeInTheDocument();
  });

  it('triggers pdf generation', async () => {
    render(<EventSummary />);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Presupuesto/i }));
    expect(generateBudgetPDF).toHaveBeenCalled();

    // Switch to contrato view to reveal the download button
    fireEvent.click(screen.getAllByText('Contrato')[0]);
    
    fireEvent.click(screen.getByTitle('Descargar Contrato en PDF'));
    expect(generateContractPDF).toHaveBeenCalled();
  });

  it('handles missing event', async () => {
    (eventService.getById as any).mockResolvedValueOnce(null);

    render(<EventSummary />);

    await waitFor(() => {
      expect(screen.getByText(/Evento no encontrado/i)).toBeInTheDocument();
    });
  });

  it('logs error when loading summary fails', async () => {
    (eventService.getById as any).mockRejectedValueOnce(new Error('fail'));

    render(<EventSummary />);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error loading summary', expect.any(Error));
    });
  });

  it('shows time range and navigates back', async () => {
    render(<EventSummary />);

    await waitFor(() => {
      expect(screen.getByText('Ana - Boda')).toBeInTheDocument();
    });

    expect(screen.getByText('10:00 - 12:00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Volver/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
