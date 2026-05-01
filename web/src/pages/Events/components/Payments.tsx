import React, { useCallback, useEffect, useState } from "react";
import { paymentService } from "../../../services/paymentService";
import { Payment } from "../../../types/entities";
import { Trash2, DollarSign, CheckCircle, AlertCircle, Calendar, CreditCard, Banknote } from "lucide-react";
import { logError } from "../../../lib/errorHandler";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { Modal } from "../../../components/Modal";
import { PaymentFormFields, PaymentFormData } from "../../../components/PaymentFormFields";
import { useToast } from "../../../hooks/useToast";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

interface PaymentsProps {
  eventId: string;
  totalAmount: number;
  userId?: string;
  eventStatus?: string;
  onStatusChange?: (newStatus: "quoted" | "confirmed" | "completed" | "cancelled") => void;
  eventData?: { deposit_percent?: number | null };
  initialAmount?: number;
  autoOpenAdd?: boolean;
  onPaymentAdded?: () => void;
}

export const Payments: React.FC<PaymentsProps> = ({
  eventId,
  totalAmount,
  userId: _userId,
  eventStatus,
  onStatusChange,
  eventData,
  initialAmount,
  autoOpenAdd,
  onPaymentAdded,
}) => {
  const { t, i18n } = useTranslation(["events"]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [formInitialAmount, setFormInitialAmount] = useState(0);
  const [formInitialNotes, setFormInitialNotes] = useState("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { addToast } = useToast();
  const currencyFormatter = new Intl.NumberFormat(i18n.language === "en" ? "en-US" : "es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatCurrency = (amount: number) => currencyFormatter.format(amount);
  const formatDate = (value: string) => new Date(value).toLocaleDateString(i18n.language === "en" ? "en-US" : "es-MX");

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "cash":
        return t("events:summary.payments.form.methods.cash");
      case "transfer":
        return t("events:summary.payments.form.methods.transfer");
      case "card":
        return t("events:summary.payments.form.methods.card");
      case "check":
        return t("events:summary.payments.form.methods.check");
      case "other":
        return t("events:summary.payments.form.methods.other");
      default:
        return method;
    }
  };

  useEffect(() => {
    if (autoOpenAdd) {
      setModalTitle(t("events:summary.payments.form.register_payment"));
      setFormInitialAmount(initialAmount !== undefined ? initialAmount : 0);
      setFormInitialNotes("");
      setIsAdding(true);
    }
  }, [autoOpenAdd, initialAmount, t]);

  const openAddPayment = () => {
    setModalTitle(t("events:summary.payments.form.register_payment"));
    setFormInitialAmount(0);
    setFormInitialNotes("");
    setIsAdding(true);
  };

  const openAddDeposit = () => {
    setModalTitle(t("events:summary.payments.form.register_deposit"));
    setFormInitialAmount(depositBalance);
    setFormInitialNotes(t("events:summary.payments.form.deposit_note"));
    setIsAdding(true);
  };

  const loadPayments = useCallback(async () => {
    try {
      const data = await paymentService.getByEventId(eventId);
      setPayments(data || []);
    } catch (err) {
      logError("Error loading payments", err);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const onSubmit = async (data: PaymentFormData) => {
    setIsSavingPayment(true);
    try {
      const newPaymentAmount = Number(data.amount);
      // `user_id` is NOT sent in the body — the backend takes the
      // authenticated user from the JWT.
      await paymentService.create({
        event_id: eventId,
        amount: newPaymentAmount,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        notes: data.notes,
      });

      if (newPaymentAmount > 0 && eventStatus === "quoted" && onStatusChange) {
        onStatusChange("confirmed");
        setStatusMessage(t("events:summary.payments.status_confirmed_message"));
        setTimeout(() => setStatusMessage(null), 5000);
      }

      setIsAdding(false);
      loadPayments();
      onPaymentAdded?.();
      addToast(t("events:summary.payments.success_create"), "success");
    } catch (err) {
      logError("Error creating payment", err);
      addToast(t("events:summary.payments.error_create"), "error");
    } finally {
      setIsSavingPayment(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await paymentService.delete(deleteId);
      addToast(t('events:summary.payments.success_delete'), 'success');
      setConfirmOpen(false);
      setDeleteId(null);
      loadPayments();
      onPaymentAdded?.();
    } catch (err) {
      logError("Error deleting payment", err);
      addToast(t('events:summary.payments.error_delete'), 'error');
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalAmount - totalPaid;
  const progress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;
  const isFullyPaid = balance <= 0.01;
  const depositPercent = eventData?.deposit_percent || 0;
  const depositAmount = totalAmount * (depositPercent / 100);
  const depositBalance = Math.max(depositAmount - totalPaid, 0);

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'card': return <CreditCard className="h-3.5 w-3.5" />;
      case 'transfer': return <CreditCard className="h-3.5 w-3.5" />;
      case 'cash': return <Banknote className="h-3.5 w-3.5" />;
      default: return <DollarSign className="h-3.5 w-3.5" />;
    }
  };

  if (isLoading && payments.length === 0) {
    return <div className="py-8 text-center text-text-secondary text-sm">{t("events:summary.payments.loading")}</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {statusMessage && (
        <div className="bg-success/10 border border-success/20 rounded-2xl p-4 flex items-center text-success" role="status">
          <CheckCircle className="h-5 w-5 mr-3 shrink-0" aria-hidden="true" />
          <p className="font-bold text-sm">{statusMessage}</p>
        </div>
      )}

      {isFullyPaid && eventStatus === "quoted" && !statusMessage && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start text-primary" role="alert">
          <AlertCircle className="h-5 w-5 mr-3 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-bold text-sm">{t("events:summary.payments.fully_paid_warning")}</p>
            <button
              type="button"
              onClick={() => onStatusChange && onStatusChange("confirmed")}
              className="text-xs font-black uppercase tracking-wider underline mt-1"
            >
              {t("events:summary.payments.confirm_now")}
            </button>
          </div>
        </div>
      )}

      <div className="bg-card shadow-sm rounded-2xl p-6 sm:p-8 border border-border overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none" aria-hidden="true">
          <DollarSign className="h-32 w-32 text-primary" />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-text uppercase tracking-tight flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" aria-hidden="true" />
               {t("events:summary.payments.title")}
             </h2>
            <p className="text-text-tertiary text-xs font-bold uppercase tracking-widest mt-1">{t("events:summary.payments.subtitle")}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {!isAdding && depositPercent > 0 && (
              <button
                type="button"
                onClick={openAddDeposit}
                className="inline-flex items-center px-4 py-2 bg-warning text-white text-sm font-bold rounded-xl hover:bg-warning/90 shadow-md shadow-warning/20 transition-all active:scale-95"
              >
                <DollarSign className="h-4 w-4 mr-1.5" />
                {t("events:summary.payments.deposit_button")}
              </button>
            )}
            {!isAdding && (
              <button
                type="button"
                onClick={openAddPayment}
                className="inline-flex items-center px-4 py-2 bg-surface-alt text-text border border-border text-sm font-bold rounded-xl hover:bg-surface-alt/80 transition-all active:scale-95"
              >
                <DollarSign className="h-4 w-4 mr-1.5" />
                {t("events:summary.payments.payment_button")}
              </button>
            )}
          </div>
        </div>

        <div className={clsx("grid gap-6 mb-8", depositPercent > 0 ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3")}>
          <div className="bg-surface-alt/50 p-6 rounded-2xl border border-border/50">
             <p className="text-xs font-black text-text-tertiary uppercase tracking-tighter mb-1">{t("events:summary.payments.kpi_total")}</p>
             <p className="text-2xl font-black text-text">{formatCurrency(totalAmount)}</p>
          </div>
          {depositPercent > 0 && (
            <div className="bg-warning/5 p-6 rounded-2xl border border-warning/20">
              <p className="text-xs font-black text-warning/70 uppercase tracking-tighter mb-1">{t("events:summary.payments.kpi_deposit", { percent: depositPercent })}</p>
              <p className="text-2xl font-black text-warning">{formatCurrency(depositAmount)}</p>
            </div>
          )}
          <div className="bg-success/5 p-6 rounded-2xl border border-success/10">
             <p className="text-xs font-black text-success/70 uppercase tracking-tighter mb-1">{t("events:summary.payments.kpi_paid")}</p>
             <p className="text-2xl font-black text-success">{formatCurrency(totalPaid)}</p>
          </div>
          <div className={clsx(
            "p-6 rounded-2xl border",
            balance > 0.01
              ? "bg-error/5 border-error/10"
              : "bg-info/5 border-info/10"
          )}>
             <p className={clsx(
               "text-xs font-black uppercase tracking-tighter mb-1",
               balance > 0.01 ? "text-error/70" : "text-info/70"
             )}>
                {balance > 0.01 ? t('events:summary.payments.kpi_balance_pending') : t('events:summary.payments.kpi_balance_settled')}
             </p>
             <p className={clsx(
               "text-2xl font-black",
               balance > 0.01 ? "text-error" : "text-info"
             )}>
                {formatCurrency(Math.abs(balance))}
             </p>
          </div>
        </div>

        <div className="w-full bg-surface-alt rounded-full h-3 mb-10 overflow-hidden relative">
          <div
            className={clsx(
              "h-full rounded-full transition-all duration-1000 ease-out",
              isFullyPaid ? 'bg-success' : 'bg-primary'
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
            role="progressbar"
          />
          <div className="absolute inset-0 flex items-center justify-center">
             <span className="text-xs font-black text-white mix-blend-difference uppercase tracking-widest">
                {t("events:summary.payments.progress_complete", { percent: Math.min(progress, 100).toFixed(0) })}
             </span>
          </div>
        </div>

        <div className="bg-surface-alt/30 rounded-2xl border border-border overflow-hidden">
          <table className="min-w-full text-sm" aria-label={t("events:summary.payments.history_aria")}>
            <thead>
              <tr className="text-left text-xs font-black text-text-tertiary uppercase tracking-wider border-b border-border bg-surface-alt/50">
                <th scope="col" className="py-4 px-6">{t("events:summary.payments.table.date")}</th>
                <th scope="col" className="py-4 px-6">{t("events:summary.payments.table.method")}</th>
                <th scope="col" className="py-4 px-6">{t("events:summary.payments.table.notes")}</th>
                <th scope="col" className="py-4 px-6 text-right">{t("events:summary.payments.table.amount")}</th>
                <th scope="col" className="py-4 px-6 text-right">{t("events:summary.payments.table.action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {payments.map((payment) => (
                <tr key={payment.id} className="group hover:bg-surface-alt/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-text flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                    {formatDate(payment.payment_date)}
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-card border border-border text-xs font-black uppercase tracking-tight text-text-secondary">
                      {getMethodIcon(payment.payment_method)}
                      {getMethodLabel(payment.payment_method)}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-text-secondary italic text-xs">
                    {payment.notes || t("events:summary.payments.table.notes_empty")}
                  </td>
                  <td className="py-4 px-6 text-right font-black text-text">
                    {formatCurrency(payment.amount)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteId(payment.id);
                        setConfirmOpen(true);
                      }}
                      className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-all"
                      aria-label={t("events:summary.payments.delete_aria")}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-text-tertiary italic">
                    {t("events:summary.payments.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Modal
          isOpen={isAdding}
          onClose={() => setIsAdding(false)}
          title={modalTitle}
          maxWidth="2xl"
          titleId="payment-modal-title"
        >
          <PaymentFormFields
            initialAmount={formInitialAmount}
            initialNotes={formInitialNotes}
            saldoAmount={balance > 0 ? balance : undefined}
            submitLabel={t("events:summary.payments.form.confirm")}
            cancelLabel={t("events:summary.payments.form.cancel")}
            isSubmitting={isSavingPayment}
            onCancel={() => setIsAdding(false)}
            onSubmit={onSubmit}
          />
        </Modal>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t("events:summary.payments.delete_title")}
        description={t("events:summary.payments.delete_description")}
        confirmText={t("events:summary.payments.delete_confirm")}
        cancelText={t("events:summary.payments.delete_cancel")}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};
