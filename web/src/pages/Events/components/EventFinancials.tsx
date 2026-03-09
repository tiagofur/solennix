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
  supplyCost?: number;
  discountType?: "percent" | "fixed";
  onDiscountTypeChange?: (type: "percent" | "fixed") => void;
}

export const EventFinancials: React.FC<EventFinancialsProps> = ({
  selectedProducts,
  extras,
  productUnitCosts,
  supplyCost = 0,
  discountType = "percent",
  onDiscountTypeChange = () => {},
}) => {
  const { register, control } = useFormContext();
  const discountValue = useWatch({ control, name: 'discount' }) || 0;
  const requiresInvoiceValue = useWatch({ control, name: 'requires_invoice' });
  const taxRateValue = useWatch({ control, name: 'tax_rate' }) || 16;
  const taxAmountValue = useWatch({ control, name: 'tax_amount' }) || 0;
  const totalAmountValue = useWatch({ control, name: 'total_amount' }) || 0;
  const depositPercentValue = useWatch({ control, name: 'deposit_percent' }) || 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-text">Detalles Financieros</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="space-y-4">
            <div className="bg-card p-4 rounded-xl shadow-xs border border-border">
              <label htmlFor="requires_invoice" className="block text-sm font-medium text-text-secondary mb-2">
                Facturación
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="requires_invoice"
                  type="checkbox"
                  {...register('requires_invoice')}
                  className="h-4 w-4 text-primary border-border rounded-sm focus:ring-primary bg-card"
                  aria-describedby="requires_invoice-description"
                />
                <span id="requires_invoice-description" className="text-sm text-text-secondary">
                  Requiere factura (IVA {taxRateValue}%)
                </span>
              </div>
            </div>

            <div className="bg-card p-4 rounded-xl shadow-xs border border-border">
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="discount" className="text-sm font-medium text-text-secondary">
                  Descuento General
                </label>
                <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => onDiscountTypeChange("percent")}
                    className={`px-2.5 py-1 transition-colors ${discountType === "percent" ? "bg-primary text-white" : "bg-card text-text-secondary hover:bg-surface-alt"}`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => onDiscountTypeChange("fixed")}
                    className={`px-2.5 py-1 transition-colors ${discountType === "fixed" ? "bg-primary text-white" : "bg-card text-text-secondary hover:bg-surface-alt"}`}
                  >
                    $
                  </button>
                </div>
              </div>
              <input
                id="discount"
                type="number"
                min="0"
                max={discountType === "percent" ? "100" : undefined}
                step="0.01"
                {...register('discount')}
                className="mt-1 block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 p-2 bg-card text-text border"
              />
            </div>

            <div className="bg-card p-4 rounded-xl shadow-xs border border-border">
              <h4 className="text-sm font-medium text-text-secondary mb-3">Condiciones de Pago</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="deposit_percent" className="block text-xs text-text-secondary">Anticipo (%)</label>
                  <input
                    id="deposit_percent"
                    type="number"
                    {...register('deposit_percent')}
                    max="100"
                    min="0"
                    className="mt-1 block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 p-2 bg-card text-text border"
                  />
                </div>
                <div>
                  <label htmlFor="cancellation_days" className="block text-xs text-text-secondary">Días Cancelación</label>
                  <input
                    id="cancellation_days"
                    type="number"
                    {...register('cancellation_days')}
                    min="0"
                    className="mt-1 block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 p-2 bg-card text-text border"
                  />
                </div>
                <div>
                  <label htmlFor="refund_percent" className="block text-xs text-text-secondary">Reembolso (%)</label>
                  <input
                    id="refund_percent"
                    type="number"
                    {...register('refund_percent')}
                    max="100"
                    min="0"
                    className="mt-1 block w-full text-sm border-border rounded-xl shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 p-2 bg-card text-text border"
                  />
                </div>
              </div>
            </div>

             <div className="bg-card p-4 rounded-xl shadow-xs border border-border">
              <label htmlFor="event-notes" className="block text-sm font-medium text-text-secondary mb-2">
                Notas
              </label>
              <textarea
                id="event-notes"
                {...register('notes')}
                rows={3}
                className="shadow-xs transition-shadow focus:ring-2 focus:ring-primary/20 block w-full sm:text-sm border-border rounded-xl p-2 border bg-card text-text"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-alt p-6 rounded-3xl shadow-sm border border-border">
          <h4 className="text-lg font-medium text-text mb-4">Resumen de Costos</h4>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal Productos:</span>
              <span>${selectedProducts.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.quantity, 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal Extras:</span>
              <span>${extras.reduce((sum, item) => sum + item.price, 0).toFixed(2)}</span>
            </div>

            {discountValue > 0 && (
              <div className="flex justify-between text-success font-medium">
                <span>
                  Descuento {discountType === "percent" ? `(${discountValue}%)` : ""}:
                </span>
                <span>
                  -${(() => {
                    const productsSubtotal = selectedProducts.reduce((sum, item) => sum + (item.price - (item.discount || 0)) * item.quantity, 0);
                    const normalExtrasTotal = extras.filter((e) => !e.exclude_utility).reduce((sum, item) => sum + item.price, 0);
                    const discountableBase = productsSubtotal + normalExtrasTotal;
                    return discountType === "percent"
                      ? (discountableBase * (discountValue / 100)).toFixed(2)
                      : Math.min(discountValue, discountableBase).toFixed(2);
                  })()}
                </span>
              </div>
            )}

            {requiresInvoiceValue && (
              <div className="flex justify-between text-text-secondary">
                <span>IVA ({taxRateValue}%):</span>
                <span>${taxAmountValue.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t border-border pt-3 flex justify-between text-xl font-bold text-text">
              <span>Total:</span>
              <span className="text-primary">${totalAmountValue.toFixed(2)}</span>
            </div>

            {depositPercentValue > 0 && (
              <div className="flex justify-between text-warning font-medium">
                <span>Anticipo ({depositPercentValue}%):</span>
                <span>${(totalAmountValue * (depositPercentValue / 100)).toFixed(2)}</span>
              </div>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-border">
            <h5 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
              Métricas de Rentabilidad (Interno)
            </h5>

            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <div className="text-text-secondary">Costo Productos:</div>
              <div className="text-right font-medium text-text">
                ${(selectedProducts.reduce((sum, p) => sum + (productUnitCosts[p.product_id] || 0) * p.quantity, 0)).toFixed(2)}
              </div>

              <div className="text-text-secondary">Costo Extras:</div>
              <div className="text-right font-medium text-text">
                ${extras.reduce((sum, e) => sum + e.cost, 0).toFixed(2)}
              </div>

              {supplyCost > 0 && (
                <>
                  <div className="text-warning">Costo Insumos Evento:</div>
                  <div className="text-right font-medium text-warning">
                    ${supplyCost.toFixed(2)}
                  </div>
                </>
              )}

              <div className="text-text-secondary font-medium border-t border-border pt-2">Costo Total:</div>
              <div className="text-right font-medium text-text border-t border-border pt-2">
                ${(selectedProducts.reduce((sum, p) => sum + (productUnitCosts[p.product_id] || 0) * p.quantity, 0) + extras.reduce((sum, e) => sum + e.cost, 0) + supplyCost).toFixed(2)}
              </div>

              <div className="text-text-secondary">Utilidad Neta:</div>
              <div className="text-right font-bold text-success">
                 ${(
                    totalAmountValue -
                    (requiresInvoiceValue ? taxAmountValue : 0) -
                    (selectedProducts.reduce(
                      (sum, p) =>
                        sum +
                        (productUnitCosts[p.product_id] || 0) * p.quantity,
                      0,
                    ) +
                      extras.reduce((sum, e) => sum + e.cost, 0) + supplyCost)
                  ).toFixed(2)}
              </div>

              <div className="text-text-secondary">Margen:</div>
              <div className="text-right font-bold text-info">
                 {(() => {
                    const totalRevenue = totalAmountValue - (requiresInvoiceValue ? taxAmountValue : 0);
                    const totalCost =
                      selectedProducts.reduce(
                        (sum, p) =>
                          sum +
                          (productUnitCosts[p.product_id] || 0) * p.quantity,
                        0,
                      ) + extras.reduce((sum, e) => sum + e.cost, 0) + supplyCost;

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
