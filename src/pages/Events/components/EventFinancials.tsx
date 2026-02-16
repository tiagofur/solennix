import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

interface SelectedProduct {
  price: number;
  discount: number;
  quantity: number;
  product_id: string;
}

interface SelectedExtra {
  price: number;
  cost: number;
  exclude_utility: boolean;
}

interface EventFinancialsProps {
  selectedProducts: SelectedProduct[];
  extras: SelectedExtra[];
  productUnitCosts: { [key: string]: number };
}

export const EventFinancials: React.FC<EventFinancialsProps> = ({
  selectedProducts,
  extras,
  productUnitCosts,
}) => {
  const { register, control } = useFormContext();
  const discountValue = useWatch({ control, name: 'discount' }) || 0;
  const requiresInvoiceValue = useWatch({ control, name: 'requires_invoice' });
  const taxRateValue = useWatch({ control, name: 'tax_rate' }) || 16;
  const taxAmountValue = useWatch({ control, name: 'tax_amount' }) || 0;
  const totalAmountValue = useWatch({ control, name: 'total_amount' }) || 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Detalles Financieros</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border dark:border-gray-600">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Facturación
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  {...register('requires_invoice')}
                  className="h-4 w-4 text-brand-orange border-gray-300 dark:border-gray-600 rounded focus:ring-brand-orange bg-white dark:bg-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Requiere factura (IVA {taxRateValue}%)
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border dark:border-gray-600">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Descuento General (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                {...register('discount')}
                className="block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange p-2 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border dark:border-gray-600">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Condiciones de Pago</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400">Anticipo (%)</label>
                  <input
                    type="number"
                    {...register('deposit_percent')}
                    max="100"
                    min="0"
                    className="mt-1 block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange p-2 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400">Días Cancelación</label>
                  <input
                    type="number"
                    {...register('cancellation_days')}
                    min="0"
                    className="mt-1 block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange p-2 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400">Reembolso (%)</label>
                  <input
                    type="number"
                    {...register('refund_percent')}
                    max="100"
                    min="0"
                    className="mt-1 block w-full text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange p-2 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
            
             <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border dark:border-gray-600">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notas
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="shadow-sm focus:ring-brand-orange focus:border-brand-orange block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md p-2 border bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-inner">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Resumen de Costos</h4>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Subtotal Productos:</span>
              <span>${selectedProducts.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.quantity, 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Subtotal Extras:</span>
              <span>${extras.reduce((sum, item) => sum + item.price, 0).toFixed(2)}</span>
            </div>
            
            {discountValue > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400 font-medium">
                <span>Descuento ({discountValue}%):</span>
                <span>
                  -${(() => {
                    const productsSubtotal = selectedProducts.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.quantity, 0);
                    const normalExtrasTotal = extras.filter((e) => !e.exclude_utility).reduce((sum, item) => sum + item.price, 0);
                    const discountableBase = productsSubtotal + normalExtrasTotal;
                    return (discountableBase * (discountValue / 100)).toFixed(2);
                  })()}
                </span>
              </div>
            )}
            
            {requiresInvoiceValue && (
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>IVA ({taxRateValue}%):</span>
                <span>${taxAmountValue.toFixed(2)}</span>
              </div>
            )}
            
            <div className="border-t border-gray-300 dark:border-gray-600 pt-3 flex justify-between text-xl font-bold text-gray-900 dark:text-white">
              <span>Total:</span>
              <span className="text-brand-orange">${totalAmountValue.toFixed(2)}</span>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Métricas de Rentabilidad (Interno)
            </h5>
            
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-gray-500 dark:text-gray-400">Costo Total:</div>
              <div className="text-right font-medium text-gray-900 dark:text-white">
                ${(selectedProducts.reduce((sum, p) => sum + (productUnitCosts[p.product_id] || 0) * p.quantity, 0) + extras.reduce((sum, e) => sum + e.cost, 0)).toFixed(2)}
              </div>
              
              <div className="text-gray-500 dark:text-gray-400">Utilidad Neta:</div>
              <div className="text-right font-bold text-green-600 dark:text-green-400">
                 ${(
                    totalAmountValue -
                    (requiresInvoiceValue ? taxAmountValue : 0) - // Exclude tax from profit
                    (selectedProducts.reduce(
                      (sum, p) =>
                        sum +
                        (productUnitCosts[p.product_id] || 0) * p.quantity,
                      0,
                    ) +
                      extras.reduce((sum, e) => sum + e.cost, 0))
                  ).toFixed(2)}
              </div>
              
              <div className="text-gray-500 dark:text-gray-400">Margen:</div>
              <div className="text-right font-bold text-blue-600 dark:text-blue-400">
                 {(() => {
                    const totalRevenue = totalAmountValue - (requiresInvoiceValue ? taxAmountValue : 0);
                    const totalCost =
                      selectedProducts.reduce(
                        (sum, p) =>
                          sum +
                          (productUnitCosts[p.product_id] || 0) * p.quantity,
                        0,
                      ) + extras.reduce((sum, e) => sum + e.cost, 0);

                    const profit = totalRevenue - totalCost;
                    const passThroughRevenue = extras
                      .filter((e) => e.exclude_utility)
                      .reduce((sum, e) => sum + e.price, 0);

                    const adjustedRevenue = totalRevenue - passThroughRevenue;

                    if (adjustedRevenue <= 0) return "0.0%";

                    return `${((profit / adjustedRevenue) * 100).toFixed(1)}%`;
                  })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
