import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@tests/customRender';
import { EventSupplies } from './EventSupplies';
import { InventoryItem, SupplySuggestion } from '../../../types/entities';

const mockSupplyInventory = [
  { id: 'inv1', ingredient_name: 'Aceite', current_stock: 10, unit: 'L', unit_cost: 25, user_id: 'u1', minimum_stock: 2, last_updated: '2025-01-01', type: 'supply' as const },
  { id: 'inv2', ingredient_name: 'Gas', current_stock: 5, unit: 'tanque', unit_cost: 300, user_id: 'u1', minimum_stock: 1, last_updated: '2025-01-01', type: 'supply' as const },
] as InventoryItem[];

const defaultProps = {
  supplyInventory: mockSupplyInventory,
  selectedSupplies: [] as any[],
  suggestions: [] as SupplySuggestion[],
  onAddSupply: vi.fn(),
  onRemoveSupply: vi.fn(),
  onSupplyChange: vi.fn(),
  onQuickAddSuggestion: vi.fn(),
};

describe('EventSupplies', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders section title', () => {
    render(<EventSupplies {...defaultProps} />);
    expect(screen.getByText('Insumos por Evento')).toBeInTheDocument();
  });

  it('renders add supply button', () => {
    render(<EventSupplies {...defaultProps} />);
    expect(screen.getByText(/Agregar Insumo por Evento/)).toBeInTheDocument();
  });

  it('calls onAddSupply when add button clicked', () => {
    const onAddSupply = vi.fn();
    render(<EventSupplies {...defaultProps} onAddSupply={onAddSupply} />);
    fireEvent.click(screen.getByText(/Agregar Insumo por Evento/));
    expect(onAddSupply).toHaveBeenCalledTimes(1);
  });

  it('renders selected supplies with remove button', () => {
    const supplies = [
      { inventory_id: 'inv1', quantity: 2, unit_cost: 25, source: 'purchase' as const, exclude_cost: false },
    ];
    render(<EventSupplies {...defaultProps} selectedSupplies={supplies} />);
    // "Aceite" appears inside an <option> as part of "Aceite (10 L disp. — $25/L)"
    expect(screen.getByText(/Aceite/)).toBeInTheDocument();
    expect(screen.getByLabelText('Eliminar insumo 1')).toBeInTheDocument();
  });

  it('calls onRemoveSupply when remove button clicked', () => {
    const onRemoveSupply = vi.fn();
    const supplies = [
      { inventory_id: 'inv1', quantity: 2, unit_cost: 25, source: 'purchase' as const, exclude_cost: false },
    ];
    render(<EventSupplies {...defaultProps} selectedSupplies={supplies} onRemoveSupply={onRemoveSupply} />);
    fireEvent.click(screen.getByLabelText('Eliminar insumo 1'));
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar$/ }));
    expect(onRemoveSupply).toHaveBeenCalledWith(0);
  });

  it('shows total cost when supplies are selected', () => {
    const supplies = [
      { inventory_id: 'inv1', quantity: 2, unit_cost: 25, source: 'purchase' as const, exclude_cost: false },
    ];
    render(<EventSupplies {...defaultProps} selectedSupplies={supplies} />);
    expect(screen.getByText('Costo total insumos por evento')).toBeInTheDocument();
  });

  it('does not show total cost when no supplies selected', () => {
    render(<EventSupplies {...defaultProps} />);
    expect(screen.queryByText('Costo total insumos por evento')).not.toBeInTheDocument();
  });

  it('shows suggestions when available', () => {
    const suggestions = [
      { id: 'inv1', ingredient_name: 'Aceite', suggested_quantity: 2, unit_cost: 25, unit: 'L', current_stock: 10 } as SupplySuggestion,
    ];
    render(<EventSupplies {...defaultProps} suggestions={suggestions} />);
    expect(screen.getByText(/Insumos sugeridos por tus productos/)).toBeInTheDocument();
    expect(screen.getByText(/Aceite/)).toBeInTheDocument();
  });

  it('filters out already selected suggestions', () => {
    const suggestions = [
      { id: 'inv1', ingredient_name: 'Aceite', suggested_quantity: 2, unit_cost: 25, unit: 'L', current_stock: 10 } as SupplySuggestion,
    ];
    const supplies = [
      { inventory_id: 'inv1', quantity: 2, unit_cost: 25, source: 'purchase' as const, exclude_cost: false },
    ];
    render(<EventSupplies {...defaultProps} selectedSupplies={supplies} suggestions={suggestions} />);
    expect(screen.queryByText(/Insumos sugeridos/)).not.toBeInTheDocument();
  });

  it('shows stock badge for stock items', () => {
    const supplies = [
      { inventory_id: 'inv1', quantity: 2, unit_cost: 25, source: 'stock' as const, exclude_cost: false },
    ];
    render(<EventSupplies {...defaultProps} selectedSupplies={supplies} />);
    expect(screen.getByText(/Stock: 10 L/)).toBeInTheDocument();
  });

  it('shows insufficient stock warning', () => {
    const supplies = [
      { inventory_id: 'inv1', quantity: 20, unit_cost: 25, source: 'stock' as const, exclude_cost: false },
    ];
    render(<EventSupplies {...defaultProps} selectedSupplies={supplies} />);
    expect(screen.getByText(/Insuficiente/)).toBeInTheDocument();
  });

  it('shows exclude cost checkbox for stock items', () => {
    const supplies = [
      { inventory_id: 'inv1', quantity: 2, unit_cost: 25, source: 'stock' as const, exclude_cost: false },
    ];
    render(<EventSupplies {...defaultProps} selectedSupplies={supplies} />);
    expect(screen.getByText('Sin costo')).toBeInTheDocument();
  });

  it('applies strikethrough to excluded cost items', () => {
    const supplies = [
      { inventory_id: 'inv1', quantity: 2, unit_cost: 25, source: 'stock' as const, exclude_cost: true },
    ];
    render(<EventSupplies {...defaultProps} selectedSupplies={supplies} />);
    const costElement = screen.getByText('$50.00');
    expect(costElement.className).toContain('line-through');
  });
});
