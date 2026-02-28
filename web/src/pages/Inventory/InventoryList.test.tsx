import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InventoryList } from './InventoryList';
import { inventoryService } from '../../services/inventoryService';
import { logError } from '../../lib/errorHandler';

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getAll: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
}));

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

    fireEvent.change(screen.getByPlaceholderText('Buscar ingrediente...'), {
      target: { value: 'Harina' },
    });

    expect(screen.getByText('Harina')).toBeInTheDocument();
    expect(screen.queryByText('Azucar')).not.toBeInTheDocument();
  });

  it('deletes an item after confirmation', async () => {
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
    (inventoryService.delete as any).mockResolvedValue({});

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Eliminar Harina/i }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar ingrediente' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(inventoryService.delete).toHaveBeenCalledWith('1');
      expect(screen.queryByText('Harina')).not.toBeInTheDocument();
    });
  });

  it('logs fetch errors and shows empty state', async () => {
    (inventoryService.getAll as any).mockRejectedValueOnce(new Error('fail'));

    renderList();

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error fetching inventory', expect.any(Error));
    });
    expect(screen.getByText(/No se encontraron ingredientes/i)).toBeInTheDocument();
  });

  it('shows equipment badge and delete error handling', async () => {
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

    expect(screen.getByText('Equipo')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Eliminar Horno/i }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar ingrediente' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error deleting item', expect.any(Error));
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

    fireEvent.click(screen.getByRole('button', { name: /Eliminar Harina/i }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar ingrediente' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog', { name: 'Eliminar ingrediente' })).not.toBeInTheDocument();
  });

  it('renders ingredient badge and unit label', async () => {
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

    expect(screen.getByText('Ingrediente')).toBeInTheDocument();
    expect(screen.getByText(/Unidad: kg/i)).toBeInTheDocument();
  });

  // ---------- NEW TESTS FOR COVERAGE: sorting columns ----------

  it('sorts by minimum_stock column when header is clicked', async () => {
    (inventoryService.getAll as any).mockResolvedValue(sampleItems);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    // Click "Stock Minimo" column header to sort ascending
    const minStockHeader = screen.getByText('Stock Mínimo');
    fireEvent.click(minStockHeader);

    // Verify that the aria-sort attribute changes
    const minStockTh = minStockHeader.closest('th');
    expect(minStockTh).toHaveAttribute('aria-sort', 'ascending');

    // Click again to sort descending
    fireEvent.click(minStockHeader);
    expect(minStockTh).toHaveAttribute('aria-sort', 'descending');
  });

  it('sorts by unit_cost column when header is clicked', async () => {
    (inventoryService.getAll as any).mockResolvedValue(sampleItems);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    // Click "Costo Unitario" column header to sort ascending
    const unitCostHeader = screen.getByText('Costo Unitario');
    fireEvent.click(unitCostHeader);

    const unitCostTh = unitCostHeader.closest('th');
    expect(unitCostTh).toHaveAttribute('aria-sort', 'ascending');

    // Click again to toggle to descending
    fireEvent.click(unitCostHeader);
    expect(unitCostTh).toHaveAttribute('aria-sort', 'descending');
  });

  it('sorts by type column when header is clicked', async () => {
    (inventoryService.getAll as any).mockResolvedValue(sampleItems);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    const typeHeader = screen.getByText('Tipo');
    fireEvent.click(typeHeader);

    const typeTh = typeHeader.closest('th');
    expect(typeTh).toHaveAttribute('aria-sort', 'ascending');
  });

  it('sorts by current_stock column when header is clicked', async () => {
    (inventoryService.getAll as any).mockResolvedValue(sampleItems);

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
    (inventoryService.getAll as any).mockResolvedValue(sampleItems);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    // ingredient_name is the initial sort key, so it should already be ascending
    const nameHeader = screen.getByText('Ítem');
    const nameTh = nameHeader.closest('th');
    expect(nameTh).toHaveAttribute('aria-sort', 'ascending');

    // Click to toggle to descending
    fireEvent.click(nameHeader);
    expect(nameTh).toHaveAttribute('aria-sort', 'descending');

    // Click again to toggle back to ascending
    fireEvent.click(nameHeader);
    expect(nameTh).toHaveAttribute('aria-sort', 'ascending');
  });

  it('shows "none" aria-sort on columns that are not currently sorted', async () => {
    (inventoryService.getAll as any).mockResolvedValue(sampleItems);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Harina')).toBeInTheDocument();
    });

    // Default sort is ingredient_name, so other columns should be "none"
    const typeHeader = screen.getByText('Tipo');
    expect(typeHeader.closest('th')).toHaveAttribute('aria-sort', 'none');

    const minStockHeader = screen.getByText('Stock Mínimo');
    expect(minStockHeader.closest('th')).toHaveAttribute('aria-sort', 'none');

    const unitCostHeader = screen.getByText('Costo Unitario');
    expect(unitCostHeader.closest('th')).toHaveAttribute('aria-sort', 'none');
  });

  it('renders loading state', () => {
    (inventoryService.getAll as any).mockReturnValue(new Promise(() => {}));

    renderList();

    expect(screen.getByText('Cargando inventario...')).toBeInTheDocument();
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

    fireEvent.change(screen.getByPlaceholderText('Buscar ingrediente...'), {
      target: { value: 'ZZZ no existe' },
    });

    expect(screen.getByText(/No se encontraron ingredientes/i)).toBeInTheDocument();
    expect(screen.getByText(/Intenta ajustar los términos de búsqueda/i)).toBeInTheDocument();
  });

  it('shows empty state with action button when no items exist', async () => {
    (inventoryService.getAll as any).mockResolvedValue([]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText(/No se encontraron ingredientes/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Comienza agregando tu primer ingrediente/i)).toBeInTheDocument();
    // The empty state should have the "Agregar Ingrediente" link
    expect(screen.getByText('Agregar Ingrediente')).toBeInTheDocument();
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

    expect(screen.getByText(/Hay 2 ítem\(s\) por debajo del nivel mínimo/i)).toBeInTheDocument();
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

    // Check "Nuevo Ingrediente" link
    const newLink = screen.getByRole('link', { name: /Nuevo Ingrediente/i });
    expect(newLink).toHaveAttribute('href', '/inventory/new');

    // Check edit link
    const editLink = screen.getByRole('link', { name: /Editar Sal/i });
    expect(editLink).toHaveAttribute('href', '/inventory/inv-42/edit');
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
      expect(screen.getByText(/No se encontraron ingredientes/i)).toBeInTheDocument();
    });
  });
});
