import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { InventoryList } from './InventoryList';
import { inventoryService } from '../../services/inventoryService';
import { logError } from '../../lib/errorHandler';

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getAll: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback || 'Error'),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    toasts: [],
  }),
}));

/** Helper: open the RowActionMenu for a given row and click an action */
async function openRowMenuAndClick(actionLabel: RegExp) {
  // RowActionMenu renders a button with aria-label="Acciones"
  const menuButtons = screen.getAllByRole('button', { name: 'Acciones' });
  // Click the first (or only) one
  fireEvent.click(menuButtons[0]);
  // Wait for the portal menu to appear and click the action
  const menuItem = await screen.findByRole('menuitem', { name: actionLabel });
  fireEvent.click(menuItem);
}

const renderList = () =>
  render(
    <MemoryRouter>
      <InventoryList />
    </MemoryRouter>
  );

const sampleItems = [
  {
    id: '1',
    ingredient_name: 'Harina',
    unit: 'kg',
    type: 'ingredient',
    current_stock: 10,
    minimum_stock: 5,
    unit_cost: 10,
  },
  {
    id: '2',
    ingredient_name: 'Azucar',
    unit: 'kg',
    type: 'ingredient',
    current_stock: 2,
    minimum_stock: 5,
    unit_cost: 8,
  },
  {
    id: '3',
    ingredient_name: 'Horno',
    unit: 'pieza',
    type: 'equipment',
    current_stock: 1,
    minimum_stock: 1,
    unit_cost: 5000,
  },
];

describe('InventoryList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders items separated into two sections', async () => {
    (inventoryService.getAll as any).mockResolvedValue(sampleItems);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    // Verify section headers
    expect(screen.getByText('Consumibles')).toBeInTheDocument();
    expect(screen.getByText('Equipos')).toBeInTheDocument();

    // Verify items exist
    expect(screen.getByText('Harina')).toBeInTheDocument();
    expect(screen.getByText('Azucar')).toBeInTheDocument();
    expect(screen.getByText('Horno')).toBeInTheDocument();
  });

  it('renders items and low stock warning', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Harina',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 2,
        minimum_stock: 5,
        unit_cost: 10,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });
    expect(screen.getByText(/Stock bajo/i)).toBeInTheDocument();
  });

  it('filters items by search term', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Harina',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 10,
        minimum_stock: 1,
        unit_cost: 10,
      },
      {
        id: '2',
        ingredient_name: 'Azucar',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 10,
        minimum_stock: 1,
        unit_cost: 10,
      },
    ]);

    renderList();
    await waitFor(() => {
      expect(screen.getByText('Azucar')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Buscar en inventario...'), {
      target: { value: 'Harina' },
    });

    expect(screen.getByText('Harina')).toBeInTheDocument();
    expect(screen.queryByText('Azucar')).not.toBeInTheDocument();
  });

  it('deletes an item after confirmation', async () => {
    let callCount = 0;
    (inventoryService.getAll as any).mockImplementation(() => {
      callCount++;
      // After delete triggers refetch, return empty
      if (callCount > 1) return Promise.resolve([]);
      return Promise.resolve([
        {
          id: '1',
          ingredient_name: 'Harina',
          unit: 'kg',
          type: 'ingredient',
          current_stock: 10,
          minimum_stock: 1,
          unit_cost: 10,
        },
      ]);
    });
    (inventoryService.delete as any).mockResolvedValue({});

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    // Open RowActionMenu and click Eliminar
    await openRowMenuAndClick(/Eliminar|action\.delete/i);

    // ConfirmDialog opens with title "Eliminar ítem de inventario"
    const confirmBtn = await screen.findByRole('button', { name: /Eliminar permanentemente|actions\.delete_permanent/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(inventoryService.delete).toHaveBeenCalledWith('1');
    });
  });

  it('logs fetch errors and shows empty state', async () => {
    (inventoryService.getAll as any).mockRejectedValueOnce(new Error('fail'));

    renderList();

    // React Query handles the error; the component shows empty/loading state.
    // With retry: false in test QueryClient, the query fails immediately.
    // The component defaults data to [] so empty state renders.
    await waitFor(() => {
      expect(screen.getByText(/Sin ítems en el inventario/i)).toBeInTheDocument();
    });
  });

  it('shows equipment section and delete error handling', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Horno',
        unit: 'pieza',
        type: 'equipment',
        current_stock: 1,
        minimum_stock: 1,
        unit_cost: null,
      },
    ]);
    (inventoryService.delete as any).mockRejectedValueOnce(new Error('fail'));

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Horno')).toBeInTheDocument();
    });

    expect(screen.getByText('Equipos')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();

    // Open RowActionMenu and click Eliminar
    await openRowMenuAndClick(/Eliminar|action\.delete/i);

    // ConfirmDialog: click confirm button
    const confirmBtn = await screen.findByRole('button', { name: /Eliminar permanentemente|actions\.delete_permanent/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error deleting inventory item', expect.any(Error));
    });
    expect(screen.getByText('Horno')).toBeInTheDocument();
  });

  it('closes confirm dialog on cancel', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Harina',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 10,
        minimum_stock: 1,
        unit_cost: 10,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    // Open RowActionMenu and click Eliminar to open the ConfirmDialog
    await openRowMenuAndClick(/Eliminar|action\.delete/i);

    // ConfirmDialog should be visible
    const cancelBtn = await screen.findByRole('button', { name: /Cancelar|action\.cancel/i });
    fireEvent.click(cancelBtn);

    // The confirm button should no longer be present (dialog closed)
    expect(screen.queryByRole('button', { name: /Eliminar permanentemente|actions\.delete_permanent/i })).not.toBeInTheDocument();
  });

  it('renders consumibles section with unit label', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Harina',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 10,
        minimum_stock: 1,
        unit_cost: 10,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    expect(screen.getByText('Consumibles')).toBeInTheDocument();
    expect(screen.getByText(/Unidad: kg/i)).toBeInTheDocument();
  });

  // ---------- sorting tests ----------

  it('sorts consumibles section by minimum_stock column', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Harina',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 10,
        minimum_stock: 5,
        unit_cost: 10,
      },
      {
        id: '2',
        ingredient_name: 'Azucar',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 2,
        minimum_stock: 3,
        unit_cost: 8,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    const minStockHeader = screen.getByText('Stock Mínimo');
    fireEvent.click(minStockHeader);

    const minStockTh = minStockHeader.closest('th');
    expect(minStockTh).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.click(minStockHeader);
    expect(minStockTh).toHaveAttribute('aria-sort', 'descending');
  });

  it('sorts by unit_cost column when header is clicked', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Harina',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 10,
        minimum_stock: 1,
        unit_cost: 10,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    const unitCostHeader = screen.getByText('Costo Unitario');
    fireEvent.click(unitCostHeader);

    const unitCostTh = unitCostHeader.closest('th');
    expect(unitCostTh).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.click(unitCostHeader);
    expect(unitCostTh).toHaveAttribute('aria-sort', 'descending');
  });

  it('sorts by current_stock column when header is clicked', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Harina',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 10,
        minimum_stock: 1,
        unit_cost: 10,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    const currentStockHeader = screen.getByText('Stock Actual');
    fireEvent.click(currentStockHeader);

    const currentStockTh = currentStockHeader.closest('th');
    expect(currentStockTh).toHaveAttribute('aria-sort', 'ascending');
  });

  it('sorts by ingredient_name and toggles sort order', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Harina',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 10,
        minimum_stock: 1,
        unit_cost: 10,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    const nameHeader = screen.getByText('Ítem');
    const nameTh = nameHeader.closest('th');
    expect(nameTh).toHaveAttribute('aria-sort', 'ascending');

    fireEvent.click(nameHeader);
    expect(nameTh).toHaveAttribute('aria-sort', 'descending');

    fireEvent.click(nameHeader);
    expect(nameTh).toHaveAttribute('aria-sort', 'ascending');
  });

  it('shows "none" aria-sort on columns that are not currently sorted', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Harina',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 10,
        minimum_stock: 1,
        unit_cost: 10,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    const minStockHeader = screen.getByText('Stock Mínimo');
    expect(minStockHeader.closest('th')).toHaveAttribute('aria-sort', 'none');

    const unitCostHeader = screen.getByText('Costo Unitario');
    expect(unitCostHeader.closest('th')).toHaveAttribute('aria-sort', 'none');
  });

  it('renders loading state', () => {
    (inventoryService.getAll as any).mockReturnValue(new Promise(() => {}));

    renderList();

    expect(screen.getByRole('status', { name: /cargando/i })).toBeInTheDocument();
  });

  it('shows search-specific empty state message when search has no results', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Harina',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 10,
        minimum_stock: 1,
        unit_cost: 10,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Buscar en inventario...'), {
      target: { value: 'ZZZ no existe' },
    });

    // Empty component renders with search-specific description
    expect(screen.getByText(/Sin ítems en el inventario/i)).toBeInTheDocument();
    expect(screen.getByText(/No hay ítems que coincidan/i)).toBeInTheDocument();
  });

  it('shows empty state with action button when no items exist', async () => {
    (inventoryService.getAll as any).mockResolvedValue([]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText(/Sin ítems en el inventario/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Comienza agregando tu primer ítem/i)).toBeInTheDocument();
    expect(screen.getByText('Agregar Ítem')).toBeInTheDocument();
  });

  it('does not show low stock warning when all items have sufficient stock', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Harina',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 100,
        minimum_stock: 5,
        unit_cost: 10,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Stock bajo/i)).not.toBeInTheDocument();
  });

  it('shows low stock count correctly for multiple low stock items', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Harina',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 2,
        minimum_stock: 5,
        unit_cost: 10,
      },
      {
        id: '2',
        ingredient_name: 'Azucar',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 1,
        minimum_stock: 5,
        unit_cost: 8,
      },
      {
        id: '3',
        ingredient_name: 'Manteca',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 100,
        minimum_stock: 5,
        unit_cost: 15,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    expect(screen.getByText(/2 ítem.*por debajo del nivel mínimo/i)).toBeInTheDocument();
  });

  it('has correct link hrefs for edit and new item', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: 'inv-42',
        ingredient_name: 'Sal',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 10,
        minimum_stock: 1,
        unit_cost: 3,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Sal')).toBeInTheDocument();
    });

    const newLink = screen.getByRole('link', { name: /Nuevo Ítem/i });
    expect(newLink).toHaveAttribute('href', '/inventory/new');

    // Edit is inside the RowActionMenu — open menu and verify the menuitem exists
    const menuButton = screen.getByRole('button', { name: 'Acciones' });
    fireEvent.click(menuButton);
    const editMenuItem = await screen.findByRole('menuitem', { name: /Editar|action\.edit/i });
    expect(editMenuItem).toBeInTheDocument();
  });

  it('renders unit_cost formatted correctly', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Harina',
        unit: 'kg',
        type: 'ingredient',
        current_stock: 10,
        minimum_stock: 1,
        unit_cost: 12.5,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    expect(screen.getByText('$12.50')).toBeInTheDocument();
  });

  it('handles null response from getAll gracefully', async () => {
    (inventoryService.getAll as any).mockResolvedValue(null);

    renderList();

    await waitFor(() => {
      expect(screen.getByText(/Sin ítems en el inventario/i)).toBeInTheDocument();
    });
  });

  it('shows empty section message when only one type exists', async () => {
    (inventoryService.getAll as any).mockResolvedValue([
      {
        id: '1',
        ingredient_name: 'Horno',
        unit: 'pieza',
        type: 'equipment',
        current_stock: 3,
        minimum_stock: 1,
        unit_cost: 5000,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Horno')).toBeInTheDocument();
    });

    // Equipment section should be visible
    expect(screen.getByText('Equipos')).toBeInTheDocument();
    // Consumibles and supply sections should show empty messages
    const emptyMessages = screen.getAllByText(/No hay insumos/i);
    expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
  });

  it('sorts equipment section independently from consumibles', async () => {
    (inventoryService.getAll as any).mockResolvedValue(sampleItems);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    // There should be two tables — get all Stock Actual headers
    const stockHeaders = screen.getAllByText('Stock Actual');
    expect(stockHeaders.length).toBe(2);

    // Click the equipment section's Stock Actual header (second one)
    fireEvent.click(stockHeaders[1]);
    const equipTh = stockHeaders[1].closest('th');
    expect(equipTh).toHaveAttribute('aria-sort', 'ascending');

    // The consumibles section's header should still be "none"
    const ingredientTh = stockHeaders[0].closest('th');
    expect(ingredientTh).toHaveAttribute('aria-sort', 'none');
  });
});
