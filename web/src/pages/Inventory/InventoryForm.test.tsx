import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { InventoryForm } from './InventoryForm';
import { logError } from '../../lib/errorHandler';
import { inventoryService } from '../../services/inventoryService';

const mockNavigate = vi.fn();
let mockParams: { id?: string } = {};

const mockAddToast = vi.fn();

vi.mock('../../services/inventoryService', () => ({
  inventoryService: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((error: unknown, defaultMessage?: string) => {
    if (error instanceof Error) return error.message;
    return defaultMessage || 'Ocurrió un error';
  }),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    addToast: mockAddToast,
    removeToast: vi.fn(),
    toasts: [],
  }),
}));

let mockPlanLimits = {
  canCreateInventoryItem: true,
  inventoryCount: 5,
  inventoryLimit: 30,
  loading: false,
};

vi.mock('../../hooks/usePlanLimits', () => ({
  usePlanLimits: () => mockPlanLimits,
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
      <InventoryForm />
    </MemoryRouter>
  );

describe('InventoryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    mockPlanLimits = {
      canCreateInventoryItem: true,
      inventoryCount: 5,
      inventoryLimit: 30,
      loading: false,
    };
  });

  it('shows validation errors', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(screen.getByText(/El nombre debe tener al menos 2 caracteres/i)).toBeInTheDocument();
      expect(screen.getByText(/La unidad es requerida/i)).toBeInTheDocument();
    });
  });

  it('creates inventory item', async () => {
    (inventoryService.create as any).mockResolvedValue({});
    const { container } = renderForm();

    fireEvent.change(container.querySelector('input[name="ingredient_name"]')!, {
      target: { value: 'Harina' },
    });
    fireEvent.change(container.querySelector('select[name="unit"]')!, {
      target: { value: 'kg' },
    });
    fireEvent.change(container.querySelector('input[name="current_stock"]')!, {
      target: { value: '5' },
    });
    fireEvent.change(container.querySelector('input[name="minimum_stock"]')!, {
      target: { value: '2' },
    });
    fireEvent.change(container.querySelector('input[name="unit_cost"]')!, {
      target: { value: '10' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(inventoryService.create).toHaveBeenCalledWith({
        ingredient_name: 'Harina',
        type: 'ingredient',
        current_stock: 5,
        minimum_stock: 2,
        unit: 'kg',
        unit_cost: 10,
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/inventory');
  });

  it('loads and updates inventory item', async () => {
    mockParams = { id: 'inv-1' };
    (inventoryService.getById as any).mockResolvedValue({
      id: 'inv-1',
      ingredient_name: 'Harina',
      type: 'ingredient',
      current_stock: 5,
      minimum_stock: 2,
      unit: 'kg',
      unit_cost: 10,
    });
    (inventoryService.update as any).mockResolvedValue({});

    const { container } = renderForm();

    await waitFor(() => {
      expect((container.querySelector('input[name="ingredient_name"]') as HTMLInputElement).value).toBe('Harina');
    });

    fireEvent.change(container.querySelector('input[name="current_stock"]')!, {
      target: { value: '7' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(inventoryService.update).toHaveBeenCalledWith('inv-1', {
        ingredient_name: 'Harina',
        type: 'ingredient',
        current_stock: 7,
        minimum_stock: 2,
        unit: 'kg',
        unit_cost: 10,
      });
    });
  });

  it('updates inventory item with null cost', async () => {
    mockParams = { id: 'inv-1' };
    (inventoryService.getById as any).mockResolvedValue({
      id: 'inv-1',
      ingredient_name: 'Horno',
      type: 'equipment',
      current_stock: 1,
      minimum_stock: 0,
      unit: 'pieza',
      unit_cost: 0,
    });
    (inventoryService.update as any).mockResolvedValue({});

    const { container } = renderForm();

    await waitFor(() => {
      expect((container.querySelector('input[name="ingredient_name"]') as HTMLInputElement).value).toBe('Horno');
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(inventoryService.update).toHaveBeenCalledWith('inv-1', {
        ingredient_name: 'Horno',
        type: 'equipment',
        current_stock: 1,
        minimum_stock: 0,
        unit: 'pieza',
        unit_cost: null,
      });
    });
  });

  it('shows error when load fails', async () => {
    mockParams = { id: 'inv-1' };
    (inventoryService.getById as any).mockRejectedValue(new Error('Network error'));

    renderForm();

    await waitFor(() => {
      expect(inventoryService.getById).toHaveBeenCalledWith('inv-1');
    });
  });

  it('shows error when save fails', async () => {
    (inventoryService.create as any).mockRejectedValue(new Error('fail'));

    const { container } = renderForm();

    fireEvent.change(container.querySelector('input[name="ingredient_name"]')!, {
      target: { value: 'Harina' },
    });
    fireEvent.change(container.querySelector('select[name="unit"]')!, {
      target: { value: 'kg' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(inventoryService.create).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error creating inventory item', expect.any(Error));
    });
  });

  // ---------- NEW TESTS FOR COVERAGE ----------

  it('shows loading spinner when plan limits are loading', () => {
    mockPlanLimits = {
      canCreateInventoryItem: true,
      inventoryCount: 0,
      inventoryLimit: 30,
      loading: true,
    };

    renderForm();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Cargando límites de plan...')).toBeInTheDocument();
  });

  it('shows UpgradeBanner when catalog limit is reached on new form', () => {
    mockPlanLimits = {
      canCreateInventoryItem: false,
      inventoryCount: 30,
      inventoryLimit: 30,
      loading: false,
    };

    renderForm();

    expect(screen.getByText(/Límite de Catálogo Alcanzado/i)).toBeInTheDocument();
    expect(screen.getByText('Regresar')).toBeInTheDocument();
  });

  it('navigates back when clicking Regresar on limit-reached view', () => {
    mockPlanLimits = {
      canCreateInventoryItem: false,
      inventoryCount: 30,
      inventoryLimit: 30,
      loading: false,
    };

    renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Regresar a la página anterior|Volver/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('does not show UpgradeBanner when editing an existing item even if limit reached', async () => {
    mockParams = { id: 'inv-1' };
    mockPlanLimits = {
      canCreateInventoryItem: false,
      inventoryCount: 30,
      inventoryLimit: 30,
      loading: false,
    };
    (inventoryService.getById as any).mockResolvedValue({
      id: 'inv-1',
      ingredient_name: 'Harina',
      type: 'ingredient',
      current_stock: 5,
      minimum_stock: 2,
      unit: 'kg',
      unit_cost: 10,
    });

    renderForm();

    await waitFor(() => {
      expect(screen.getByText('Editar Ítem')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Límite de Catálogo Alcanzado/i)).not.toBeInTheDocument();
  });

  it('renders "Nuevo Ítem" heading when creating', () => {
    renderForm();

    expect(screen.getByRole('heading', { name: 'Nuevo Ítem' })).toBeInTheDocument();
  });

  it('renders "Editar Ítem" heading when editing', async () => {
    mockParams = { id: 'inv-1' };
    (inventoryService.getById as any).mockResolvedValue({
      id: 'inv-1',
      ingredient_name: 'Harina',
      type: 'ingredient',
      current_stock: 5,
      minimum_stock: 2,
      unit: 'kg',
      unit_cost: 10,
    });

    renderForm();

    await waitFor(() => {
      expect(screen.getByText('Editar Ítem')).toBeInTheDocument();
    });
  });

  it('navigates to /inventory when clicking back arrow button', () => {
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Volver a la lista de inventario|Volver/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/inventory');
  });

  it('navigates to /inventory when clicking Cancelar button', () => {
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Cancelar|action\.cancel/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/inventory');
  });

  it('renders all form fields with correct labels', () => {
    renderForm();

    expect(screen.getByLabelText(/Nombre del Ítem/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Unidad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Stock Actual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Stock Mínimo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Costo Unitario/i)).toBeInTheDocument();
  });

  it('has correct select options for type field', () => {
    renderForm();

    const typeSelect = screen.getByLabelText(/Tipo/i) as HTMLSelectElement;
    const options = typeSelect.querySelectorAll('option');

    expect(options).toHaveLength(3);
    expect(options[0]).toHaveValue('ingredient');
    expect(options[0]).toHaveTextContent('Insumo (Consumible)');
    expect(options[1]).toHaveValue('supply');
    expect(options[1]).toHaveTextContent('Insumo por Evento (Costo fijo por evento)');
    expect(options[2]).toHaveValue('equipment');
    expect(options[2]).toHaveTextContent('Activo / Equipo (Retornable)');
  });

  it('disables submit button while saving', async () => {
    let resolveCreate: (value: unknown) => void;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    (inventoryService.create as any).mockReturnValue(createPromise);

    const { container } = renderForm();

    fireEvent.change(container.querySelector('input[name="ingredient_name"]')!, {
      target: { value: 'Harina' },
    });
    fireEvent.change(container.querySelector('select[name="unit"]')!, {
      target: { value: 'kg' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(screen.getByText(/Guardando|action\.saving/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Guardando ítem/i });
    expect(submitBtn).toBeDisabled();

    resolveCreate!({});
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/inventory');
    });
  });

  it('creates item with equipment type selected', async () => {
    (inventoryService.create as any).mockResolvedValue({});
    const { container } = renderForm();

    fireEvent.change(container.querySelector('input[name="ingredient_name"]')!, {
      target: { value: 'Horno Industrial' },
    });
    fireEvent.change(container.querySelector('select[name="type"]')!, {
      target: { value: 'equipment' },
    });
    fireEvent.change(container.querySelector('select[name="unit"]')!, {
      target: { value: 'pieza' },
    });
    fireEvent.change(container.querySelector('input[name="current_stock"]')!, {
      target: { value: '3' },
    });
    fireEvent.change(container.querySelector('input[name="minimum_stock"]')!, {
      target: { value: '1' },
    });
    fireEvent.change(container.querySelector('input[name="unit_cost"]')!, {
      target: { value: '5000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(inventoryService.create).toHaveBeenCalledWith({
        ingredient_name: 'Horno Industrial',
        type: 'equipment',
        current_stock: 3,
        minimum_stock: 1,
        unit: 'pieza',
        unit_cost: 5000,
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/inventory');
  });

  it('shows fallback error message when save fails without message', async () => {
    (inventoryService.create as any).mockRejectedValue(new Error('create failed'));

    const { container } = renderForm();

    fireEvent.change(container.querySelector('input[name="ingredient_name"]')!, {
      target: { value: 'Harina' },
    });
    fireEvent.change(container.querySelector('select[name="unit"]')!, {
      target: { value: 'kg' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(inventoryService.create).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith(expect.any(String), 'error');
    });
  });

  it('shows error when getById rejects with a network error', async () => {
    mockParams = { id: 'inv-1' };
    (inventoryService.getById as any).mockRejectedValue(new Error('Network error'));

    renderForm();

    await waitFor(() => {
      expect(inventoryService.getById).toHaveBeenCalledWith('inv-1');
    });
  });

  it('sets aria-invalid on fields with errors', async () => {
    const { container } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(container.querySelector('input[name="ingredient_name"]')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it('loads item with null/undefined fields using defaults', async () => {
    mockParams = { id: 'inv-1' };
    (inventoryService.getById as any).mockResolvedValue({
      id: 'inv-1',
      ingredient_name: null,
      type: null,
      current_stock: null,
      minimum_stock: null,
      unit: null,
      unit_cost: null,
    });

    const { container } = renderForm();

    await waitFor(() => {
      expect((container.querySelector('input[name="ingredient_name"]') as HTMLInputElement).value).toBe('');
      expect((container.querySelector('select[name="type"]') as HTMLSelectElement).value).toBe('ingredient');
      expect((container.querySelector('input[name="current_stock"]') as HTMLInputElement).value).toBe('0');
      expect((container.querySelector('input[name="minimum_stock"]') as HTMLInputElement).value).toBe('0');
      expect((container.querySelector('select[name="unit"]') as HTMLInputElement).value).toBe('');
      expect((container.querySelector('input[name="unit_cost"]') as HTMLInputElement).value).toBe('0');
    });
  });

  it('shows validation errors for negative current_stock, minimum_stock, and unit_cost', async () => {
    const { container } = renderForm();

    // Fill required fields to pass their validations
    fireEvent.change(container.querySelector('input[name="ingredient_name"]')!, {
      target: { value: 'Test Item' },
    });
    fireEvent.change(container.querySelector('select[name="unit"]')!, {
      target: { value: 'kg' },
    });

    // Enter negative values for numeric fields
    fireEvent.change(container.querySelector('input[name="current_stock"]')!, {
      target: { value: '-5' },
    });
    fireEvent.change(container.querySelector('input[name="minimum_stock"]')!, {
      target: { value: '-3' },
    });
    fireEvent.change(container.querySelector('input[name="unit_cost"]')!, {
      target: { value: '-10' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(screen.getByText(/El stock no puede ser negativo/i)).toBeInTheDocument();
      expect(screen.getByText(/El stock mínimo no puede ser negativo/i)).toBeInTheDocument();
      expect(screen.getByText(/El costo no puede ser negativo/i)).toBeInTheDocument();
    });
  });
});
