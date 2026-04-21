import React, { useState } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

import { SortableItem } from '@/components/SortableItem';
import { ConfirmDialog } from '@/components/ConfirmDialog';

// Local type to avoid Supabase dependency
interface Product {
  id: string;
  name: string;
  category: string;
  base_price: number;
  staff_team_id?: string | null;
}

interface SelectedProduct {
  product_id: string;
  quantity: number;
  price: number;
  discount: number;
}

interface EventProductsProps {
  products: Product[];
  selectedProducts: SelectedProduct[];
  productUnitCosts: { [key: string]: number };
  onAddProduct: () => void;
  onRemoveProduct: (index: number) => void;
  onProductChange: (index: number, field: keyof SelectedProduct, value: string | number | boolean) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
}

export const EventProducts: React.FC<EventProductsProps> = ({
  products,
  selectedProducts,
  productUnitCosts,
  onAddProduct,
  onRemoveProduct,
  onProductChange,
  onReorder,
}) => {
  const { watch } = useFormContext();
  const numPeople = watch('num_people');

  // Indice del producto pendiente de eliminacion — null = no hay dialog.
  // Paridad con mobile: antes el tap al trash borraba sin preguntar.
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null);
  const pendingDeleteProduct = pendingDeleteIndex !== null
    ? products.find((p) => p.id === selectedProducts[pendingDeleteIndex]?.product_id)
    : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // IDs determinísticos por índice — sin memoización para evitar
  // warnings del React Compiler sobre `[selectedProducts.length]` y porque
  // el costo de generar strings cortos es insignificante frente al riesgo
  // de stale IDs.
  const itemIds = selectedProducts.map((_, i) => `product-${i}`);

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
      <h3 className="text-lg font-medium text-text">Selección de Productos</h3>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {selectedProducts.map((item, index) => {
            const selectedProduct = products.find((p) => p.id === item.product_id);
            const hasTeam = !!selectedProduct?.staff_team_id;
            return (
            <SortableItem key={itemIds[index]} id={itemIds[index]}>
              <div className="bg-surface-alt p-4 rounded-xl relative group border border-border shadow-xs">
                <button
                  type="button"
                  onClick={() => setPendingDeleteIndex(index)}
                  className="absolute top-2 right-2 text-text-secondary hover:text-error transition-colors"
                  aria-label={`Eliminar producto ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>

                <div className="mb-2 pr-6">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={`product-select-${index}`} className="block text-xs text-text-secondary">Producto</label>
                    {hasTeam && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent dark:bg-accent/20"
                        title="Este producto agrega automáticamente miembros del equipo asociado como personal"
                      >
                        <Users className="h-3 w-3" aria-hidden="true" />
                        Incluye equipo
                      </span>
                    )}
                  </div>
                  <select
                    id={`product-select-${index}`}
                    value={item.product_id}
                    onChange={(e) => onProductChange(index, 'product_id', e.target.value)}
                    className="block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 bg-card text-text p-2 border"
                    aria-label={`Seleccionar producto ${index + 1}`}
                  >
                    <option value="">Seleccionar producto</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <div className="w-full sm:w-[20%]">
                    <label htmlFor={`quantity-${index}`} className="text-xs text-text-secondary block mb-1">Cant.</label>
                    <div className="flex rounded-md shadow-xs">
                      <input
                        id={`quantity-${index}`}
                        type="number"
                        value={item.quantity}
                        onChange={(e) => onProductChange(index, 'quantity', Number(e.target.value))}
                        className="flex-1 min-w-0 block w-full px-2 py-2 rounded-none rounded-l-xl text-sm border-border focus:ring-2 focus:ring-primary/20 border bg-card text-text transition-shadow"
                        aria-label={`Cantidad de producto ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => onProductChange(index, 'quantity', Number(numPeople || 1))}
                        className="inline-flex items-center px-2 rounded-r-xl border border-l-0 border-border bg-surface-alt text-text-secondary sm:text-sm hover:bg-surface-alt transition-colors"
                        aria-label="Igualar cantidad a número de personas"
                      >
                        <Users className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="w-1/2 sm:w-[25%]">
                    <label htmlFor={`price-${index}`} className="text-xs text-text-secondary block mb-1">Precio Unit.</label>
                    <input
                      id={`price-${index}`}
                      type="number"
                      value={item.price}
                      readOnly
                      className="block w-full text-sm border-border rounded-xl shadow-xs bg-surface-alt text-text-secondary p-2 border cursor-not-allowed opacity-80"
                      aria-label={`Precio unitario de producto ${index + 1} (solo lectura)`}
                    />
                  </div>

                  <div className="w-1/2 sm:w-[20%]">
                    <label htmlFor={`discount-${index}`} className="text-xs text-text-secondary block mb-1">Desc. Unit.</label>
                    <input
                      id={`discount-${index}`}
                      type="number"
                      min="0"
                      max={item.price}
                      value={item.discount || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 0 && val <= item.price) onProductChange(index, 'discount', val);
                      }}
                      className="block w-full text-sm border-border rounded-md shadow-xs focus:ring-primary/20 focus:border-primary p-2 border bg-card text-text"
                      aria-label={`Descuento unitario de producto ${index + 1}`}
                    />
                  </div>

                  <div className="w-full sm:w-[35%]">
                    <label htmlFor={`total-${index}`} className="text-xs text-text-secondary block mb-1">Total</label>
                    <input
                      id={`total-${index}`}
                      type="number"
                      value={((item.price - (item.discount || 0)) * item.quantity).toFixed(2)}
                      onChange={(e) => {
                        const newTotal = Number(e.target.value);
                        const maxTotal = item.price * item.quantity;
                        if (newTotal <= maxTotal && newTotal >= 0) {
                          const newDiscount = item.quantity > 0 ? item.price - newTotal / item.quantity : 0;
                          onProductChange(index, 'discount', newDiscount);
                        }
                      }}
                      className="block w-full text-sm border-border rounded-md shadow-xs focus:ring-primary/20 focus:border-primary p-2 border bg-card text-text font-bold"
                      aria-label={`Total de producto ${index + 1}`}
                    />
                  </div>
                </div>

                {item.product_id && productUnitCosts[item.product_id] !== undefined && (
                  <div className="mt-2 text-xs text-text-secondary">
                    Costo est. unitario: ${productUnitCosts[item.product_id].toFixed(2)}
                  </div>
                )}
              </div>
            </SortableItem>
            );
          })}
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={onAddProduct}
        className="w-full flex items-center justify-center px-4 py-2 border border-border shadow-xs text-sm font-medium rounded-xl text-text-secondary bg-card hover:bg-surface-alt transition-colors"
        aria-label="Agregar un producto adicional"
      >
        <Plus className="h-4 w-4 mr-2" aria-hidden="true" /> Agregar Producto
      </button>

      <div className="mt-4 text-right">
        <span className="text-sm text-text-secondary mr-2">Subtotal Productos:</span>
        <span className="text-lg font-semibold text-text">
          ${selectedProducts.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.quantity, 0).toFixed(2)}
        </span>
      </div>

      <ConfirmDialog
        open={pendingDeleteIndex !== null}
        title="¿Eliminar producto?"
        description={pendingDeleteProduct
          ? `¿Quitar "${pendingDeleteProduct.name}" de este evento?`
          : '¿Quitar este producto del evento?'}
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={() => {
          if (pendingDeleteIndex !== null) onRemoveProduct(pendingDeleteIndex);
          setPendingDeleteIndex(null);
        }}
        onCancel={() => setPendingDeleteIndex(null)}
      />
    </div>
  );
};
