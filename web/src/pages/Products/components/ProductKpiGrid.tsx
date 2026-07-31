import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { Calendar, DollarSign, Layers, TrendingUp } from 'lucide-react';
import { Card } from '@/components/Card';

interface ProductKpiGridProps {
  basePrice: number;
  unitCost: number;
  margin: number;
  demandCount: number;
  demandLoading: boolean;
  moneyLocale: string;
}

export const ProductKpiGrid: React.FC<ProductKpiGridProps> = ({
  basePrice,
  unitCost,
  margin,
  demandCount,
  demandLoading,
  moneyLocale,
}) => {
  const { t } = useTranslation(['products', 'common']);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Card variant="glass" padding="sm" className="shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <p className="text-xs text-text-secondary uppercase tracking-wide">
            {t('products:form.base_price')}
          </p>
        </div>
        <p className="text-3xl font-black text-text">
          ${basePrice.toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-text-secondary mt-1">{t('products:details.per_unit')}</p>
      </Card>

      <Card variant="glass" padding="sm" className="shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-4 w-4 text-text-secondary" />
          <p className="text-xs text-text-secondary uppercase tracking-wide">
            {t('products:details.unit_cost')}
          </p>
        </div>
        <p className="text-3xl font-black text-text">
          ${unitCost.toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-text-secondary mt-1">{t('products:details.in_supplies')}</p>
      </Card>

      <Card
        variant={margin >= 20 && margin < 50 ? 'glass' : 'default'}
        padding="sm"
        className={clsx(
          'border shadow-sm',
          margin >= 50
            ? 'bg-success/5 border-success/20'
            : margin < 20
              ? 'bg-warning/5 border-warning/20'
              : '',
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp
            className={clsx(
              'h-4 w-4',
              margin >= 50 ? 'text-success' : margin >= 20 ? 'text-primary' : 'text-warning',
            )}
          />
          <p className="text-xs text-text-secondary uppercase tracking-wide">
            {t('products:details.margin')}
          </p>
        </div>
        <p
          className={clsx(
            'text-3xl font-black',
            margin >= 50 ? 'text-success' : margin >= 20 ? 'text-text' : 'text-warning',
          )}
        >
          {margin.toFixed(1)}%
        </p>
        <p className="text-xs text-text-secondary mt-1">{t('products:details.margin_desc')}</p>
      </Card>

      <Card variant="glass" padding="sm" className="shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-primary" />
          <p className="text-xs text-text-secondary uppercase tracking-wide">
            {t('products:details.upcoming_events')}
          </p>
        </div>
        {demandLoading ? (
          <div className="h-8 w-10 rounded-md bg-surface-alt animate-pulse" />
        ) : (
          <p className="text-3xl font-black text-text">{demandCount}</p>
        )}
        <p className="text-xs text-text-secondary mt-1">{t('common:status.confirmed')}</p>
      </Card>
    </div>
  );
};
