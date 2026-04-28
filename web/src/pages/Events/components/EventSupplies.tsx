import { useState } from 'react';
import { Plus, Trash2, Lightbulb, Fuel } from 'lucide-react';
import { SupplySuggestion, InventoryItem } from '../../../types/entities';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface SelectedSupply {
  inventory_id: string;
  quantity: number;
  unit_cost: number;
  source: 'stock' | 'purchase';
  exclude_cost: boolean;
}

interface EventSuppliesProps {
  supplyInventory: InventoryItem[];
  selectedSupplies: SelectedSupply[];
  suggestions: SupplySuggestion[];
  onAddSupply: () => void;
  onRemoveSupply: (index: number) => void;
  onSupplyChange: (index: number, field: keyof SelectedSupply, value: string | number | boolean) => void;
  onQuickAddSuggestion: (inventoryId: string, suggestedQty: number, unitCost: number) => void;
}

import { useTranslation } from 'react-i18next';

export const EventSupplies: React.FC<EventSuppliesProps> = ({
  supplyInventory,
  selectedSupplies,
  suggestions,
  onAddSupply,
  onRemoveSupply,
  onSupplyChange,
  onQuickAddSuggestion,
}) => {
  const { t, i18n } = useTranslation(['events', 'common']);
  const moneyLocale = i18n.language === 'en' ? 'en-US' : 'es-MX';
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const pendingDeleteName = pendingDeleteIndex !== null
    ? supplyInventory.find(s => s.id === selectedSupplies[pendingDeleteIndex]?.inventory_id)?.ingredient_name
    : null;

  const getSupplyItem = (inventoryId: string) => {
    return supplyInventory.find(s => s.id === inventoryId);
  };

  // Filter suggestions to only show items not already selected
  const availableSuggestions = suggestions.filter(
    s => !selectedSupplies.some(sup => sup.inventory_id === s.id)
  );

  const totalSupplyCost = selectedSupplies.reduce(
    (sum, s) => sum + (s.exclude_cost ? 0 : s.quantity * s.unit_cost), 0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Fuel className="h-5 w-5 text-warning" />
        <h3 className="text-lg font-medium text-text">{t('events:supplies.title')}</h3>
      </div>

      <p className="text-sm text-text-tertiary">
        {t('events:supplies.description')}
      </p>

      {/* Auto-suggestions from products */}
      {availableSuggestions.length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-warning font-medium text-sm mb-2">
            <Lightbulb className="h-4 w-4" />
            {t('events:supplies.suggestions')}
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => onQuickAddSuggestion(s.id, s.suggested_quantity, s.unit_cost)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-warning/10 text-warning rounded-lg hover:bg-warning/20 transition-colors"
              >
                <Plus className="h-3 w-3" />
                {s.ingredient_name} ×{s.suggested_quantity} ({s.unit_cost.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}/{s.unit})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Supply list */}
      {selectedSupplies.map((item, index) => {
        const inventoryItem = getSupplyItem(item.inventory_id);
        return (
          <div
            key={index}
            className="bg-surface-alt p-4 rounded-xl relative group border border-border shadow-xs"
          >
            <button
              type="button"
              onClick={() => setPendingDeleteIndex(index)}
              className="absolute top-2 right-2 text-text-secondary hover:text-error transition-colors"
              aria-label={t('events:supplies.delete_button', { index: index + 1 })}
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <div className="mb-2 pr-6">
              <label htmlFor={`supply-select-${index}`} className="block text-xs text-text-secondary mb-1">{t('events:supplies.label')}</label>
              <select
                id={`supply-select-${index}`}
                value={item.inventory_id}
                onChange={(e) => {
                  onSupplyChange(index, 'inventory_id', e.target.value);
                  // Auto-fill unit_cost from inventory
                  const inv = supplyInventory.find(i => i.id === e.target.value);
                  if (inv) {
                    onSupplyChange(index, 'unit_cost', inv.unit_cost || 0);
                  }
                }}
                className="block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 bg-card text-text p-2 border"
              >
                <option value="">{t('events:supplies.select_item')}</option>
                {supplyInventory.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.ingredient_name} ({s.current_stock} {s.unit} {t('common:available')} — {s.unit_cost?.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}/{s.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <div className="w-full sm:w-1/4">
                <label htmlFor={`supply-qty-${index}`} className="text-xs text-text-secondary block mb-1">{t('common:quantity')}</label>
                <input
                  id={`supply-qty-${index}`}
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={item.quantity}
                  onChange={(e) => onSupplyChange(index, 'quantity', Number(e.target.value))}
                  className="block w-full text-sm border-border rounded-xl shadow-xs focus:ring-2 focus:ring-primary/20 p-2 border bg-card text-text transition-shadow"
                />
              </div>

              <div className="w-full sm:w-1/4">
                <label htmlFor={`supply-cost-${index}`} className="text-xs text-text-secondary block mb-1">
                  {t('events:supplies.cost_unit')}/{inventoryItem?.unit || t('common:units').toLowerCase()}
                </label>
                <input
                  id={`supply-cost-${index}`}
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_cost}
                  onChange={(e) => onSupplyChange(index, 'unit_cost', Number(e.target.value))}
                  className="block w-full text-sm border-border rounded-xl shadow-xs focus:ring-2 focus:ring-primary/20 p-2 border bg-card text-text transition-shadow"
                />
              </div>

              <div className="w-full sm:w-1/4">
                <label htmlFor={`supply-source-${index}`} className="text-xs text-text-secondary block mb-1">{t('events:supplies.source')}</label>
                <select
                  id={`supply-source-${index}`}
                  value={item.source}
                  onChange={(e) => {
                    onSupplyChange(index, 'source', e.target.value);
                    if (e.target.value === 'purchase') {
                      onSupplyChange(index, 'exclude_cost', false);
                    }
                  }}
                  className="block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 bg-card text-text p-2 border"
                >
                  <option value="purchase">{t('events:supplies.source_purchase')}</option>
                  <option value="stock">{t('events:supplies.source_stock')}</option>
                </select>
              </div>

              {item.source === 'stock' && (
              <div className="w-full sm:w-auto flex items-center gap-2 sm:pt-5">
                <input
                  id={`supply-exclude-cost-${index}`}
                  type="checkbox"
                  checked={item.exclude_cost || false}
                  onChange={(e) => onSupplyChange(index, 'exclude_cost', e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-border rounded-sm bg-card"
                />
                <label
                  htmlFor={`supply-exclude-cost-${index}`}
                  className="text-xs text-text-secondary whitespace-nowrap"
                >
                  {t('events:supplies.no_cost')}
                </label>
              </div>
              )}

              <div className="w-full sm:w-1/4 text-right sm:pt-5">
                <span className={`text-sm font-semibold ${
                  item.exclude_cost
                    ? 'line-through text-text-tertiary'
                    : 'text-warning'
                }`}>
                  {(item.quantity * item.unit_cost).toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}
                </span>
              </div>
            </div>

            {item.inventory_id && item.source === 'stock' && inventoryItem && (
              <div className="mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
                  inventoryItem.current_stock >= item.quantity
                    ? 'bg-success/10 text-success border border-success/20'
                    : 'bg-error/10 text-error border border-error/20'
                }`}>
                  {t('common:stock')}: {inventoryItem.current_stock} {inventoryItem.unit}
                  {inventoryItem.current_stock < item.quantity && ` — ${t('common:insufficient')}`}
                </span>
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddSupply}
        className="w-full flex items-center justify-center px-4 py-2 border border-border shadow-xs text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt transition-colors"
      >
        <Plus className="h-4 w-4 mr-2" /> {t('events:supplies.add')}
      </button>

      {selectedSupplies.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
          <span className="text-sm text-text-secondary">
            {t('events:supplies.total_cost')}
          </span>
          <span className="text-lg font-bold text-warning">
            {totalSupplyCost.toLocaleString(moneyLocale, { style: 'currency', currency: 'MXN' })}
          </span>
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteIndex !== null}
        title={t('events:supplies.delete_confirm_title')}
        description={pendingDeleteName
          ? t('events:supplies.delete_confirm_desc', { name: pendingDeleteName })
          : t('events:supplies.delete_confirm_desc_generic')}
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        onConfirm={() => {
          if (pendingDeleteIndex !== null) onRemoveSupply(pendingDeleteIndex);
          setPendingDeleteIndex(null);
        }}
        onCancel={() => setPendingDeleteIndex(null)}
      />
    </div>
  );
};
