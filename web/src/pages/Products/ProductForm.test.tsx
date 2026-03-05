import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductForm } from './ProductForm';
import { productService } from '../../services/productService';
import { inventoryService } from '../../services/inventoryService';
import { logError } from '../../lib/errorHandler';

const mockNavigate = vi.fn();
let mockParams: { id?: string } = {};

vi.mock('../../services/productService', () => ({
  productService: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getIngredients: vi.fn(),
    updateIngredients: vi.fn(),
  },
}));

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getAll: vi.fn(),
  },
}));

let mockPlanLimits = {
  canCreateCatalogItem: true,
  catalogCount: 0,
  catalogLimit: 20,
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
      canCreateCatalogItem: true,
      catalogCount: 0,
      catalogLimit: 20,
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

    fireEvent.click(screen.getByRole('button', { name: /Agregar un insumo adicional/i }));

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

    fireEvent.click(screen.getByRole('button', { name: /Agregar un insumo adicional/i }));
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
        user_id: 'user-1',
        image_url: null,
        is_active: true,
        recipe: null,
      });
      expect(productService.updateIngredients).toHaveBeenCalledWith('prod-1', [
        { inventoryId: 'inv-1', quantityRequired: 2 },
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
      });
    });
  });

  it('handles missing product on load', async () => {
    mockParams = { id: 'prod-1' };
    (productService.getById as any).mockResolvedValueOnce(null);

    renderForm();

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar el producto/i)).toBeInTheDocument();
    });
    expect(logError).toHaveBeenCalledWith('Error loading product', expect.any(Error));
  });

  it('shows error when saving fails', async () => {
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

    await waitFor(() => {
      expect(screen.getByText(/fail/i)).toBeInTheDocument();
    });
    expect(logError).toHaveBeenCalledWith('Error saving product', expect.any(Error));
  });

  it('logs error when inventory dependencies fail', async () => {
    (inventoryService.getAll as any).mockRejectedValueOnce(new Error('fail'));

    renderForm();

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error loading inventory', expect.any(Error));
    });
  });

  // ---------- NEW TESTS FOR COVERAGE ----------

  it('shows UpgradeBanner when creating and canCreateCatalogItem is false (lines 181-185)', async () => {
    mockPlanLimits = {
      canCreateCatalogItem: false,
      catalogCount: 20,
      catalogLimit: 20,
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
    const backBtn = screen.getByRole('button', { name: /Regresar a la página anterior/i });
    expect(backBtn).toBeInTheDocument();

    // Click back navigates via navigate(-1)
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('shows loading spinner when plan limits are loading', async () => {
    mockPlanLimits = {
      canCreateCatalogItem: true,
      catalogCount: 0,
      catalogLimit: 20,
      loading: true,
    };

    renderForm();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Cargando límites de plan...')).toBeInTheDocument();
  });

  it('navigates to /products when clicking the back arrow button (line 205)', async () => {
    renderForm();

    await waitFor(() => {
      expect(inventoryService.getAll).toHaveBeenCalled();
    });

    const backButton = screen.getByRole('button', { name: /Volver a la lista de productos/i });
    fireEvent.click(backButton);

    expect(mockNavigate).toHaveBeenCalledWith('/products');
  });

  it('removes an ingredient when clicking the trash button (line 326)', async () => {
    renderForm();

    await waitFor(() => {
      expect(inventoryService.getAll).toHaveBeenCalled();
    });

    // Add two ingredients
    fireEvent.click(screen.getByRole('button', { name: /Agregar un insumo adicional/i }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar un insumo adicional/i }));

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

  it('shows error when create returns null (no productId)', async () => {
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
      expect(screen.getByText(/Error al crear el producto/i)).toBeInTheDocument();
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
      expect(screen.getByText('Editar Producto')).toBeInTheDocument();
    });
  });

  it('displays "Nuevo Producto" title when creating', async () => {
    renderForm();

    await waitFor(() => {
      expect(screen.getByText('Nuevo Producto')).toBeInTheDocument();
    });
  });

  it('allows editing in canCreateCatalogItem=false mode when editing existing product', async () => {
    // When editing (id is set), the upgrade banner should NOT appear even if limit reached
    mockPlanLimits = {
      canCreateCatalogItem: false,
      catalogCount: 20,
      catalogLimit: 20,
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
      expect(screen.getByText('Editar Producto')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Límite de Catálogo Alcanzado/i)).not.toBeInTheDocument();
  });
});
