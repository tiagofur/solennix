import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { roundToCents } from "@/lib/finance";

export interface PaymentFormData {
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string;
}

interface PaymentFormFieldsProps {
  initialAmount?: number;
  initialDate?: string;
  initialMethod?: string;
  initialNotes?: string;
  saldoAmount?: number;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  onSubmit: (data: PaymentFormData) => Promise<void> | void;
  onCancel?: () => void;
}

const todayISO = () => new Date().toISOString().split("T")[0];

export const PaymentFormFields: React.FC<PaymentFormFieldsProps> = ({
  initialAmount = 0,
  initialDate,
  initialMethod = "cash",
  initialNotes = "",
  saldoAmount,
  submitLabel,
  cancelLabel,
  isSubmitting = false,
  onSubmit,
  onCancel,
}) => {
  const { t } = useTranslation('common');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormData>({
    defaultValues: {
      amount: parseFloat((initialAmount || 0).toFixed(2)),
      payment_date: initialDate ?? todayISO(),
      payment_method: initialMethod,
      notes: initialNotes,
    },
  });

  const finalSubmitLabel = submitLabel || t('payment.confirm');
  const finalCancelLabel = cancelLabel || t('action.cancel');

  // Re-sync amount if the parent passes a new initialAmount while the form
  // is mounted (e.g. dashboard opens the modal with a freshly-computed saldo).
  useEffect(() => {
    setValue("amount", parseFloat((initialAmount || 0).toFixed(2)));
  }, [initialAmount, setValue]);

  const showSaldoButton = typeof saldoAmount === "number" && saldoAmount > 0;

  return (
    <div className="animate-in zoom-in-95 fade-in duration-300">
      <form
        onSubmit={handleSubmit((data) => onSubmit({ ...data, amount: roundToCents(Number(data.amount)) }))}
        className="relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Plus className="h-24 w-24 text-primary" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          <div>
            <label
              htmlFor="payment-amount"
              className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2"
            >
              {t('payment.amount')} *
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary font-bold">
                $
              </span>
              <input
                id="payment-amount"
                type="number"
                step="0.01"
                {...register("amount", {
                  required: t('payment.amount_required'),
                  min: { value: 0.01, message: t('payment.amount_min_error') }
                })}
                className="block w-full bg-card border border-border rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-text focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
                placeholder="0.00"
              />
              {showSaldoButton && (
                <button
                  type="button"
                  onClick={() => setValue("amount", parseFloat((saldoAmount as number).toFixed(2)))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-black bg-success text-white rounded-md hover:bg-success/90 transition-colors uppercase"
                >
                  {t('payment.balance')}
                </button>
              )}
            </div>
            {errors.amount && (
              <p className="text-xs text-error font-bold mt-1 uppercase tracking-tighter" role="alert">
                {errors.amount.message as string}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="payment-date"
              className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2"
            >
              {t('payment.date')} *
            </label>
            <input
              id="payment-date"
              type="date"
              {...register("payment_date", { required: true })}
              className="block w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-bold text-text focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="payment-method"
              className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2"
            >
              {t('payment.method')} *
            </label>
            <select
              id="payment-method"
              {...register("payment_method")}
              className="block w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-bold text-text focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all appearance-none cursor-pointer"
            >
              <option value="cash">{t('payment.methods.cash')}</option>
              <option value="transfer">{t('payment.methods.transfer')}</option>
              <option value="card">{t('payment.methods.card')}</option>
              <option value="check">{t('payment.methods.check')}</option>
              <option value="other">{t('payment.methods.other')}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="payment-notes"
              className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2"
            >
              {t('payment.note')}
            </label>
            <input
              id="payment-notes"
              type="text"
              {...register("notes")}
              className="block w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-bold text-text focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
              placeholder={t('payment.reference_placeholder')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-black text-text-tertiary uppercase tracking-widest hover:text-text transition-colors disabled:opacity-50"
            >
              {finalCancelLabel}
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-2.5 premium-gradient text-white text-xs font-black rounded-xl hover:opacity-90 shadow-lg shadow-primary/20 transition-all uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? t('action.saving') : finalSubmitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};
