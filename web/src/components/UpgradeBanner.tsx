import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UpgradeBannerProps {
  type: 'limit-reached' | 'upsell';
  currentUsage?: number;
  limit?: number;
  resource?: 'events' | 'clients' | 'catalog';
  className?: string;
}

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ 
  type, 
  currentUsage = 0, 
  limit = 4,
  resource = 'events',
  className = ''
}) => {
  const { t } = useTranslation('common');
  
  const resourceData = t(`upgrade_banner.resources.${resource}`, { returnObjects: true }) as {
    title: string;
    plural: string;
    metric: string;
  };

  if (type === 'limit-reached') {
    return (
      <div className={`bg-card rounded-2xl shadow-md border border-error/20 overflow-hidden relative ${className}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-error/10 rounded-full blur-3xl -mx-20 -my-20 opacity-50 pointer-events-none"></div>
        <div className="relative p-8 flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-error/10 rounded-full flex items-center justify-center mb-6" aria-hidden="true">
                <Lock className="h-8 w-8 text-error" aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-bold text-text mb-2">
              {t('upgrade_banner.limit_reached', { resource: resourceData.title })}
            </h3>
            <p className="text-text-secondary mb-6 max-w-md">
              {t('upgrade_banner.limit_desc', { limit, plural: resourceData.plural })}
            </p>

            <div className="bg-surface-alt rounded-xl p-4 w-full max-w-sm mb-8 border border-border">
                <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-text-secondary">{resourceData.metric}</span>
                    <span className="font-bold text-error">{currentUsage} / {limit}</span>
                </div>
                <div className="w-full bg-border rounded-full h-2">
                    <div
                      className="bg-error h-2 rounded-full"
                      style={{ width: '100%' }}
                      role="progressbar"
                      aria-valuenow={100}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${resourceData.metric}: ${currentUsage} de ${limit}`}
                    ></div>
                </div>
            </div>

            <Link
                to="/pricing"
                className="inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-primary hover:bg-primary-dark shadow-md transition-all hover:scale-105"
            >
                <Sparkles className="h-5 w-5 mr-2" aria-hidden="true" />
                {t('upgrade_banner.upgrade_cta')}
            </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-primary/5 rounded-2xl p-6 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-6 ${className}`}>
        <div className="flex items-start gap-4 flex-1">
            <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center shrink-0 mt-1" aria-hidden="true">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <div>
                <h4 className="text-lg font-bold text-text flex items-center gap-2">
                    {t('upgrade_banner.upsell_title')}
                    <span className="bg-primary text-white text-xs uppercase font-bold px-2 py-0.5 rounded-full">Pro</span>
                </h4>
                <p className="text-sm text-text-secondary mt-1">
                    {t('upgrade_banner.upsell_desc')}
                </p>
                <div className="mt-3 flex items-center text-xs font-medium text-text-tertiary">
                    <AlertCircle className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                    {t('upgrade_banner.plan_limit_info', { current: currentUsage, limit, plural: resourceData.plural })}
                </div>
            </div>
        </div>
        <Link
            to="/pricing"
            className="shrink-0 inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-bold rounded-xl text-white bg-primary hover:bg-primary-dark shadow-sm transition-colors"
        >
            {t('action.view_plans')}
        </Link>
    </div>
  );
};
