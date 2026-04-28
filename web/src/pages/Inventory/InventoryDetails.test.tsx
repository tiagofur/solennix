import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { InventoryDetails } from './InventoryDetails';
import { inventoryService } from '../../services/inventoryService';

let mockParams: { id?: string } = { id: 'inv-1' };
const mockNavigate = vi.fn();
const mockAddToast = vi.fn();

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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
    getProducts: vi.fn().mockResolvedValue([]),
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
vi.mock('../../services/productService', () => ({
  productService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addIngredients: vi.fn(),
    getIngredients: vi.fn(),
    getIngredientsForProducts: vi.fn().mockResolvedValue([]),
    updateIngredients: vi.fn(),
    uploadImage: vi.fn(),
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

const baseItem = {
  id: 'inv-1',
  user_id: 'user-1',
  ingredient_name: 'Harina',
  current_stock: 100,
  minimum_stock: 20,
  unit: 'kg',
  unit_cost: 2.5,
  type: 'ingredient' as const,
  last_updated: '2024-01-01T00:00:00Z',
};

const renderDetails = () =>
  render(
    <MemoryRouter>
      <InventoryDetails />
    </MemoryRouter>
  );

describe('InventoryDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { id: 'inv-1' };
  });

  it('renders inventory item details', async () => {
    (inventoryService.getById as any).mockResolvedValue(baseItem);
    renderDetails();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Harina'));
    expect(screen.getByText('Consumibles')).toBeInTheDocument();
    expect(screen.getByText('$2.50')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });

  it('renders equipment type badge', async () => {
    (inventoryService.getById as any).mockResolvedValue({ ...baseItem, type: 'equipment' });
    renderDetails();
    await waitFor(() => expect(screen.getByText('Equipos')).toBeInTheDocument());
  });

  it('shows low stock alert when current_stock <= minimum_stock', async () => {
    (inventoryService.getById as any).mockResolvedValue({ ...baseItem, current_stock: 15 });
    renderDetails();
    await waitFor(() =>
      expect(screen.getAllByText(/Stock bajo/i).length).toBeGreaterThanOrEqual(1)
    );
  });

  it('shows optimal stock message when stock is sufficient', async () => {
    (inventoryService.getById as any).mockResolvedValue(baseItem);
    renderDetails();
    await waitFor(() =>
      expect(screen.getAllByText(/Sin ítems en el inventario/i).length).toBeGreaterThanOrEqual(1)
    );
  });

  it('shows error state on fetch failure', async () => {
    (inventoryService.getById as any).mockRejectedValue(new Error('fail'));
    renderDetails();
    await waitFor(() =>
      expect(screen.getByText('error.load_failed')).toBeInTheDocument()
    );
  });

  it('shows not found when item is null', async () => {
    (inventoryService.getById as any).mockResolvedValue(null);
    renderDetails();
    await waitFor(() =>
      expect(screen.getByText('Sin ítems en el inventario')).toBeInTheDocument()
    );
  });

  it('navigates back on error state button click', async () => {
    (inventoryService.getById as any).mockRejectedValue(new Error('fail'));
    renderDetails();
    await waitFor(() => screen.getByRole('button', { name: /Volver|action\.back/i }));
    fireEvent.click(screen.getByRole('button', { name: /Volver|action\.back/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/inventory');
  });

  it('has edit link to correct path', async () => {
    (inventoryService.getById as any).mockResolvedValue(baseItem);
    renderDetails();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Harina'));
    const editLink = screen.getByRole('link', { name: /Editar|action\.edit/i });
    expect(editLink).toHaveAttribute('href', '/inventory/inv-1/edit');
  });

  it('deletes item successfully', async () => {
    (inventoryService.getById as any).mockResolvedValue(baseItem);
    (inventoryService.delete as any).mockResolvedValue({});
    renderDetails();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Harina'));

    fireEvent.click(screen.getByRole('button', { name: /Eliminar|action\.delete/i }));
    // Dialog confirm button (bg-red-600) is first in DOM, page button is second
    const confirmButtons = screen.getAllByRole('button', { name: /Eliminar|action\.delete/i });
    fireEvent.click(confirmButtons[0]);

    await waitFor(() => {
      expect(inventoryService.delete).toHaveBeenCalledWith('inv-1');
      expect(mockNavigate).toHaveBeenCalledWith('/inventory');
    });
  });

  it('handles delete error', async () => {
    (inventoryService.getById as any).mockResolvedValue(baseItem);
    (inventoryService.delete as any).mockRejectedValue(new Error('del fail'));
    renderDetails();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Harina'));

    fireEvent.click(screen.getByRole('button', { name: /Eliminar|action\.delete/i }));
    const confirmButtons = screen.getAllByRole('button', { name: /Eliminar|action\.delete/i });
    fireEvent.click(confirmButtons[0]);

    await waitFor(() => {
      expect(inventoryService.delete).toHaveBeenCalledWith('inv-1');
    });
  });

  it('cancels delete via confirm dialog', async () => {
    (inventoryService.getById as any).mockResolvedValue(baseItem);
    renderDetails();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Harina'));

    fireEvent.click(screen.getByRole('button', { name: /Eliminar|action\.delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancelar|action\.cancel/i }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(inventoryService.delete).not.toHaveBeenCalled();
  });

  it('shows $0.00 for null unit_cost', async () => {
    (inventoryService.getById as any).mockResolvedValue({ ...baseItem, unit_cost: null });
    renderDetails();
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Harina'));
    const zeroPrices = screen.getAllByText('$0.00');
    expect(zeroPrices.length).toBeGreaterThanOrEqual(1);
  });
});
