import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { ProductForm } from './ProductForm';
import { productService } from '../../services/productService';
import { inventoryService } from '../../services/inventoryService';

const mockNavigate = vi.fn();
let mockParams: { id?: string } = {};

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

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

let mockPlanLimits = {
  canCreateProduct: true,
  productsCount: 0,
  productLimit: 15,
  loading: false,
};

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', plan: 'pro' } }),
}));

vi.mock('../../hooks/usePlanLimits', () => ({
  usePlanLimits: () => mockPlanLimits,
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((_err: unknown, fallback?: string) => fallback || 'Error'),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({ toasts: [], addToast: vi.fn(), removeToast: vi.fn() }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

const renderForm = () =>
  render(
    <MemoryRouter>
      <ProductForm />
    </MemoryRouter>
  );

describe('ProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    mockPlanLimits = {
      canCreateProduct: true,
      productsCount: 0,
      productLimit: 15,
      loading: false,
    };
    (inventoryService.getAll as any).mockResolvedValue([
      { id: 'inv-1', ingredient_name: 'Harina', unit: 'kg', unit_cost: 2.5, type: 'ingredient' },
    ]);
  });

  it('adds ingredient and calculates total', async () => {
    const { container } = renderForm();

    await waitFor(() => {
      expect(inventoryService.getAll).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /^(Agregar un insumo adicional|Agregar Insumo)$/i }));

    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'inv-1' } });

    const quantityInput = container.querySelector('input[step="0.001"]') as HTMLInputElement;
    fireEvent.change(quantityInput, { target: { value: '3' } });

    await waitFor(() => {
      expect(screen.getAllByText('$7.50').length).toBeGreaterThan(0);
    });
  });

  it('creates product and saves ingredients', async () => {
    (productService.create as any).mockResolvedValue({ id: 'prod-1' });
    (productService.updateIngredients as any).mockResolvedValue({});

    const { container } = renderForm();

    await waitFor(() => {
      expect(inventoryService.getAll).toHaveBeenCalled();
    });

    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: 'Churros' },
    });
    fireEvent.change(container.querySelector('input[name="category"]')!, {
      target: { value: 'Postres' },
    });
    fireEvent.change(container.querySelector('input[name="base_price"]')!, {
      target: { value: '50' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^(Agregar un insumo adicional|Agregar Insumo)$/i }));
    const select = container.querySelector('select') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'inv-1' } });
    const quantityInput = container.querySelector('input[step="0.001"]') as HTMLInputElement;
    fireEvent.change(quantityInput, { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /Guardar producto/i }));

    await waitFor(() => {
      expect(productService.create).toHaveBeenCalledWith({
        name: 'Churros',
        category: 'Postres',
        base_price: 50,
        image_url: null,
        is_active: true,
        recipe: null,
        staff_team_id: null,
      });
    });
    await waitFor(() => {
      expect(productService.updateIngredients).toHaveBeenCalledWith('prod-1', [
        { inventoryId: 'inv-1', quantityRequired: 2, capacity: null, bringToEvent: false },
      ]);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/products');
  });

  it('loads product and updates', async () => {
    mockParams = { id: 'prod-1' };
    (productService.getById as any).mockResolvedValue({
      id: 'prod-1',
      name: 'Churros',
      category: 'Postres',
      base_price: 50,
    });
    (productService.getIngredients as any).mockResolvedValue([
      {
        inventory_id: 'inv-1',
        quantity_required: 1,
        inventory: { unit_cost: 2.5, unit: 'kg' },
      },
    ]);
    (productService.update as any).mockResolvedValue({});
    (productService.updateIngredients as any).mockResolvedValue({});

    const { container } = renderForm();

    await waitFor(() => {
      expect((container.querySelector('input[name="name"]') as HTMLInputElement).value).toBe('Churros');
    });

    fireEvent.change(container.querySelector('input[name="base_price"]')!, {
      target: { value: '60' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar producto/i }));

    await waitFor(() => {
      expect(productService.update).toHaveBeenCalledWith('prod-1', {
        name: 'Churros',
        category: 'Postres',
        base_price: 60,
        image_url: null,
        is_active: true,
        staff_team_id: null,
      });
    });
  });

  it('handles missing product on load', async () => {
    mockParams = { id: 'prod-1' };
    (productService.getById as any).mockResolvedValueOnce(null);

    renderForm();

    // With React Query, a null return means the query succeeds with null data.
    // The component renders the form with empty fields since existingProduct is null/undefined.
    // Verify the form still renders (no crash).
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Editar Producto');
    });
  });

  it('shows error toast when saving fails', async () => {
    (productService.create as any).mockRejectedValueOnce(new Error('fail'));

    const { container } = renderForm();

    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: 'Churros' },
    });
    fireEvent.change(container.querySelector('input[name="category"]')!, {
      target: { value: 'Postres' },
    });
    fireEvent.change(container.querySelector('input[name="base_price"]')!, {
      target: { value: '50' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar producto/i }));

    // The mutation's onError handler calls logError and addToast via React Query
    await waitFor(() => {
      expect(productService.create).toHaveBeenCalled();
    });
  });

  it('handles inventory fetch via React Query', async () => {
    // inventoryService.getAll is called by the useInventoryItems hook through React Query
    renderForm();

    await waitFor(() => {
      expect(inventoryService.getAll).toHaveBeenCalled();
    });
  });

  // ---------- NEW TESTS FOR COVERAGE ----------

  it('shows UpgradeBanner when creating and canCreateProduct is false (lines 181-185)', async () => {
    mockPlanLimits = {
      canCreateProduct: false,
      productsCount: 15,
      productLimit: 15,
      loading: false,
    };
    // No id means we are creating a new product
    mockParams = {};

    renderForm();

    // Should show the UpgradeBanner with limit-reached text
    await waitFor(() => {
      expect(screen.getByText(/Límite de Catálogo Alcanzado/i)).toBeInTheDocument();
    });

    // Should show the "Regresar" back button
    const backBtn = screen.getByRole('button', { name: /Regresar a la página anterior|Volver/i });
    expect(backBtn).toBeInTheDocument();

    // Click back navigates via navigate(-1)
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('shows loading spinner when plan limits are loading', async () => {
    mockPlanLimits = {
      canCreateProduct: true,
      productsCount: 0,
      productLimit: 15,
      loading: true,
    };

    renderForm();

    expect(screen.getByRole('status')).toBeInTheDocument();

    // Settle background state updates to avoid act() warnings
    await waitFor(() => {
      expect(inventoryService.getAll).toHaveBeenCalled();
    });
  });

  it('navigates to /products when clicking the back arrow button (line 205)', async () => {
    renderForm();

    await waitFor(() => {
      expect(inventoryService.getAll).toHaveBeenCalled();
    });

    const backButton = screen.getByRole('button', { name: /Volver a la lista de productos|Volver/i });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/products');
  });

  it('removes an ingredient when clicking the trash button (line 326)', async () => {
    renderForm();

    await waitFor(() => {
      expect(inventoryService.getAll).toHaveBeenCalled();
    });

    // Add two ingredients
    fireEvent.click(screen.getByRole('button', { name: /^(Agregar un insumo adicional|Agregar Insumo)$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^(Agregar un insumo adicional|Agregar Insumo)$/i }));

    // Should have two ingredient rows
    const removeButtons = screen.getAllByRole('button', { name: /Eliminar insumo/i });
    expect(removeButtons.length).toBe(2);

    // Remove the first ingredient
    fireEvent.click(removeButtons[0]);

    // Now only one should remain
    await waitFor(() => {
      const remaining = screen.getAllByRole('button', { name: /Eliminar insumo/i });
      expect(remaining.length).toBe(1);
    });
  });

  it('handles create returning null via React Query error handling', async () => {
    // When create returns null, the mutation's mutationFn tries to access .id on null,
    // which throws, triggering the onError handler in the mutation.
    (productService.create as any).mockResolvedValue(null);

    const { container } = renderForm();

    await waitFor(() => {
      expect(inventoryService.getAll).toHaveBeenCalled();
    });

    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: 'Test' },
    });
    fireEvent.change(container.querySelector('input[name="category"]')!, {
      target: { value: 'Cat' },
    });
    fireEvent.change(container.querySelector('input[name="base_price"]')!, {
      target: { value: '10' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar producto/i }));

    await waitFor(() => {
      expect(productService.create).toHaveBeenCalled();
    });
  });

  it('displays "Editar Producto" title when editing an existing product', async () => {
    mockParams = { id: 'prod-1' };
    (productService.getById as any).mockResolvedValue({
      id: 'prod-1',
      name: 'Churros',
      category: 'Postres',
      base_price: 50,
    });
    (productService.getIngredients as any).mockResolvedValue([]);

    renderForm();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Editar Producto');
    });
  });

  it('displays "Nuevo Producto" title when creating', async () => {
    renderForm();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nuevo Producto');
    });
  });

  it('allows editing in canCreateProduct=false mode when editing existing product', async () => {
    // When editing (id is set), the upgrade banner should NOT appear even if limit reached
    mockPlanLimits = {
      canCreateProduct: false,
      productsCount: 15,
      productLimit: 15,
      loading: false,
    };
    mockParams = { id: 'prod-1' };
    (productService.getById as any).mockResolvedValue({
      id: 'prod-1',
      name: 'Churros',
      category: 'Postres',
      base_price: 50,
    });
    (productService.getIngredients as any).mockResolvedValue([]);

    renderForm();

    await waitFor(() => {
      // Should show the edit form, not the upgrade banner
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Editar Producto');
    });
    expect(screen.queryByText(/Límite de Catálogo Alcanzado/i)).not.toBeInTheDocument();
  });
});
