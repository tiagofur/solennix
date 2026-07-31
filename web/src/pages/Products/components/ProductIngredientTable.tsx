import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { type LucideIcon, Package } from 'lucide-react';
import { Card } from '@/components/Card';
import type { ProductIngredientWithInventory } from '@/services/productService';

type ColumnType = 'inventory' | 'quantity' | 'cost' | 'capacity';

export interface IngredientColumn {
  type: ColumnType;
  /** Header label. For cost columns pass the pre-combined label (e.g. "Costo estimado"). */
  header: string;
  /** Alignment of numeric columns; header alignment is inferred from type. */
}

interface ProductIngredientTableProps {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  /** Optional badge chip rendered at the header right. Pass `badgeTone` to color it. */
  badge?: string;
  badgeTone?: 'warning' | 'info';
  rows: ProductIngredientWithInventory[];
  columns: IngredientColumn[];
  /** When provided, the table renders an empty-state CTA instead of the table. */
  emptyStateCta?: { message: string; linkTo: string; linkLabel: string };
  footerLabel?: string;
  footerValue?: number;
  footerTone?: 'default' | 'warning' | 'info' | 'success' | 'primary';
  moneyLocale: string;
}

const badgeToneClass: Record<NonNullable<ProductIngredientTableProps['badgeTone']>, string> = {
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
};

const footerToneClass: Record<NonNullable<ProductIngredientTableProps['footerTone']>, string> = {
  default: 'text-text',
  warning: 'text-warning',
  info: 'text-info',
  success: 'text-success',
  primary: 'text-primary',
};

export const ProductIngredientTable: React.FC<ProductIngredientTableProps> = ({
  icon: Icon,
  iconColor,
  title,
  badge,
  badgeTone,
  rows,
  columns,
  emptyStateCta,
  footerLabel,
  footerValue,
  footerTone = 'default',
  moneyLocale,
}) => {
  const { t } = useTranslation(['products', 'common']);
  const showEmpty = emptyStateCta && rows.length === 0;

  const renderCell = (ing: ProductIngredientWithInventory, col: IngredientColumn) => {
    switch (col.type) {
      case 'inventory':
        return (
          <td className="px-6 py-4" key={col.type}>
            <Link
              to={`/inventory/${ing.inventory_id}`}
              className="text-sm font-medium text-text hover:text-primary transition-colors"
            >
              {ing.ingredient_name || t('products:list.unknown')}
            </Link>
          </td>
        );
      case 'quantity':
        return (
          <td className="px-6 py-4 text-right" key={col.type}>
            <span className="text-sm text-text font-bold">
              {ing.quantity_required} {ing.unit || ''}
            </span>
          </td>
        );
      case 'cost':
        return (
          <td className="px-6 py-4 text-right" key={col.type}>
            <span
              className={clsx(
                'text-sm font-medium',
                footerTone === 'warning' ? 'text-warning' : 'text-text',
              )}
            >
              {ing.unit_cost
                ? `$${(ing.quantity_required * ing.unit_cost).toLocaleString(moneyLocale, {
                    minimumFractionDigits: 2,
                  })}`
                : '—'}
            </span>
          </td>
        );
      case 'capacity':
        return (
          <td className="px-6 py-4 text-right" key={col.type}>
            <span className="text-xs text-text-secondary">
              {ing.capacity
                ? t('products:form.capacity_help', { count: ing.capacity })
                : t('products:form.capacity_fixed')}
            </span>
          </td>
        );
      default:
        return null;
    }
  };

  return (
    <Card variant="glass" padding="none" className="overflow-hidden shadow-sm">
      <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon className={clsx('h-5 w-5', iconColor)} />
          <h2 className="text-lg font-semibold text-text">{title}</h2>
        </div>
        {badge && badgeTone && (
          <span
            className={clsx(
              'inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium',
              badgeToneClass[badgeTone],
            )}
          >
            {badge}
          </span>
        )}
      </div>

      {showEmpty ? (
        <div className="p-12 text-center">
          <Package className="h-12 w-12 text-text-secondary mx-auto mb-4 opacity-20" />
          <p className="text-text-secondary">{emptyStateCta!.message}</p>
          <Link
            to={emptyStateCta!.linkTo}
            className="text-primary hover:underline mt-2 inline-block text-sm"
          >
            {emptyStateCta!.linkLabel}
          </Link>
        </div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.type}
                    className={clsx(
                      'px-6 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider',
                      col.type === 'inventory' ? 'text-left' : 'text-right',
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((ing) => (
                <tr key={ing.inventory_id} className="hover:bg-surface-alt/50 transition-colors">
                  {columns.map((col) => renderCell(ing, col))}
                </tr>
              ))}
            </tbody>
          </table>
          {footerLabel && footerValue !== undefined && (
            <div className="px-6 py-4 border-t border-border flex justify-between items-center">
              <span className="text-sm text-text-secondary">{footerLabel}</span>
              <span className={clsx('text-lg font-bold', footerToneClass[footerTone])}>
                ${footerValue.toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
