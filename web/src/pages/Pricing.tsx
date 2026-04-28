import React, { useState } from 'react';
import { Shield, Zap, CheckCircle, ArrowRight, Star, Building2 } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import { logError } from '../lib/errorHandler';
import { useTranslation } from 'react-i18next';

type PlanKey = 'pro' | 'business';

export const Pricing: React.FC = () => {
  const { t } = useTranslation(['pricing']);
  // `upgradingPlan` doubles as a per-plan loading flag — both buttons can't
  // be spinning at once and we need to know WHICH button was clicked.
  const [upgradingPlan, setUpgradingPlan] = useState<PlanKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, checkAuth } = useAuth();

  const handleUpgrade = async (plan: PlanKey) => {
    try {
      setUpgradingPlan(plan);
      setError(null);
      const { url } = await subscriptionService.createCheckoutSession(plan);
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      logError('Failed to create checkout session', err);
      const detail = err instanceof Error ? err.message : '';
      setError(
        t('pricing:error.checkout_failed') +
          (detail ? ` (${detail})` : ''),
      );
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handleDebugUpgrade = async () => {
    try {
      setUpgradingPlan('pro');
      setError(null);
      await subscriptionService.debugUpgrade();
      await checkAuth(); // Refrescar contexto para obtener el nuevo plan
      alert(t('pricing:debug.upgrade_success'));
    } catch (err: unknown) {
      logError('Failed to debug upgrade', err);
      setError(t('pricing:debug.upgrade_error'));
    } finally {
      setUpgradingPlan(null);
    }
  };

  const featuresFree = t('pricing:features.free', { returnObjects: true }) as string[];
  const featuresPro = t('pricing:features.pro', { returnObjects: true }) as string[];
  const featuresBusiness = t('pricing:features.business', { returnObjects: true }) as string[];

  const isOnPaidPlan = user?.plan === 'pro' || user?.plan === 'business' || user?.plan === 'premium';
  const isOnBusiness = user?.plan === 'business';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
        <h1 className="text-4xl font-extrabold text-text tracking-tight sm:text-5xl lg:text-6xl">
          {t('pricing:title')}
        </h1>
        <p className="mt-2 text-xl text-text-secondary">{t('pricing:subtitle')}</p>
        <p className="mt-5 text-xl text-text-secondary">
          {t('pricing:description')}
        </p>
        <p className="mt-2 text-sm text-text-tertiary">
          {t('pricing:trial_info')}
        </p>
      </div>

      {error && (
        <div
          className="mb-8 max-w-max mx-auto bg-error/5 border-l-4 border-error p-4 rounded-md"
          role="alert"
        >
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-error">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Free Plan */}
        <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden flex flex-col">
          <div className="p-8">
            <h3 className="text-2xl font-semibold text-text mb-2">{t('pricing:plans.basic.name')}</h3>
            <p className="text-text-secondary mb-6">{t('pricing:plans.basic.description')}</p>
            <div className="flex items-baseline mb-8">
              <span className="text-5xl font-extrabold text-text">{t('pricing:plans.basic.price')}</span>
              <span className="text-xl text-text-secondary ml-2">{t('pricing:plans.basic.interval')}</span>
            </div>

            <button
              type="button"
              disabled
              className="w-full bg-surface-alt text-text-secondary font-medium py-3 px-4 rounded-xl cursor-not-allowed"
              aria-label={isOnPaidPlan ? `${t('pricing:plans.basic.name')} - ${t('pricing:plans.basic.downgrade')}` : t('pricing:plans.basic.current_label')}
            >
              {isOnPaidPlan ? t('pricing:plans.basic.downgrade') : t('pricing:plans.basic.current')}
            </button>
          </div>
          <div className="bg-surface-alt p-8 flex-1 border-t border-border">
            <ul className="space-y-4">
              {featuresFree.map((feature, i) => (
                <li key={i} className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-success shrink-0 mr-3" aria-hidden="true" />
                  <span className="text-text-secondary">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pro Plan (featured) */}
        <div
          className="bg-linear-to-br from-primary via-primary-dark to-accent rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all hover:-translate-y-1 relative"
          style={{
            background:
              'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 45%, var(--color-accent) 100%)',
          }}
        >
          <div className="absolute top-0 right-0 bg-white/25 backdrop-blur-sm text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-widest">
            {t('pricing:plans.pro.badge')}
          </div>
          <div className="p-8">
            <div className="flex items-center mb-2">
              <h3 className="text-2xl font-semibold text-white">{t('pricing:plans.pro.name')}</h3>
              <Star className="h-5 w-5 text-warning ml-2 fill-current" aria-hidden="true" />
            </div>
            <p className="text-primary-light mb-4">
              {t('pricing:plans.pro.description')}
            </p>
            <div className="inline-flex items-center gap-1.5 bg-primary-light/20 text-primary-light text-xs font-bold px-3 py-1 rounded-full mb-4">
              {t('pricing:plans.pro.launch_price')}
            </div>
            <div className="flex items-baseline mb-6">
              <span className="text-4xl font-black text-white">{t('pricing:plans.pro.price_year')}</span>
              <span className="text-xl text-primary-light line-through opacity-75 ml-2">{t('pricing:plans.pro.old_price_year')}</span>
              <span className="text-lg text-primary-light font-medium ml-2">{t('pricing:plans.pro.interval_year')}</span>
            </div>
            <div className="flex items-baseline mb-8">
              <span className="text-2xl font-bold text-white">{t('pricing:plans.pro.price_month')}</span>
              <span className="text-xl text-primary-light line-through opacity-75 ml-2">{t('pricing:plans.pro.old_price_month')}</span>
              <span className="text-lg text-primary-light font-medium ml-2">{t('pricing:plans.pro.interval_month')}</span>
            </div>

            {user?.plan === 'pro' || user?.plan === 'premium' ? (
              <button
                type="button"
                disabled
                className="w-full bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-xl cursor-not-allowed border border-white/30 flex items-center justify-center gap-2"
                aria-label={t('pricing:plans.pro.current_label')}
              >
                <Shield className="h-5 w-5" aria-hidden="true" />
                {t('pricing:plans.pro.current')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleUpgrade('pro')}
                disabled={upgradingPlan !== null || isOnBusiness}
                className="w-full bg-white text-primary-dark hover:bg-primary-light font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-75 hover:shadow-xl"
                aria-label={t('pricing:plans.pro.subscribe_label')}
              >
                {upgradingPlan === 'pro' ? (
                  t('pricing:plans.pro.processing')
                ) : (
                  <>
                    <Zap className="h-5 w-5 text-warning" aria-hidden="true" />
                    {t('pricing:plans.pro.try_free')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            )}

            {/* Desarrollo: Botón para simular upgrade sin stripe */}
            {import.meta.env.MODE === 'development' && !isOnPaidPlan && (
              <button
                type="button"
                onClick={handleDebugUpgrade}
                disabled={upgradingPlan !== null}
                className="w-full mt-3 bg-black/20 hover:bg-black/30 text-white/80 hover:text-white font-medium py-2 px-4 rounded-lg text-sm border border-white/20 transition-colors"
                aria-label={t('pricing:debug.upgrade_button')}
              >
                {t('pricing:debug.upgrade_button')}
              </button>
            )}
          </div>
          <div className="bg-black/20 backdrop-blur-sm p-8 flex-1 border-t border-white/20">
            <ul className="space-y-4">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-white shrink-0 mr-3 mt-0.5" aria-hidden="true" />
                <span className="text-white font-semibold">{t('pricing:features.pro_include')}</span>
              </li>
              {featuresPro.map((feature, i) => (
                <li key={i} className="flex items-start">
                  <CheckCircle
                    className="h-5 w-5 text-primary-light shrink-0 mr-3 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-white">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Business Plan */}
        <div className="bg-card rounded-2xl shadow-lg border-2 border-accent overflow-hidden flex flex-col">
          <div className="p-8">
            <div className="flex items-center mb-2">
              <h3 className="text-2xl font-semibold text-text">{t('pricing:plans.business.name')}</h3>
              <Building2 className="h-5 w-5 text-accent ml-2" aria-hidden="true" />
            </div>
            <p className="text-text-secondary mb-6">
              {t('pricing:plans.business.description')}
            </p>
            <div className="flex items-baseline mb-2">
              <span className="text-4xl font-black text-text">{t('pricing:plans.business.price_year')}</span>
              <span className="text-lg text-text-secondary font-medium ml-2">{t('pricing:plans.business.interval_year')}</span>
            </div>
            <div className="flex items-baseline mb-8">
              <span className="text-2xl font-bold text-text">{t('pricing:plans.business.price_month')}</span>
              <span className="text-lg text-text-secondary font-medium ml-2">{t('pricing:plans.business.interval_month')}</span>
            </div>

            {isOnBusiness ? (
              <button
                type="button"
                disabled
                className="w-full bg-accent/10 text-accent font-semibold py-3 px-4 rounded-xl cursor-not-allowed border border-accent/30 flex items-center justify-center gap-2"
                aria-label={t('pricing:plans.business.current_label')}
              >
                <Shield className="h-5 w-5" aria-hidden="true" />
                {t('pricing:plans.business.current')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleUpgrade('business')}
                disabled={upgradingPlan !== null}
                className="w-full bg-accent text-white hover:bg-accent/90 font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-75"
                aria-label={t('pricing:plans.business.subscribe_label')}
              >
                {upgradingPlan === 'business' ? (
                  t('pricing:plans.business.processing')
                ) : (
                  <>
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                    {t('pricing:plans.business.try_free')} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            )}
          </div>
          <div className="bg-surface-alt p-8 flex-1 border-t border-border">
            <ul className="space-y-4">
              {featuresBusiness.map((feature, i) => (
                <li key={i} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-accent shrink-0 mr-3 mt-0.5" aria-hidden="true" />
                  <span className="text-text-secondary">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
