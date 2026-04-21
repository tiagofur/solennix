import { render, screen, fireEvent } from '@tests/customRender';
import { EventEquipment } from './EventEquipment';
import { EquipmentConflict, EquipmentSuggestion, InventoryItem } from '../../../types/entities';

// ===== Shared test data =====

const mockEquipmentInventory: InventoryItem[] = [
  {
    id: 'eq-1',
    user_id: 'user-1',
    ingredient_name: 'Mantelería',
    current_stock: 20,
    minimum_stock: 5,
    unit: 'pzas',
    unit_cost: 50,
    last_updated: '2024-01-01',
    type: 'equipment',
  },
  {
    id: 'eq-2',
    user_id: 'user-1',
    ingredient_name: 'Sillas plegables',
    current_stock: 100,
    minimum_stock: 10,
    unit: 'pzas',
    unit_cost: 30,
    last_updated: '2024-01-01',
    type: 'equipment',
  },
  {
    id: 'eq-3',
    user_id: 'user-1',
    ingredient_name: 'Mesas redondas',
    current_stock: 15,
    minimum_stock: 2,
    unit: 'pzas',
    unit_cost: 120,
    last_updated: '2024-01-01',
    type: 'equipment',
  },
];

const mockSuggestions: EquipmentSuggestion[] = [
  { id: 'eq-1', ingredient_name: 'Mantelería', current_stock: 20, unit: 'pzas', type: 'equipment', suggested_quantity: 5 },
  { id: 'eq-2', ingredient_name: 'Sillas plegables', current_stock: 100, unit: 'pzas', type: 'equipment', suggested_quantity: 10 },
  { id: 'eq-3', ingredient_name: 'Mesas redondas', current_stock: 15, unit: 'pzas', type: 'equipment', suggested_quantity: 2 },
];

const defaultProps = {
  equipmentInventory: mockEquipmentInventory,
  selectedEquipment: [] as { inventory_id: string; quantity: number; notes: string }[],
  conflicts: [] as EquipmentConflict[],
  suggestions: [] as EquipmentSuggestion[],
  onAddEquipment: vi.fn(),
  onRemoveEquipment: vi.fn(),
  onEquipmentChange: vi.fn(),
  onQuickAddSuggestion: vi.fn(),
};

const renderComponent = (overrides: Partial<typeof defaultProps> = {}) => {
  const props = { ...defaultProps, ...overrides };
  return render(<EventEquipment {...props} />);
};

describe('EventEquipment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===== BASIC RENDERING =====

  it('renders the section header and description', () => {
    renderComponent();

    expect(screen.getByText('Asignación de Equipo')).toBeInTheDocument();
    expect(
      screen.getByText(/Asigna equipos y activos reutilizables a este evento/)
    ).toBeInTheDocument();
  });

  it('renders the "Agregar Equipo" button', () => {
    renderComponent();

    expect(screen.getByRole('button', { name: /Agregar Equipo/i })).toBeInTheDocument();
  });

  it('calls onAddEquipment when clicking the add button', () => {
    const onAddEquipment = vi.fn();
    renderComponent({ onAddEquipment });

    fireEvent.click(screen.getByRole('button', { name: /Agregar Equipo/i }));
    expect(onAddEquipment).toHaveBeenCalledTimes(1);
  });

  // ===== EMPTY STATE =====

  it('does not render equipment count when no equipment is selected', () => {
    renderComponent({ selectedEquipment: [] });

    expect(screen.queryByText(/equipo\(s\) asignado\(s\)/)).not.toBeInTheDocument();
  });

  // ===== SELECTED EQUIPMENT RENDERING =====

  it('renders selected equipment items with select, quantity, and notes', () => {
    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 5, notes: 'Llevar limpio' },
      ],
    });

    // Equipment select should have the right value
    const select = screen.getByLabelText('Equipo') as HTMLSelectElement;
    expect(select.value).toBe('eq-1');

    // Quantity input
    const quantityInput = screen.getByLabelText('Cantidad') as HTMLInputElement;
    expect(quantityInput.value).toBe('5');

    // Notes input
    const notesInput = screen.getByLabelText('Notas (opcional)') as HTMLInputElement;
    expect(notesInput.value).toBe('Llevar limpio');
  });

  it('renders all equipment options in the dropdown', () => {
    renderComponent({
      selectedEquipment: [
        { inventory_id: '', quantity: 1, notes: '' },
      ],
    });

    // Default option + 3 equipment items
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent('Seleccionar equipo');
    expect(options[1]).toHaveTextContent('Mantelería (20 pzas disp.)');
    expect(options[2]).toHaveTextContent('Sillas plegables (100 pzas disp.)');
    expect(options[3]).toHaveTextContent('Mesas redondas (15 pzas disp.)');
  });

  it('renders multiple selected equipment items', () => {
    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 5, notes: '' },
        { inventory_id: 'eq-2', quantity: 50, notes: 'Mesa principal' },
      ],
    });

    // Should show 2 remove buttons
    const removeButtons = screen.getAllByRole('button', { name: /Eliminar equipo/i });
    expect(removeButtons).toHaveLength(2);

    // Should show equipment count
    expect(screen.getByText(/2 equipo\(s\) asignado\(s\)/)).toBeInTheDocument();
  });

  it('shows "Sin costo - Activo reutilizable" badge when inventory_id is set', () => {
    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 1, notes: '' },
      ],
    });

    expect(screen.getByText('Sin costo - Activo reutilizable')).toBeInTheDocument();
  });

  it('does not show "Sin costo" badge when inventory_id is empty', () => {
    renderComponent({
      selectedEquipment: [
        { inventory_id: '', quantity: 1, notes: '' },
      ],
    });

    expect(screen.queryByText('Sin costo - Activo reutilizable')).not.toBeInTheDocument();
  });

  // ===== EQUIPMENT COUNT =====

  it('counts only equipment items with a selected inventory_id', () => {
    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 5, notes: '' },
        { inventory_id: '', quantity: 1, notes: '' },
        { inventory_id: 'eq-3', quantity: 2, notes: '' },
      ],
    });

    // Only eq-1 and eq-3 are counted (eq with empty inventory_id is not)
    expect(screen.getByText(/2 equipo\(s\) asignado\(s\)/)).toBeInTheDocument();
  });

  // ===== USER INTERACTIONS =====

  it('calls onRemoveEquipment with correct index', () => {
    const onRemoveEquipment = vi.fn();
    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 5, notes: '' },
        { inventory_id: 'eq-2', quantity: 10, notes: '' },
      ],
      onRemoveEquipment,
    });

    // Remove the second equipment (index 1)
    fireEvent.click(screen.getByRole('button', { name: /Eliminar equipo 2/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar$/ }));
    expect(onRemoveEquipment).toHaveBeenCalledWith(1);
  });

  it('calls onEquipmentChange when changing equipment select', () => {
    const onEquipmentChange = vi.fn();
    renderComponent({
      selectedEquipment: [
        { inventory_id: '', quantity: 1, notes: '' },
      ],
      onEquipmentChange,
    });

    fireEvent.change(screen.getByLabelText('Equipo'), { target: { value: 'eq-2' } });
    expect(onEquipmentChange).toHaveBeenCalledWith(0, 'inventory_id', 'eq-2');
  });

  it('calls onEquipmentChange when changing quantity', () => {
    const onEquipmentChange = vi.fn();
    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 1, notes: '' },
      ],
      onEquipmentChange,
    });

    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '10' } });
    expect(onEquipmentChange).toHaveBeenCalledWith(0, 'quantity', 10);
  });

  it('calls onEquipmentChange when changing notes', () => {
    const onEquipmentChange = vi.fn();
    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 1, notes: '' },
      ],
      onEquipmentChange,
    });

    fireEvent.change(screen.getByLabelText('Notas (opcional)'), {
      target: { value: 'Reservado para mesa principal' },
    });
    expect(onEquipmentChange).toHaveBeenCalledWith(0, 'notes', 'Reservado para mesa principal');
  });

  // ===== CONFLICTS =====

  it('renders conflict warning banner when conflicts exist', () => {
    const conflicts: EquipmentConflict[] = [
      {
        inventory_id: 'eq-1',
        equipment_name: 'Mantelería',
        conflicting_event_id: 'event-2',
        event_date: '2024-01-15',
        start_time: '10:00:00',
        end_time: '14:00:00',
        service_type: 'Boda',
        client_name: 'Carlos',
        conflict_type: 'overlap',
      },
    ];

    renderComponent({ conflicts });

    expect(screen.getByText('Conflictos de equipo detectados')).toBeInTheDocument();
    expect(screen.getByText(/Mantelería/)).toBeInTheDocument();
    expect(screen.getByText(/Boda/)).toBeInTheDocument();
    expect(screen.getByText(/10:00-14:00/)).toBeInTheDocument();
    expect(screen.getByText(/Carlos/)).toBeInTheDocument();
  });

  it('renders conflict as "todo el día" when no start/end time', () => {
    const conflicts: EquipmentConflict[] = [
      {
        inventory_id: 'eq-1',
        equipment_name: 'Mantelería',
        conflicting_event_id: 'event-2',
        event_date: '2024-01-15',
        start_time: null,
        end_time: null,
        service_type: 'Banquete',
        client_name: null,
        conflict_type: 'full_day',
      },
    ];

    renderComponent({ conflicts });

    expect(screen.getByText(/todo el día/)).toBeInTheDocument();
  });

  it('renders conflict without client name when client_name is null', () => {
    const conflicts: EquipmentConflict[] = [
      {
        inventory_id: 'eq-1',
        equipment_name: 'Mantelería',
        conflicting_event_id: 'event-2',
        event_date: '2024-01-15',
        start_time: '08:00:00',
        end_time: '12:00:00',
        service_type: 'XV Años',
        client_name: null,
        conflict_type: 'overlap',
      },
    ];

    renderComponent({ conflicts });

    expect(screen.getByText(/Mantelería/)).toBeInTheDocument();
    expect(screen.getByText(/XV Años/)).toBeInTheDocument();
    // Should NOT show client name separator/text
    const conflictText = screen.getByText(/en uso en otro evento/).textContent || '';
    expect(conflictText).not.toContain(',  )');
  });

  it('renders multiple conflicts', () => {
    const conflicts: EquipmentConflict[] = [
      {
        inventory_id: 'eq-1',
        equipment_name: 'Mantelería',
        conflicting_event_id: 'event-2',
        event_date: '2024-01-15',
        start_time: '10:00:00',
        end_time: '14:00:00',
        service_type: 'Boda',
        client_name: 'Carlos',
        conflict_type: 'overlap',
      },
      {
        inventory_id: 'eq-2',
        equipment_name: 'Sillas plegables',
        conflicting_event_id: 'event-3',
        event_date: '2024-01-15',
        start_time: null,
        end_time: null,
        service_type: 'Cumpleaños',
        client_name: 'Laura',
        conflict_type: 'full_day',
      },
    ];

    renderComponent({ conflicts });

    expect(screen.getByText(/Mantelería/)).toBeInTheDocument();
    expect(screen.getByText(/Sillas plegables/)).toBeInTheDocument();
  });

  it('does not show conflict banner when conflicts array is empty', () => {
    renderComponent({ conflicts: [] });

    expect(screen.queryByText('Conflictos de equipo detectados')).not.toBeInTheDocument();
  });

  it('shows "Conflicto" badge on equipment item that has a conflict', () => {
    const conflicts: EquipmentConflict[] = [
      {
        inventory_id: 'eq-1',
        equipment_name: 'Mantelería',
        conflicting_event_id: 'event-2',
        event_date: '2024-01-15',
        start_time: '10:00:00',
        end_time: '14:00:00',
        service_type: 'Boda',
        client_name: 'Carlos',
        conflict_type: 'overlap',
      },
    ];

    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 5, notes: '' },
      ],
      conflicts,
    });

    expect(screen.getByText('Conflicto')).toBeInTheDocument();
  });

  it('does not show "Conflicto" badge for items without conflicts', () => {
    const conflicts: EquipmentConflict[] = [
      {
        inventory_id: 'eq-2',
        equipment_name: 'Sillas plegables',
        conflicting_event_id: 'event-2',
        event_date: '2024-01-15',
        start_time: '10:00:00',
        end_time: '14:00:00',
        service_type: 'Boda',
        client_name: 'Carlos',
        conflict_type: 'overlap',
      },
    ];

    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 5, notes: '' },
      ],
      conflicts,
    });

    // eq-1 has no conflict, so no badge
    expect(screen.queryByText('Conflicto')).not.toBeInTheDocument();
  });

  it('applies amber border to equipment card with conflicts', () => {
    const conflicts: EquipmentConflict[] = [
      {
        inventory_id: 'eq-1',
        equipment_name: 'Mantelería',
        conflicting_event_id: 'event-2',
        event_date: '2024-01-15',
        start_time: '10:00:00',
        end_time: '14:00:00',
        service_type: 'Boda',
        client_name: 'Carlos',
        conflict_type: 'overlap',
      },
    ];

    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 5, notes: '' },
      ],
      conflicts,
    });

    // The card container should have the warning border class
    const card = screen.getByText('Conflicto').closest('.bg-surface-alt');
    expect(card?.className).toContain('border-warning/60');
  });

  it('applies default border to equipment card without conflicts', () => {
    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 5, notes: '' },
      ],
      conflicts: [],
    });

    const badge = screen.getByText('Sin costo - Activo reutilizable');
    const card = badge.closest('.bg-surface-alt');
    expect(card?.className).toContain('border-border');
    expect(card?.className).not.toContain('border-amber-400');
  });

  // ===== SUGGESTIONS =====

  it('renders suggestions when available', () => {
    renderComponent({
      suggestions: [mockSuggestions[0], mockSuggestions[1]],
    });

    expect(screen.getByText('Equipo sugerido por tus productos')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mantelería/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sillas plegables/i })).toBeInTheDocument();
  });

  it('calls onQuickAddSuggestion when clicking a suggestion', () => {
    const onQuickAddSuggestion = vi.fn();
    renderComponent({
      suggestions: [mockSuggestions[0]],
      onQuickAddSuggestion,
    });

    fireEvent.click(screen.getByRole('button', { name: /Mantelería/i }));
    expect(onQuickAddSuggestion).toHaveBeenCalledWith('eq-1', 5);
  });

  it('does not show suggestions that are already selected', () => {
    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 5, notes: '' },
      ],
      suggestions: [mockSuggestions[0], mockSuggestions[1]],
    });

    // Mantelería (eq-1) is already selected, should not appear as suggestion
    // But Sillas plegables (eq-2) should appear
    const suggestionSection = screen.getByText('Equipo sugerido por tus productos');
    expect(suggestionSection).toBeInTheDocument();

    // In the suggestion buttons, only "Sillas plegables" should appear
    const suggestionButtons = screen.getAllByRole('button').filter(
      btn => btn.textContent?.includes('Sillas plegables')
    );
    expect(suggestionButtons).toHaveLength(1);

    // Mantelería should NOT be in the suggestion area as a button
    // (it may appear in the equipment dropdown, but not as a suggestion button)
    const manteleriaButtons = screen.getAllByRole('button').filter(
      btn => btn.textContent?.includes('Mantelería') && btn.closest('.bg-blue-50, .dark\\:bg-blue-900\\/20')
    );
    expect(manteleriaButtons).toHaveLength(0);
  });

  it('hides suggestion section when all suggestions are already selected', () => {
    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 5, notes: '' },
      ],
      suggestions: [mockSuggestions[0]], // only eq-1, which is already selected
    });

    expect(screen.queryByText('Equipo sugerido por tus productos')).not.toBeInTheDocument();
  });

  it('does not show suggestion section when suggestions array is empty', () => {
    renderComponent({ suggestions: [] });

    expect(screen.queryByText('Equipo sugerido por tus productos')).not.toBeInTheDocument();
  });

  // ===== getEquipmentName HELPER =====

  it('returns empty string for unknown inventory_id (no crash)', () => {
    renderComponent({
      selectedEquipment: [
        { inventory_id: 'unknown-id', quantity: 1, notes: '' },
      ],
      conflicts: [
        {
          inventory_id: 'unknown-id',
          equipment_name: 'Unknown',
          conflicting_event_id: 'event-2',
          event_date: '2024-01-15',
          start_time: '10:00:00',
          end_time: '14:00:00',
          service_type: 'Boda',
          client_name: 'Ana',
          conflict_type: 'overlap',
        },
      ],
    });

    // Should not show "Conflicto" badge because getEquipmentName returns ''
    // which is falsy, so the condition `getEquipmentName(...) && itemConflicts.length > 0` is false
    expect(screen.queryByText('Conflicto')).not.toBeInTheDocument();
  });

  // ===== INTERACTION WITH MULTIPLE ITEMS =====

  it('handles interactions on specific items in a multi-item list', () => {
    const onEquipmentChange = vi.fn();
    const onRemoveEquipment = vi.fn();

    renderComponent({
      selectedEquipment: [
        { inventory_id: 'eq-1', quantity: 5, notes: 'Nota 1' },
        { inventory_id: 'eq-2', quantity: 10, notes: 'Nota 2' },
        { inventory_id: 'eq-3', quantity: 3, notes: '' },
      ],
      onEquipmentChange,
      onRemoveEquipment,
    });

    // Change quantity on the third item (index 2)
    const quantityInputs = screen.getAllByLabelText('Cantidad');
    fireEvent.change(quantityInputs[2], { target: { value: '7' } });
    expect(onEquipmentChange).toHaveBeenCalledWith(2, 'quantity', 7);

    // Remove the first item (index 0)
    fireEvent.click(screen.getByRole('button', { name: /Eliminar equipo 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Eliminar$/ }));
    expect(onRemoveEquipment).toHaveBeenCalledWith(0);

    // Equipment count: all 3 have inventory_id set
    expect(screen.getByText(/3 equipo\(s\) asignado\(s\)/)).toBeInTheDocument();
  });

  // ===== EDGE CASE: equipment with empty inventory_id =====

  it('handles equipment with empty inventory_id (no badge, no conflict badge)', () => {
    renderComponent({
      selectedEquipment: [
        { inventory_id: '', quantity: 1, notes: '' },
      ],
    });

    // No "Sin costo" badge when no equipment selected
    expect(screen.queryByText('Sin costo - Activo reutilizable')).not.toBeInTheDocument();
    // No conflict badge
    expect(screen.queryByText('Conflicto')).not.toBeInTheDocument();
  });
});
