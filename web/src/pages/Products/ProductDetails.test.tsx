import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { ProductDetails } from './ProductDetails';
import { productService } from '../../services/productService';
import { eventService } from '../../services/eventService';

let mockParams: { id?: string } = { id: 'prod-1' };
const mockNavigate = vi.fn();
const mockAddToast = vi.fn();

vi.mock('../../services/productService', () => ({
  productService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addIngredients: vi.fn(),
    getIngredients: vi.fn(),
    getIngredientsForProducts: vi.fn(),
    updateIngredients: vi.fn(),
    uploadImage: vi.fn(),
  },
}));
vi.mock('../../services/eventService', () => ({
  eventService: {
    getAll: vi.fn().mockResolvedValue([]),
    getByDateRange: vi.fn(),
    getByClientId: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getUpcoming: vi.fn(),
    getProducts: vi.fn(),
    getExtras: vi.fn(),
    updateItems: vi.fn(),
    getEquipment: vi.fn(),
    checkEquipmentConflicts: vi.fn(),
    getEquipmentSuggestions: vi.fn(),
    getSupplies: vi.fn(),
    getSupplySuggestions: vi.fn(),
    addProducts: vi.fn(),
    updateProducts: vi.fn(),
    updateExtras: vi.fn(),
  },
}));
vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((_err: unknown, fallback?: string) => fallback || 'Error'),
}));
vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ toasts: [], addToast: mockAddToast, removeToast: vi.fn() }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useParams: () => mockParams, useNavigate: () => mockNavigate };
});

const baseProduct = {
  id: 'prod-1',
  user_id: 'user-1',
  name: 'Paquete Premium',
  category: 'Catering',
  base_price: 250,
  recipe: null,
  image_url: null,
  is_active: true,
};

const sampleIngredients = [
  {
    inventory_id: 'inv-1',
    quantity_required: 2,
    ingredient_name: 'Harina',
    unit: 'kg',
    type: 'ingredient',
  },
  {
    inventory_id: 'inv-2',
    quantity_required: 5,
    ingredient_name: 'Azúcar',
    unit: 'kg',
    type: 'ingredient',
  },
];

const renderDetails = () =>
  render(
    <MemoryRouter>
      <ProductDetails />
    </MemoryRouter>
  );

describe('ProductDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'prod-1' };
    (eventService.getAll as any).mockResolvedValue([]);
  });

  it('renders product details with ingredients', async () => {
    (productService.getById as any).mockResolvedValue(baseProduct);
    (productService.getIngredients as any).mockResolvedValue(sampleIngredients);
    renderDetails();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Paquete Premium'));
    expect(screen.getAllByText('$250.00').length).toBeGreaterThan(0);
    expect(screen.getByText('2 insumos')).toBeInTheDocument();
    expect(screen.getByText('Harina')).toBeInTheDocument();
    expect(screen.getByText('Azúcar')).toBeInTheDocument();
  });

  it('renders empty ingredients state', async () => {
    (productService.getById as any).mockResolvedValue(baseProduct);
    (productService.getIngredients as any).mockResolvedValue([]);
    renderDetails();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Paquete Premium'));
    expect(screen.getByText(/no tiene insumos configurados/i)).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    (productService.getById as any).mockRejectedValue(new Error('fail'));
    (productService.getIngredients as any).mockResolvedValue([]);
    renderDetails();
    await waitFor(() =>
      expect(screen.getByText('Error al cargar los datos del producto.')).toBeInTheDocument()
    );
  });

  it('shows not found when product is null', async () => {
    (productService.getById as any).mockResolvedValue(null);
    (productService.getIngredients as any).mockResolvedValue([]);
    renderDetails();
    await waitFor(() =>
      expect(screen.getByText('Producto no encontrado')).toBeInTheDocument()
    );
  });

  it('navigates back on error button click', async () => {
    (productService.getById as any).mockRejectedValue(new Error('fail'));
    (productService.getIngredients as any).mockResolvedValue([]);
    renderDetails();
    await waitFor(() => screen.getByText('Volver a productos'));
    fireEvent.click(screen.getByText('Volver a productos'));
    expect(mockNavigate).toHaveBeenCalledWith('/products');
  });

  it('has edit link to correct path', async () => {
    (productService.getById as any).mockResolvedValue(baseProduct);
    (productService.getIngredients as any).mockResolvedValue([]);
    renderDetails();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Paquete Premium'));
    expect(screen.getByRole('link', { name: /Editar|action\.edit/i })).toHaveAttribute('href', '/products/prod-1/edit');
  });

  it('deletes product successfully', async () => {
    (productService.getById as any).mockResolvedValue(baseProduct);
    (productService.getIngredients as any).mockResolvedValue([]);
    (productService.delete as any).mockResolvedValue({});
    renderDetails();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Paquete Premium'));

    fireEvent.click(screen.getByRole('button', { name: /Eliminar|action\.delete/i }));
    // Dialog confirm button (bg-red-600) is first in DOM, page button is second
    const confirmButtons = screen.getAllByRole('button', { name: /Eliminar|action\.delete/i });
    await act(async () => {
      fireEvent.click(confirmButtons[0]);
    });

    await waitFor(() => {
      expect(productService.delete).toHaveBeenCalledWith('prod-1');
      expect(mockNavigate).toHaveBeenCalledWith('/products');
    });
  });

  it('handles delete error', async () => {
    (productService.getById as any).mockResolvedValue(baseProduct);
    (productService.getIngredients as any).mockResolvedValue([]);
    (productService.delete as any).mockRejectedValue(new Error('del fail'));
    renderDetails();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Paquete Premium'));

    fireEvent.click(screen.getByRole('button', { name: /Eliminar|action\.delete/i }));
    const confirmButtons = screen.getAllByRole('button', { name: /Eliminar|action\.delete/i });
    await act(async () => {
      fireEvent.click(confirmButtons[0]);
    });

    await waitFor(() => {
      expect(productService.delete).toHaveBeenCalledWith('prod-1');
    });
  });

  it('cancels delete via confirm dialog', async () => {
    (productService.getById as any).mockResolvedValue(baseProduct);
    (productService.getIngredients as any).mockResolvedValue([]);
    renderDetails();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Paquete Premium'));

    fireEvent.click(screen.getByRole('button', { name: /Eliminar|action\.delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancelar|action\.cancel/i }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(productService.delete).not.toHaveBeenCalled();
  });

  it('shows fallback for ingredient with missing inventory', async () => {
    (productService.getById as any).mockResolvedValue(baseProduct);
    (productService.getIngredients as any).mockResolvedValue([
      { inventory_id: 'inv-99', quantity_required: 1, ingredient_name: null, type: 'ingredient' },
    ]);
    renderDetails();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Paquete Premium'));
    expect(screen.getByText('Insumo desconocido')).toBeInTheDocument();
  });
});
