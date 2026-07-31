import React from "react";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import type { Event, EventSupply } from "@/types/entities";
import type { IngredientWithStock } from "../lib/aggregateIngredients";

export interface IngredientsViewProps {
  event: Event;
  ingredients: IngredientWithStock[];
  supplies: EventSupply[];
  moneyLocale: string;
  eventCurrency: string;
}

/**
 * `viewMode === "ingredients"` block: shows the aggregated supplies list
 * (required vs. in stock) plus the per-event supplies split into
 * "to purchase" and "from stock" tables.
 */
export const IngredientsView: React.FC<IngredientsViewProps> = ({
  event,
  ingredients,
  supplies,
  moneyLocale,
  eventCurrency,
}) => {
  const { t } = useTranslation(['events', 'common']);
  const money = (n: number) => n.toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency });

  const purchaseSupplies = supplies.filter((s) => s.source === 'purchase');
  const stockSupplies = supplies.filter((s) => s.source === 'stock');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border">
        <h1 className="text-2xl font-black text-text uppercase tracking-tight mb-2">
          {t('events:summary.supplies_list')}
        </h1>
        <p className="text-text-secondary text-sm flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          {event.service_type} • {new Date(event.event_date + "T12:00:00").toLocaleDateString(moneyLocale)}
        </p>
      </div>

      <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border overflow-hidden">
        <table className="w-full text-sm" aria-label={t('events:summary.aria_supplies_needed')}>
          <caption className="sr-only">{t('events:summary.supplies_caption')}</caption>
          <thead>
            <tr className="text-left text-text-secondary border-b border-border">
              <th className="pb-3 pt-2">{t('common:supply')}</th>
              <th className="pb-3 pt-2 text-right">{t('common:required')}</th>
              <th className="pb-3 pt-2 text-right">{t('common:in_stock')}</th>
              <th className="pb-3 pt-2 text-right">{t('common:action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ingredients.map((ing) => {
              const needsMore = ing.quantity > (ing.currentStock || 0);
              return (
                <tr key={`${ing.name}-${ing.unit}`} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="py-3 font-medium text-text">
                    {ing.name}
                    <div className="text-xs text-text-secondary uppercase tracking-tight">{ing.unit || t('common:unit_short')}</div>
                  </td>
                  <td className="py-3 text-right text-text font-bold">
                    {ing.quantity.toFixed(2)}
                  </td>
                  <td className="py-3 text-right">
                    <span className={clsx(
                      "px-2 py-0.5 rounded-full text-xs font-semibold",
                      needsMore
                        ? "bg-error/10 text-error border border-error/20"
                        : "bg-success/10 text-success border border-success/20"
                    )}>
                      {(ing.currentStock || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {needsMore ? (
                      <Link
                        to="/inventory"
                        className="text-primary hover:text-primary/80 font-bold text-xs underline decoration-dotted"
                      >
                        {t('common:buy')}
                      </Link>
                    ) : (
                      <span className="text-text-secondary text-xs">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {ingredients.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="py-4 text-center text-text-secondary italic"
                >
                  {t('events:summary.no_supplies_calculated')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Per-event supplies: purchase */}
      {purchaseSupplies.length > 0 && (
        <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border overflow-hidden">
          <h2 className="text-lg font-bold text-text mb-1">{t('events:summary.supplies_purchase_title')}</h2>
          <p className="text-xs text-text-secondary mb-4">{t('events:summary.supplies_purchase_desc')}</p>
          <table className="w-full text-sm" aria-label={t('events:summary.aria_supplies_purchase')}>
            <thead>
              <tr className="text-left text-text-secondary border-b border-border">
                <th className="pb-3 pt-2">{t('common:supply')}</th>
                <th className="pb-3 pt-2 text-right">{t('common:quantity')}</th>
                <th className="pb-3 pt-2 text-right">{t('common:unit_cost')}</th>
                <th className="pb-3 pt-2 text-right">{t('common:subtotal')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {purchaseSupplies.map((s, idx) => (
                <tr key={s.id || `purchase-${idx}`} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="py-3 font-medium text-text">
                    {s.supply_name || t('common:supply')}
                    <div className="text-xs text-text-secondary uppercase tracking-tight">{s.unit || t('common:unit_short')}</div>
                  </td>
                  <td className="py-3 text-right text-text font-bold">{s.quantity}</td>
                  <td className="py-3 text-right text-text-secondary">
                    {(s.unit_cost || 0).toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency })}
                  </td>
                  <td className="py-3 text-right text-text font-bold">
                    {money((s.quantity || 0) * (s.unit_cost || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Per-event supplies: from stock */}
      {stockSupplies.length > 0 && (
        <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border overflow-hidden">
          <h2 className="text-lg font-bold text-text mb-1">{t('events:summary.supplies_stock_title')}</h2>
          <p className="text-xs text-text-secondary mb-4">{t('events:summary.supplies_stock_desc')}</p>
          <table className="w-full text-sm" aria-label={t('events:summary.aria_supplies_stock')}>
            <thead>
              <tr className="text-left text-text-secondary border-b border-border">
                <th className="pb-3 pt-2">{t('common:supply')}</th>
                <th className="pb-3 pt-2 text-right">{t('common:quantity')}</th>
                <th className="pb-3 pt-2 text-right">{t('common:in_stock')}</th>
                <th className="pb-3 pt-2 text-right">{t('common:status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stockSupplies.map((s, idx) => {
                const needsMore = s.quantity > (s.current_stock || 0);
                return (
                  <tr key={s.id || `stock-${idx}`} className="hover:bg-surface-alt/50 transition-colors">
                    <td className="py-3 font-medium text-text">
                      {s.supply_name || t('events:summary.supply_fallback')}
                      <div className="text-xs text-text-secondary uppercase tracking-tight">{s.unit || t('events:summary.unit_each')}</div>
                    </td>
                    <td className="py-3 text-right text-text font-bold">{s.quantity}</td>
                    <td className="py-3 text-right">
                      <span className={clsx(
                        "px-2 py-0.5 rounded-full text-xs font-semibold",
                        needsMore
                          ? "bg-error/10 text-error border border-error/20"
                          : "bg-success/10 text-success border border-success/20"
                      )}>
                        {(s.current_stock || 0)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {needsMore ? (
                        <span className="text-error text-xs font-bold">{t('common:insufficient')}</span>
                      ) : (
                        <span className="text-success text-xs font-bold">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
