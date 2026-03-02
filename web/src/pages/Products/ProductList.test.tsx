import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductList } from './ProductList';
import { productService } from '../../services/productService';
import { logError } from '../../lib/errorHandler';

vi.mock('../../services/productService', () => ({
  productService: {
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
      <ProductList />
    </MemoryRouter>
  );

describe('ProductList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders products after loading', async () => {
    (productService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Churros',
        category: 'Postres',
        base_price: 50,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Churros')).toBeInTheDocument();
    });
    expect(screen.getAllByText('Postres').length).toBeGreaterThanOrEqual(1);
  });

  it('filters products by search term', async () => {
    (productService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Churros',
        category: 'Postres',
        base_price: 50,
      },
      {
        id: '2',
        name: 'Tacos',
        category: 'Comida',
        base_price: 80,
      },
    ]);

    renderList();
    await waitFor(() => {
      expect(screen.getByText('Tacos')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Buscar producto...'), {
      target: { value: 'Postres' },
    });

    expect(screen.getByText('Churros')).toBeInTheDocument();
    expect(screen.queryByText('Tacos')).not.toBeInTheDocument();
  });

  it('deletes a product after confirmation', async () => {
    (productService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Churros',
        category: 'Postres',
        base_price: 50,
      },
    ]);
    (productService.delete as any).mockResolvedValue({});

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Churros')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Eliminar Churros/i }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar producto' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(productService.delete).toHaveBeenCalledWith('1');
      expect(screen.queryByText('Churros')).not.toBeInTheDocument();
    });
  });

  // ---------- NEW TESTS FOR COVERAGE ----------

  it('cancels delete via the cancel button on ConfirmDialog (lines 99-100)', async () => {
    (productService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Churros',
        category: 'Postres',
        base_price: 50,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Churros')).toBeInTheDocument();
    });

    // Click delete to open confirmation dialog
    fireEvent.click(screen.getByRole('button', { name: /Eliminar Churros/i }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar producto' });
    expect(dialog).toBeInTheDocument();

    // Click cancel
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    // Dialog should close, product still present
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Churros')).toBeInTheDocument();
    expect(productService.delete).not.toHaveBeenCalled();
  });

  it('sorts products by name column when clicking column header (lines 160-162)', async () => {
    (productService.getAll as any).mockResolvedValue([
      { id: '1', name: 'Churros', category: 'Postres', base_price: 50 },
      { id: '2', name: 'Arroz', category: 'Comida', base_price: 30 },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Churros')).toBeInTheDocument();
    });

    // The name column header is sortable
    const nameHeader = screen.getByText('Nombre', { selector: 'th' });

    // Initial sort is ascending by name, so Arroz should be first
    const rows = screen.getAllByRole('row');
    // rows[0] is the header, rows[1] is first data row
    expect(within(rows[1]).getByText('Arroz')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Churros')).toBeInTheDocument();

    // Click to toggle to descending
    fireEvent.click(nameHeader);

    await waitFor(() => {
      const updatedRows = screen.getAllByRole('row');
      expect(within(updatedRows[1]).getByText('Churros')).toBeInTheDocument();
      expect(within(updatedRows[2]).getByText('Arroz')).toBeInTheDocument();
    });
  });

  it('sorts products by category column (lines 168-170)', async () => {
    (productService.getAll as any).mockResolvedValue([
      { id: '1', name: 'Churros', category: 'Postres', base_price: 50 },
      { id: '2', name: 'Tacos', category: 'Comida', base_price: 80 },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Churros')).toBeInTheDocument();
    });

    // Click on "Categoría" column header
    const categoryHeader = screen.getByText('Categoría', { selector: 'th' });
    fireEvent.click(categoryHeader);

    // Ascending by category: Comida < Postres
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('Tacos')).toBeInTheDocument(); // Comida first
      expect(within(rows[2]).getByText('Churros')).toBeInTheDocument(); // Postres second
    });
  });

  it('sorts products by base_price column (lines 176)', async () => {
    (productService.getAll as any).mockResolvedValue([
      { id: '1', name: 'Churros', category: 'Postres', base_price: 50 },
      { id: '2', name: 'Tacos', category: 'Comida', base_price: 80 },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Churros')).toBeInTheDocument();
    });

    // Click on "Precio Base" column header
    const priceHeader = screen.getByText('Precio', { selector: 'th' });
    fireEvent.click(priceHeader);

    // Ascending by base_price: 50 < 80
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('$50.00')).toBeInTheDocument();
      expect(within(rows[2]).getByText('$80.00')).toBeInTheDocument();
    });

    // Click again to toggle to descending
    fireEvent.click(priceHeader);

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(within(rows[1]).getByText('$80.00')).toBeInTheDocument();
      expect(within(rows[2]).getByText('$50.00')).toBeInTheDocument();
    });
  });

  it('shows empty state with action link when no products and no search term', async () => {
    (productService.getAll as any).mockResolvedValue([]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('No hay productos')).toBeInTheDocument();
    });
    expect(screen.getByText('Comienza agregando tu primer producto.')).toBeInTheDocument();
    // The "Agregar Producto" action link should be present
    expect(screen.getByText('Agregar Producto')).toBeInTheDocument();
  });

  it('shows empty state without action link when search term filters everything out', async () => {
    (productService.getAll as any).mockResolvedValue([
      { id: '1', name: 'Churros', category: 'Postres', base_price: 50 },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Churros')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Buscar producto...'), {
      target: { value: 'ZZZZZ' },
    });

    expect(screen.getByText('No hay productos')).toBeInTheDocument();
    expect(screen.getByText('No se encontraron productos con ese criterio.')).toBeInTheDocument();
    // Should NOT show the "Agregar Producto" action
    expect(screen.queryByText('Agregar Producto')).not.toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    (productService.getAll as any).mockReturnValue(new Promise(() => {})); // never resolves

    renderList();

    expect(screen.getByText('Cargando productos...')).toBeInTheDocument();
  });

  it('shows error toast when delete fails', async () => {
    (productService.getAll as any).mockResolvedValue([
      { id: '1', name: 'Churros', category: 'Postres', base_price: 50 },
    ]);
    (productService.delete as any).mockRejectedValue(new Error('Server error'));

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Churros')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Eliminar Churros/i }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar producto' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error deleting product', expect.any(Error));
    });
    // Product should still be displayed since delete failed
    expect(screen.getByText('Churros')).toBeInTheDocument();
  });

  it('handles null from getAll gracefully', async () => {
    (productService.getAll as any).mockResolvedValue(null);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('No hay productos')).toBeInTheDocument();
    });
  });

  it('logs error when fetching products fails', async () => {
    (productService.getAll as any).mockRejectedValue(new Error('fetch error'));

    renderList();

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error fetching products', expect.any(Error));
    });
  });
});
