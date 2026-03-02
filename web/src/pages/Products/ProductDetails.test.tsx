import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductDetails } from './ProductDetails';
import { productService } from '../../services/productService';
import { logError } from '../../lib/errorHandler';

let mockParams: { id?: string } = { id: 'prod-1' };
const mockNavigate = vi.fn();
const mockAddToast = vi.fn();

vi.mock('../../services/productService', () => ({
  productService: { getById: vi.fn(), getIngredients: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../lib/errorHandler', () => ({ logError: vi.fn() }));
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
    inventory: { ingredient_name: 'Harina', current_stock: 100, minimum_stock: 20, unit: 'kg' },
  },
  {
    inventory_id: 'inv-2',
    quantity_required: 5,
    inventory: { ingredient_name: 'Azúcar', current_stock: 10, minimum_stock: 15, unit: 'kg' },
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
  });

  it('renders product details with ingredients', async () => {
    (productService.getById as any).mockResolvedValue(baseProduct);
    (productService.getIngredients as any).mockResolvedValue(sampleIngredients);
    renderDetails();
    await waitFor(() => expect(screen.getByText('Paquete Premium')).toBeInTheDocument());
    expect(screen.getByText('$250.00')).toBeInTheDocument();
    expect(screen.getByText('2 ingredientes configurados')).toBeInTheDocument();
    expect(screen.getByText('Harina')).toBeInTheDocument();
    expect(screen.getByText('Azúcar')).toBeInTheDocument();
  });

  it('renders empty ingredients state', async () => {
    (productService.getById as any).mockResolvedValue(baseProduct);
    (productService.getIngredients as any).mockResolvedValue([]);
    renderDetails();
    await waitFor(() => expect(screen.getByText('Paquete Premium')).toBeInTheDocument());
    expect(screen.getByText(/no tiene ingredientes configurados/i)).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    (productService.getById as any).mockRejectedValue(new Error('fail'));
    (productService.getIngredients as any).mockResolvedValue([]);
    renderDetails();
    await waitFor(() =>
      expect(screen.getByText('Error al cargar los datos del producto.')).toBeInTheDocument()
    );
    expect(logError).toHaveBeenCalledWith('Error fetching product details', expect.any(Error));
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
    await waitFor(() => screen.getByText('Paquete Premium'));
    expect(screen.getByText('Editar').closest('a')).toHaveAttribute('href', '/products/prod-1/edit');
  });

  it('deletes product successfully', async () => {
    (productService.getById as any).mockResolvedValue(baseProduct);
    (productService.getIngredients as any).mockResolvedValue([]);
    (productService.delete as any).mockResolvedValue({});
    renderDetails();
    await waitFor(() => screen.getByText('Paquete Premium'));

    fireEvent.click(screen.getByText('Eliminar'));
    // Dialog confirm button (bg-red-600) is first in DOM, page button is second
    const confirmButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    fireEvent.click(confirmButtons[0]);

    await waitFor(() => {
      expect(productService.delete).toHaveBeenCalledWith('prod-1');
      expect(mockNavigate).toHaveBeenCalledWith('/products');
      expect(mockAddToast).toHaveBeenCalledWith('Producto eliminado correctamente.', 'success');
    });
  });

  it('handles delete error', async () => {
    (productService.getById as any).mockResolvedValue(baseProduct);
    (productService.getIngredients as any).mockResolvedValue([]);
    (productService.delete as any).mockRejectedValue(new Error('del fail'));
    renderDetails();
    await waitFor(() => screen.getByText('Paquete Premium'));

    fireEvent.click(screen.getByText('Eliminar'));
    const confirmButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    fireEvent.click(confirmButtons[0]);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error deleting product', expect.any(Error));
      expect(mockAddToast).toHaveBeenCalledWith('Error al eliminar el producto.', 'error');
    });
  });

  it('cancels delete via confirm dialog', async () => {
    (productService.getById as any).mockResolvedValue(baseProduct);
    (productService.getIngredients as any).mockResolvedValue([]);
    renderDetails();
    await waitFor(() => screen.getByText('Paquete Premium'));

    fireEvent.click(screen.getByText('Eliminar'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(productService.delete).not.toHaveBeenCalled();
  });

  it('shows fallback for ingredient with missing inventory', async () => {
    (productService.getById as any).mockResolvedValue(baseProduct);
    (productService.getIngredients as any).mockResolvedValue([
      { inventory_id: 'inv-99', quantity_required: 1, inventory: null },
    ]);
    renderDetails();
    await waitFor(() => screen.getByText('Paquete Premium'));
    expect(screen.getByText('Ingrediente desconocido')).toBeInTheDocument();
  });
});
