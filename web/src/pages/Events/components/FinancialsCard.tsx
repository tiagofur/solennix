import React from "react";
import { DollarSign } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { EventStatus } from "@/components/StatusDropdown";

export interface FinancialsCardProps {
  netSales: number;
  taxAmount: number;
  totalCost: number;
  profit: number;
  remainingValue: number;
  totalPaid: number;
  totalCharged: number;
  moneyLocale: string;
  eventCurrency: string;
  currentStatus: EventStatus;
  isDownpaymentMet: boolean;
  depositPercent: number;
  /** Called with (depositAmount - totalPaid) when the user clicks "register deposit". */
  onRegisterDeposit: (amount: number) => void;
  /** Called when the user clicks "add payment". */
  onAddPayment: () => void;
}

/**
 * Financial summary card rendered at the bottom of the summary view:
 * net sales / tax / cost / profit / pending + the payment progress bar
 * with the register-deposit and add-payment CTAs.
 *
 * State lives in the parent (EventSummary) — the two CTAs just call back
 * with the requested amount so the parent can drive viewMode / autoOpen.
 */
export const FinancialsCard: React.FC<FinancialsCardProps> = ({
  netSales,
  taxAmount,
  totalCost,
  profit,
  remainingValue,
  totalPaid,
  totalCharged,
  moneyLocale,
  eventCurrency,
  currentStatus,
  isDownpaymentMet,
  depositPercent,
  onRegisterDeposit,
  onAddPayment,
}) => {
  const { t } = useTranslation(['events', 'common']);
  const money = (n: number) => n.toLocaleString(moneyLocale, { style: 'currency', currency: eventCurrency });

  const depositMissingAmount = remainingValue > 0
    ? Math.max(0, (totalCharged * depositPercent / 100) - totalPaid)
    : 0;

  return (
    <div className="print:hidden">
      <div className="bg-card shadow-lg rounded-2xl p-6 sm:p-8 border border-border overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <DollarSign className="h-32 w-32 text-primary" />
        </div>
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-text">
          <DollarSign className="h-5 w-5 text-primary" />
          {t('events:financials.title')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{t('events:financials.net_sales')}</p>
            <p className="text-xl font-black text-text">{money(netSales)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{t('events:financials.tax')}</p>
            <p className="text-xl font-black text-text">{money(taxAmount)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{t('events:financials.costs')}</p>
            <p className="text-xl font-black text-error">{money(totalCost)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{t('events:financials.net_profit')}</p>
            <p className="text-xl font-black text-success">{money(profit)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{t('common:pending')}</p>
            <p className={clsx("text-xl font-black", remainingValue > 0 ? "text-warning" : "text-success")}>
              {money(remainingValue)}
            </p>
          </div>
        </div>

        {/* Payment Progress Bar */}
        {totalCharged > 0 && (
          <div className="mt-8 pt-6 border-t border-border relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">{t('events:summary.payment_progress')}</span>
              <span className="text-sm font-bold text-text">
                {Math.min(100, ((totalPaid / totalCharged) * 100)).toFixed(0)}%
              </span>
            </div>
            <div className="w-full bg-surface-alt rounded-full h-3 overflow-hidden">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  totalPaid >= totalCharged ? "bg-success" : "bg-primary"
                )}
                style={{ width: `${Math.min(100, (totalPaid / totalCharged) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-text-secondary">
              <span>{t('events:summary.charged')}: {money(totalPaid)}</span>
              <span>{t('common:total')}: {money(totalCharged)}</span>
            </div>
            {remainingValue > 0 && currentStatus !== "cancelled" && (
              <div className="flex flex-wrap gap-3 mt-3">
                {depositPercent > 0 && !isDownpaymentMet && (
                  <button
                    type="button"
                    onClick={() => onRegisterDeposit(depositMissingAmount)}
                    className="flex items-center gap-2 px-4 py-2 bg-warning text-white rounded-xl text-sm font-bold hover:bg-warning/90 transition-colors shadow-md shadow-warning/20"
                  >
                    <DollarSign className="h-4 w-4" />
                    {t('events:summary.actions.deposit_short')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onAddPayment()}
                  className="flex items-center gap-2 px-4 py-2 bg-surface-alt text-text border border-border rounded-xl text-sm font-bold hover:bg-surface-alt/80 transition-colors"
                >
                  <DollarSign className="h-4 w-4" />
                  {t('events:summary.actions.payment_short')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
