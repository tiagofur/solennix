import React, { useState } from 'react';
import { Plus, Trash2, ClipboardCheck } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { SortableItem } from '@/components/SortableItem';
import { ConfirmDialog } from '@/components/ConfirmDialog';

export interface SelectedExtra {
  description: string;
  cost: number;
  price: number;
  exclude_utility: boolean;
  include_in_checklist?: boolean;
}

interface EventExtrasProps {
  extras: SelectedExtra[];
  onAddExtra: () => void;
  onRemoveExtra: (index: number) => void;
  onExtraChange: (index: number, field: keyof SelectedExtra, value: string | number | boolean) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

import { useTranslation } from 'react-i18next';

export const EventExtras: React.FC<EventExtrasProps> = ({
  extras,
  onAddExtra,
  onRemoveExtra,
  onExtraChange,
  onReorder,
}) => {
  const { t, i18n } = useTranslation(['events', 'common']);
  const moneyLocale = i18n.language === 'en' ? 'en-US' : 'es-MX';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // Confirmacion previa al delete — paridad con mobile.
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const pendingDeleteExtra = pendingDeleteIndex !== null ? extras[pendingDeleteIndex] : null;

  // IDs determinísticos por índice — sin memoización para evitar
  // warnings del React Compiler sobre `[extras.length]` y porque el costo
  // de generar strings cortos es insignificante frente al riesgo de stale IDs.
  const itemIds = extras.map((_, i) => `extra-${i}`);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = itemIds.indexOf(String(active.id));
    const newIndex = itemIds.indexOf(String(over.id));
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(oldIndex, newIndex);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-text">{t('events:extras.title')}</h3>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {extras.map((item, index) => (
            <SortableItem key={itemIds[index]} id={itemIds[index]}>
              <div className="bg-surface-alt p-4 rounded-xl relative group mb-3 border border-border shadow-xs">
          <button
            type="button"
            onClick={() => setPendingDeleteIndex(index)}
            className="absolute top-2 right-2 text-text-secondary hover:text-error transition-colors"
            aria-label={t('events:extras.delete_button', { index: index + 1 })}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="mb-2 pr-6">
            <label htmlFor={`extra-description-${index}`} className="block text-xs text-text-secondary mb-1">
              {t('events:extras.description')}
            </label>
            <input
              id={`extra-description-${index}`}
              type="text"
              placeholder={t('events:extras.description')}
              value={item.description}
              onChange={(e) => onExtraChange(index, 'description', e.target.value)}
              className="block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 bg-card text-text p-2 border"
              aria-label={`${t('events:extras.description')} ${t('common:entities.extra')} ${index + 1}`}
            />
          </div>

          <div className="flex items-center gap-4 mb-2 flex-wrap">
            <div className="flex items-center">
              <input
                id={`extra-exclude-utility-${index}`}
                type="checkbox"
                checked={item.exclude_utility || false}
                onChange={(e) => onExtraChange(index, 'exclude_utility', e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded-sm bg-card"
                aria-describedby={`extra-exclude-utility-label-${index}`}
              />
              <label id={`extra-exclude-utility-label-${index}`} htmlFor={`extra-exclude-utility-${index}`} className="ml-2 text-xs text-text-secondary">
                {t('events:extras.exclude_utility')}
              </label>
            </div>
            <div className="flex items-center">
              <input
                id={`extra-include-checklist-${index}`}
                type="checkbox"
                checked={item.include_in_checklist !== false}
                onChange={(e) => onExtraChange(index, 'include_in_checklist', e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-border rounded-sm bg-card"
                aria-describedby={`extra-include-checklist-label-${index}`}
              />
              <label id={`extra-include-checklist-label-${index}`} htmlFor={`extra-include-checklist-${index}`} className="ml-2 text-xs text-text-secondary flex items-center gap-1">
                <ClipboardCheck className="h-3 w-3" aria-hidden="true" />
                {t('events:extras.include_checklist')}
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="w-1/2">
              <label htmlFor={`extra-cost-${index}`} className="text-xs text-text-secondary">
                {t('events:extras.cost')}
              </label>
              <input
                id={`extra-cost-${index}`}
                type="number"
                value={item.cost}
                onChange={(e) => onExtraChange(index, 'cost', Number(e.target.value))}
                className="block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 bg-card text-text p-2 border"
                aria-label={`${t('events:extras.cost')} ${t('common:entities.extra')} ${index + 1}`}
              />
            </div>
            <div className="w-1/2">
              <label htmlFor={`extra-price-${index}`} className="text-xs text-text-secondary">
                {t('events:extras.price')}
              </label>
              <input
                id={`extra-price-${index}`}
                type="number"
                value={item.price}
                disabled={item.exclude_utility}
                onChange={(e) => onExtraChange(index, 'price', Number(e.target.value))}
                className={`block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 bg-card text-text p-2 border ${
                  item.exclude_utility ? 'bg-surface-alt' : ''
                }`}
                aria-label={t('events:extras.price_aria', { index: index + 1 })}
              />
            </div>
          </div>
              </div>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={onAddExtra}
        className="w-full flex items-center justify-center px-4 py-2 border border-border shadow-xs text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt transition-colors"
        aria-label={t('events:extras.add_button_aria')}
      >
        <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> {t('events:extras.add')}
      </button>

      <div className="mt-4 text-right">
        <span className="text-sm text-text-secondary mr-2">{t('events:extras.subtotal')}:</span>
        <span className="text-lg font-semibold text-text">
          ${extras.reduce((sum, item) => sum + item.price, 0).toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}
        </span>
      </div>

      <ConfirmDialog
        open={pendingDeleteIndex !== null}
        title={t('events:extras.delete_confirm_title')}
        description={pendingDeleteExtra?.description
          ? t('events:extras.delete_confirm_desc', { name: pendingDeleteExtra.description })
          : t('events:extras.delete_confirm_desc_generic')}
        confirmText={t('common:action.delete')}
        cancelText={t('common:action.cancel')}
        onConfirm={() => {
          if (pendingDeleteIndex !== null) onRemoveExtra(pendingDeleteIndex);
          setPendingDeleteIndex(null);
        }}
        onCancel={() => setPendingDeleteIndex(null)}
      />
    </div>
  );
};
