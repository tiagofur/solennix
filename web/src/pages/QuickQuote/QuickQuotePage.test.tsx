import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { QuickQuotePage } from './QuickQuotePage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Test User', email: 'test@test.com' } }),
}));

vi.mock('@/services/productService', () => ({
  productService: {
    getAll: vi.fn(() => Promise.resolve([
      { id: 'p1', name: 'Paquete Básico', base_price: 5000, category: 'paquete', is_active: true },
      { id: 'p2', name: 'Paquete Premium', base_price: 10000, category: 'paquete', is_active: true },
    ])),
    getIngredients: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('@/lib/pdfGenerator', () => ({
  generateBudgetPDF: vi.fn(),
}));

vi.mock('@/lib/errorHandler', () => ({
  logError: vi.fn(),
}));

vi.mock('@/pages/Events/components/EventProducts', () => ({
  EventProducts: () => <div data-testid="event-products">EventProducts</div>,
}));

vi.mock('@/pages/Events/components/EventExtras', () => ({
  EventExtras: () => <div data-testid="event-extras">EventExtras</div>,
}));

describe('QuickQuotePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page title', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Cotización Rápida')).toBeInTheDocument();
    });
  });

  it('renders page subtitle', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Arma una cotización sin registrar cliente ni fecha/)).toBeInTheDocument();
    });
  });

  it('renders Exportar PDF button', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Exportar PDF')).toBeInTheDocument();
    });
  });

  it('renders Convertir a Evento button', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Convertir a Evento')).toBeInTheDocument();
    });
  });

  it('disables action buttons when no items selected', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Exportar PDF')).toBeInTheDocument();
    });
    const exportBtn = screen.getByText('Exportar PDF').closest('button')!;
    const convertBtn = screen.getByText('Convertir a Evento').closest('button')!;
    expect(exportBtn).toBeDisabled();
    expect(convertBtn).toBeDisabled();
  });

  it('renders empty state message when no items', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Agrega productos o extras para ver el resumen')).toBeInTheDocument();
    });
  });

  it('renders client info toggle button', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText(/Datos del cliente \(opcional/)).toBeInTheDocument();
    });
  });

  it('renders num people input with default value 100', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Número de Personas')).toBeInTheDocument();
    });
    // Use getByDisplayValue since there are 2 spinbuttons (num_people + discount_value)
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
  });

  it('renders EventProducts component', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId('event-products')).toBeInTheDocument();
    });
  });

  it('renders EventExtras component', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByTestId('event-extras')).toBeInTheDocument();
    });
  });

  it('renders financial summary section', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Resumen')).toBeInTheDocument();
    });
  });

  it('renders discount and invoice section', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Descuento y Facturación')).toBeInTheDocument();
    });
  });

  it('renders financial metrics section', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Métricas de Rentabilidad (Interno)')).toBeInTheDocument();
    });
  });

  it('shows $0.00 totals when no items selected', async () => {
    render(
      <MemoryRouter>
        <QuickQuotePage />
      </MemoryRouter>
    );
    await waitFor(() => {
      // Multiple $0.00 values appear — use getAllByText
      const zeros = screen.getAllByText('$0.00');
      expect(zeros.length).toBeGreaterThanOrEqual(1);
    });
  });
});
