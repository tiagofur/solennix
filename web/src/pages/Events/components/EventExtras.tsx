import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface SelectedExtra {
  description: string;
  cost: number;
  price: number;
  exclude_utility: boolean;
}

interface EventExtrasProps {
  extras: SelectedExtra[];
  onAddExtra: () => void;
  onRemoveExtra: (index: number) => void;
  onExtraChange: (index: number, field: keyof SelectedExtra, value: any) => void;
}

export const EventExtras: React.FC<EventExtrasProps> = ({
  extras,
  onAddExtra,
  onRemoveExtra,
  onExtraChange,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Extras (Transporte, Personal, etc.)</h3>

      {extras.map((item, index) => (
        <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md relative group mb-3">
          <button
            type="button"
            onClick={() => onRemoveExtra(index)}
            className="absolute top-1 right-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
            aria-label={`Eliminar extra ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="mb-2 pr-6">
            <label htmlFor={`extra-description-${index}`} className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Descripción</label>
            <input
              id={`extra-description-${index}`}
              type="text"
              placeholder="Descripción"
              value={item.description}
              onChange={(e) => onExtraChange(index, 'description', e.target.value)}
              className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:ring-brand-orange focus:border-brand-orange bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
              aria-label={`Descripción del extra ${index + 1}`}
            />
          </div>

          <div className="flex items-center mb-2">
            <input
              id={`extra-exclude-utility-${index}`}
              type="checkbox"
              checked={item.exclude_utility || false}
              onChange={(e) => onExtraChange(index, 'exclude_utility', e.target.checked)}
              className="h-4 w-4 text-brand-orange focus:ring-brand-orange border-gray-300 dark:border-gray-600 rounded-sm bg-white dark:bg-gray-600"
              aria-describedby={`extra-exclude-utility-label-${index}`}
            />
            <label id={`extra-exclude-utility-label-${index}`} htmlFor={`extra-exclude-utility-${index}`} className="ml-2 text-xs text-gray-500 dark:text-gray-400">
              Solo cobrar costo (Sin utilidad)
            </label>
          </div>

          <div className="flex gap-2">
            <div className="w-1/2">
              <label htmlFor={`extra-cost-${index}`} className="text-xs text-gray-500 dark:text-gray-400">Costo (Gasto)</label>
              <input
                id={`extra-cost-${index}`}
                type="number"
                value={item.cost}
                onChange={(e) => onExtraChange(index, 'cost', Number(e.target.value))}
                className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:ring-brand-orange focus:border-brand-orange bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                aria-label={`Costo del extra ${index + 1}`}
              />
            </div>
            <div className="w-1/2">
              <label htmlFor={`extra-price-${index}`} className="text-xs text-gray-500 dark:text-gray-400">Precio (Cobro)</label>
              <input
                id={`extra-price-${index}`}
                type="number"
                value={item.price}
                disabled={item.exclude_utility}
                onChange={(e) => onExtraChange(index, 'price', Number(e.target.value))}
                className={`block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-xs focus:ring-brand-orange focus:border-brand-orange bg-white dark:bg-gray-600 text-gray-900 dark:text-white ${
                  item.exclude_utility ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
                aria-label={`Precio de cobro del extra ${index + 1}`}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddExtra}
        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-xs text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        aria-label="Agregar un extra adicional"
      >
        <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Agregar Extra
      </button>

      <div className="mt-4 text-right">
        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Subtotal Extras:</span>
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          ${extras.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
};
