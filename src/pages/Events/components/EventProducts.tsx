import React from 'react';
import { Database } from '../../../types/supabase';
import { Plus, Trash2, Users } from 'lucide-react';
import { useFormContext } from 'react-hook-form';

type Product = Database['public']['Tables']['products']['Row'];

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
  onProductChange: (index: number, field: keyof SelectedProduct, value: any) => void;
}

export const EventProducts: React.FC<EventProductsProps> = ({
  products,
  selectedProducts,
  productUnitCosts,
  onAddProduct,
  onRemoveProduct,
  onProductChange,
}) => {
  const { watch } = useFormContext();
  const numPeople = watch('num_people');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Selección de Productos</h3>
      
      {selectedProducts.map((item, index) => (
        <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md relative group">
          <button
            type="button"
            onClick={() => onRemoveProduct(index)}
            className="absolute top-1 right-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          
          <div className="mb-2 pr-6">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Producto</label>
            <select
              value={item.product_id}
              onChange={(e) => onProductChange(index, 'product_id', e.target.value)}
              className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
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
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Cant.</label>
              <div className="flex rounded-md shadow-sm">
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => onProductChange(index, 'quantity', Number(e.target.value))}
                  className="flex-1 min-w-0 block w-full px-2 py-2 rounded-none rounded-l-md text-sm border-gray-300 dark:border-gray-600 focus:ring-brand-orange focus:border-brand-orange border bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => onProductChange(index, 'quantity', Number(numPeople || 1))}
                  title="Igualar a personas"
                  className="inline-flex items-center px-2 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <Users className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="w-1/2 sm:w-[25%]">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Precio Unit.</label>
              <input
                type="number"
                value={item.price}
                readOnly
                className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 p-2 border cursor-not-allowed"
              />
            </div>

            <div className="w-1/2 sm:w-[20%]">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Desc. Unit.</label>
              <input
                type="number"
                min="0"
                value={item.discount || 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0) onProductChange(index, 'discount', val);
                }}
                className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange p-2 border bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
              />
            </div>

            <div className="w-full sm:w-[35%]">
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Total</label>
              <input
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
                className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange p-2 border bg-white dark:bg-gray-600 text-gray-900 dark:text-white font-bold"
              />
            </div>
          </div>

          {item.product_id && productUnitCosts[item.product_id] !== undefined && (
            <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              Costo est. unitario: ${productUnitCosts[item.product_id].toFixed(2)}
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={onAddProduct}
        className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
      >
        <Plus className="h-4 w-4 mr-2" /> Agregar Producto
      </button>

      <div className="mt-4 text-right">
        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Subtotal Productos:</span>
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          ${selectedProducts.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.quantity, 0).toFixed(2)}
        </span>
      </div>
    </div>
  );
};
