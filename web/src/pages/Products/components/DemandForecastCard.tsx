import React from 'react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Users } from 'lucide-react';
import { Card } from '@/components/Card';
import { SkeletonCard } from '@/components/Skeleton';

export interface DemandEntry {
  date: string;
  eventId: string;
  eventName?: string;
  quantity: number;
  numPeople: number;
}

interface DemandForecastCardProps {
  entries: DemandEntry[];
  loading: boolean;
  today: Date;
  moneyLocale: string;
  basePrice: number;
  totalDemand: number;
  estimatedRevenue: number;
}

export const DemandForecastCard: React.FC<DemandForecastCardProps> = ({
  entries,
  loading,
  today,
  moneyLocale,
  basePrice,
  totalDemand,
  estimatedRevenue,
}) => {
  const { t } = useTranslation(['products', 'common']);

  return (
    <Card variant="glass" padding="md" className="shadow-sm">
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-border">
        <Calendar className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-semibold text-text">{t('products:details.demand_by_date')}</h2>
        <span className="ml-auto text-xs text-text-secondary">{t('common:status.confirmed')}</span>
      </div>

      {loading ? (
        <SkeletonCard rows={3} />
      ) : entries.length === 0 ? (
        <div className="text-center py-10">
          <Calendar className="h-9 w-9 text-text-secondary opacity-25 mx-auto mb-3" />
          <p className="text-sm text-text-secondary">
            {t('products:details.demand_no_confirmed_events')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const dateObj = new Date(entry.date + 'T00:00:00');
            const diffDays = Math.ceil(
              (dateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            );
            const isUrgent = diffDays <= 3;

            return (
              <div
                key={`${entry.eventId}-${idx}`}
                className={clsx(
                  'flex items-center justify-between px-4 py-3 rounded-xl border',
                  isUrgent
                    ? 'bg-primary/5 border-primary/20'
                    : diffDays <= 7
                      ? 'bg-warning/5 border-warning/20'
                      : 'bg-surface-alt border-border',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={clsx(
                      'w-2 h-2 rounded-full shrink-0',
                      isUrgent
                        ? 'bg-primary'
                        : diffDays <= 7
                          ? 'bg-warning'
                          : 'bg-primary/40',
                    )}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text">
                        {dateObj.toLocaleDateString(moneyLocale, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                      {diffDays === 0 && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                          {t('common:date.today')}
                        </span>
                      )}
                      {diffDays === 1 && (
                        <span className="text-xs bg-warning/10 text-warning px-1.5 py-0.5 rounded-md">
                          {t('common:date.tomorrow')}
                        </span>
                      )}
                      {diffDays > 1 && diffDays <= 7 && (
                        <span className="text-xs text-text-secondary">
                          {t('common:date.in_days', { count: diffDays })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Link
                        to={`/events/${entry.eventId}`}
                        className="text-xs text-text-secondary hover:text-primary truncate max-w-[160px] transition-colors"
                      >
                        {entry.eventName}
                      </Link>
                      {entry.numPeople > 0 && (
                        <span className="text-xs text-text-secondary flex items-center gap-1 shrink-0">
                          <Users className="h-3 w-3" />
                          {entry.numPeople}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <span className="text-sm font-bold text-text">
                    {entry.quantity} {t('products:list.units')}
                  </span>
                  <p className="text-xs text-text-secondary">
                    ${(entry.quantity * basePrice).toLocaleString(moneyLocale, {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            );
          })}

          {totalDemand > 0 && (
            <div className="flex items-center justify-between px-4 py-3 mt-2 border-t border-border">
              <div>
                <span className="text-xs text-text-secondary uppercase tracking-wide">
                  {t('products:details.total_demand')}
                </span>
                <p className="text-xs text-text-secondary">
                  {t('products:list.events_count', { count: entries.length })}
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-text">
                  {totalDemand} {t('products:list.units')}
                </span>
                <p className="text-xs text-text-secondary">
                  ${estimatedRevenue.toLocaleString(moneyLocale, { minimumFractionDigits: 2 })}{' '}
                  {t('products:details.est_suffix')}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
