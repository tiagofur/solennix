import { Plus, Trash2, AlertTriangle, Lightbulb, Wrench } from 'lucide-react';
import { EquipmentConflict, EquipmentSuggestion, InventoryItem } from '../../../types/entities';

interface SelectedEquipment {
  inventory_id: string;
  quantity: number;
  notes: string;
}

interface EventEquipmentProps {
  equipmentInventory: InventoryItem[];
  selectedEquipment: SelectedEquipment[];
  conflicts: EquipmentConflict[];
  suggestions: EquipmentSuggestion[];
  onAddEquipment: () => void;
  onRemoveEquipment: (index: number) => void;
  onEquipmentChange: (index: number, field: keyof SelectedEquipment, value: string | number) => void;
  onQuickAddSuggestion: (inventoryId: string, suggestedQty: number) => void;
}

export const EventEquipment: React.FC<EventEquipmentProps> = ({
  equipmentInventory,
  selectedEquipment,
  conflicts,
  suggestions,
  onAddEquipment,
  onRemoveEquipment,
  onEquipmentChange,
  onQuickAddSuggestion,
}) => {
  const getEquipmentName = (inventoryId: string) => {
    return equipmentInventory.find(e => e.id === inventoryId)?.ingredient_name || '';
  };

  const getConflictsForItem = (inventoryId: string) => {
    return conflicts.filter(c => c.inventory_id === inventoryId);
  };

  // Filter suggestions to only show items not already selected
  const availableSuggestions = suggestions.filter(
    s => !selectedEquipment.some(eq => eq.inventory_id === s.id)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-medium text-text">Asignación de Equipo</h3>
      </div>

      <p className="text-sm text-text-tertiary">
        Asigna equipos y activos reutilizables a este evento. El equipo no afecta los costos del evento.
      </p>

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium text-sm">
            <AlertTriangle className="h-4 w-4" />
            Conflictos de equipo detectados
          </div>
          {conflicts.map((c, i) => (
            <div key={i} className="text-sm text-amber-600 dark:text-amber-400 ml-6">
              <strong>{c.equipment_name}</strong> en uso en otro evento
              ({c.service_type}
              {c.start_time && c.end_time ? `, ${c.start_time.slice(0, 5)}-${c.end_time.slice(0, 5)}` : ', todo el día'}
              {c.client_name ? `, ${c.client_name}` : ''})
            </div>
          ))}
        </div>
      )}

      {/* Auto-suggestions from products */}
      {availableSuggestions.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-primary font-medium text-sm mb-2">
            <Lightbulb className="h-4 w-4" />
            Equipo sugerido por tus productos
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => onQuickAddSuggestion(s.id, s.suggested_quantity)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
              >
                <Plus className="h-3 w-3" />
                {s.ingredient_name} ×{s.suggested_quantity}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Equipment list */}
      {selectedEquipment.map((item, index) => {
        const itemConflicts = getConflictsForItem(item.inventory_id);
        return (
          <div
            key={index}
            className={`bg-surface-alt p-4 rounded-xl relative group border shadow-xs ${
              itemConflicts.length > 0
                ? 'border-amber-400 dark:border-amber-600'
                : 'border-border'
            }`}
          >
            <button
              type="button"
              onClick={() => onRemoveEquipment(index)}
              className="absolute top-1 right-1 text-text-secondary hover:text-error transition-colors"
              aria-label={`Eliminar equipo ${index + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <div className="mb-2 pr-6">
              <label htmlFor={`equipment-select-${index}`} className="block text-xs text-text-secondary mb-1">Equipo</label>
              <select
                id={`equipment-select-${index}`}
                value={item.inventory_id}
                onChange={(e) => onEquipmentChange(index, 'inventory_id', e.target.value)}
                className="block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 bg-card text-text p-2 border"
              >
                <option value="">Seleccionar equipo</option>
                {equipmentInventory.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.ingredient_name} ({eq.current_stock} {eq.unit} disp.)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <div className="w-full sm:w-1/4">
                <label htmlFor={`eq-quantity-${index}`} className="text-xs text-text-secondary block mb-1">Cantidad</label>
                <input
                  id={`eq-quantity-${index}`}
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => onEquipmentChange(index, 'quantity', Number(e.target.value))}
                  className="block w-full text-sm border-border rounded-xl shadow-xs focus:ring-2 focus:ring-primary/20 p-2 border bg-card text-text transition-shadow"
                />
              </div>

              <div className="w-full sm:w-3/4">
                <label htmlFor={`eq-notes-${index}`} className="text-xs text-text-secondary block mb-1">Notas (opcional)</label>
                <input
                  id={`eq-notes-${index}`}
                  type="text"
                  value={item.notes}
                  onChange={(e) => onEquipmentChange(index, 'notes', e.target.value)}
                  placeholder="Ej: Llevar limpio, reservado para mesa principal..."
                  className="block w-full text-sm border-border rounded-xl shadow-xs focus:ring-2 focus:ring-primary/20 p-2 border bg-card text-text transition-shadow"
                />
              </div>
            </div>

            {item.inventory_id && (
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface-alt text-text-secondary border border-border">
                  Sin costo - Activo reutilizable
                </span>
                {getEquipmentName(item.inventory_id) && itemConflicts.length > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-3 w-3" />
                    Conflicto
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddEquipment}
        className="w-full flex items-center justify-center px-4 py-2 border border-border shadow-xs text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt transition-colors"
      >
        <Plus className="h-4 w-4 mr-2" /> Agregar Equipo
      </button>

      {selectedEquipment.length > 0 && (
        <div className="mt-4 text-right">
          <span className="text-sm text-text-tertiary">
            {selectedEquipment.filter(e => e.inventory_id).length} equipo(s) asignado(s) — Sin impacto en costos
          </span>
        </div>
      )}
    </div>
  );
};
