import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InventoryDetails } from './InventoryDetails';
import { inventoryService } from '../../services/inventoryService';
import { logError } from '../../lib/errorHandler';

let mockParams: { id?: string } = { id: 'inv-1' };
const mockNavigate = vi.fn();
const mockAddToast = vi.fn();

vi.mock('../../services/inventoryService', () => ({
  inventoryService: { getById: vi.fn(), delete: vi.fn() },
}));
vi.mock('../../lib/errorHandler', () => ({ logError: vi.fn() }));
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
    await waitFor(() => expect(screen.getByText('Harina')).toBeInTheDocument());
    expect(screen.getByText('Ingrediente Consumible')).toBeInTheDocument();
    expect(screen.getByText('$2.50')).toBeInTheDocument();
    expect(screen.getByText('$250.00')).toBeInTheDocument();
  });

  it('renders equipment type badge', async () => {
    (inventoryService.getById as any).mockResolvedValue({ ...baseItem, type: 'equipment' });
    renderDetails();
    await waitFor(() => expect(screen.getByText('Activo / Equipo')).toBeInTheDocument());
  });

  it('shows low stock alert when current_stock <= minimum_stock', async () => {
    (inventoryService.getById as any).mockResolvedValue({ ...baseItem, current_stock: 15 });
    renderDetails();
    await waitFor(() => expect(screen.getByText(/stock está por debajo/i)).toBeInTheDocument());
  });

  it('shows optimal stock message when stock is sufficient', async () => {
    (inventoryService.getById as any).mockResolvedValue(baseItem);
    renderDetails();
    await waitFor(() => expect(screen.getByText(/niveles óptimos/i)).toBeInTheDocument());
  });

  it('shows error state on fetch failure', async () => {
    (inventoryService.getById as any).mockRejectedValue(new Error('fail'));
    renderDetails();
    await waitFor(() =>
      expect(screen.getByText('Error al cargar los datos del ítem.')).toBeInTheDocument()
    );
    expect(logError).toHaveBeenCalledWith('Error fetching inventory item details', expect.any(Error));
  });

  it('shows not found when item is null', async () => {
    (inventoryService.getById as any).mockResolvedValue(null);
    renderDetails();
    await waitFor(() =>
      expect(screen.getByText('Ítem de inventario no encontrado')).toBeInTheDocument()
    );
  });

  it('navigates back on error state button click', async () => {
    (inventoryService.getById as any).mockRejectedValue(new Error('fail'));
    renderDetails();
    await waitFor(() => screen.getByText('Volver a inventario'));
    fireEvent.click(screen.getByText('Volver a inventario'));
    expect(mockNavigate).toHaveBeenCalledWith('/inventory');
  });

  it('has edit link to correct path', async () => {
    (inventoryService.getById as any).mockResolvedValue(baseItem);
    renderDetails();
    await waitFor(() => screen.getByText('Harina'));
    expect(screen.getByText('Editar').closest('a')).toHaveAttribute('href', '/inventory/inv-1/edit');
  });

  it('deletes item successfully', async () => {
    (inventoryService.getById as any).mockResolvedValue(baseItem);
    (inventoryService.delete as any).mockResolvedValue({});
    renderDetails();
    await waitFor(() => screen.getByText('Harina'));

    fireEvent.click(screen.getByText('Eliminar'));
    // Dialog confirm button (bg-red-600) is first in DOM, page button is second
    const confirmButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    fireEvent.click(confirmButtons[0]);

    await waitFor(() => {
      expect(inventoryService.delete).toHaveBeenCalledWith('inv-1');
      expect(mockNavigate).toHaveBeenCalledWith('/inventory');
      expect(mockAddToast).toHaveBeenCalledWith('Ítem eliminado correctamente.', 'success');
    });
  });

  it('handles delete error', async () => {
    (inventoryService.getById as any).mockResolvedValue(baseItem);
    (inventoryService.delete as any).mockRejectedValue(new Error('del fail'));
    renderDetails();
    await waitFor(() => screen.getByText('Harina'));

    fireEvent.click(screen.getByText('Eliminar'));
    const confirmButtons = screen.getAllByRole('button', { name: 'Eliminar' });
    fireEvent.click(confirmButtons[0]);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error deleting inventory item', expect.any(Error));
      expect(mockAddToast).toHaveBeenCalledWith('Error al eliminar el ítem de inventario.', 'error');
    });
  });

  it('cancels delete via confirm dialog', async () => {
    (inventoryService.getById as any).mockResolvedValue(baseItem);
    renderDetails();
    await waitFor(() => screen.getByText('Harina'));

    fireEvent.click(screen.getByText('Eliminar'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(inventoryService.delete).not.toHaveBeenCalled();
  });

  it('shows $0.00 for null unit_cost', async () => {
    (inventoryService.getById as any).mockResolvedValue({ ...baseItem, unit_cost: null });
    renderDetails();
    await waitFor(() => screen.getByText('Harina'));
    const zeroPrices = screen.getAllByText('$0.00');
    expect(zeroPrices.length).toBeGreaterThanOrEqual(1);
  });
});
