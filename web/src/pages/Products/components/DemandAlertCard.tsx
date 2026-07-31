import React from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/Card';

interface DemandAlertCardProps {
  demand7Days: number;
  totalDemand: number;
  eventCount: number;
  estimatedRevenue: number;
  moneyLocale: string;
}

export const DemandAlertCard: React.FC<DemandAlertCardProps> = ({
  demand7Days,
  totalDemand,
  eventCount,
  estimatedRevenue,
  moneyLocale,
}) => {
  const { t } = useTranslation(['products', 'common']);

  return (
    <Card
      variant={demand7Days > 0 ? 'default' : 'glass'}
      padding="sm"
      className={clsx('border shadow-sm', demand7Days > 0 ? 'bg-primary/5 border-primary/20' : '')}
    >
      <div className="flex items-start gap-3">
        {demand7Days > 0 ? (
          <AlertTriangle className="h-6 w-6 text-primary shrink-0 mt-0.5" />
        ) : (
          <CheckCircle className="h-6 w-6 text-success shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <p
            className={clsx(
              'font-semibold text-sm',
              demand7Days > 0 ? 'text-primary' : 'text-success',
            )}
          >
            {demand7Days > 0
              ? t('products:details.demand_warning', { count: demand7Days })
              : eventCount > 0
                ? t('products:details.demand_no_urgent')
                : t('products:details.demand_no_events')}
          </p>
          <p className="text-sm text-text-secondary mt-1">
            {demand7Days > 0 ? (
              <>
                {t('products:details.demand_high_this_week')}{' '}
                {estimatedRevenue > 0 && (
                  <>
                    {t('products:details.estimated_revenue')}:{' '}
                    <strong className="text-text">
                      ${estimatedRevenue.toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}
                    </strong>
                    .
                  </>
                )}
              </>
            ) : eventCount > 0 ? (
              <>
                {t('products:details.demand_forecast_summary', {
                  units: totalDemand,
                  events: eventCount,
                })}
              </>
            ) : (
              t('products:details.demand_no_confirmed_events')
            )}
          </p>
        </div>
      </div>
    </Card>
  );
};
