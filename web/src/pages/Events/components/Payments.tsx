import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { paymentService } from "../../../services/paymentService";
import { Payment } from "../../../types/entities";
import { Plus, Trash2, DollarSign, CheckCircle, AlertCircle, Calendar, CreditCard, Banknote } from "lucide-react";
import { logError } from "../../../lib/errorHandler";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { Modal } from "../../../components/Modal";
import { useToast } from "../../../hooks/useToast";
import clsx from "clsx";

interface PaymentsProps {
  eventId: string;
  totalAmount: number;
  userId: string;
  eventStatus?: string;
  onStatusChange?: (newStatus: "quoted" | "confirmed" | "completed" | "cancelled") => void;
  eventData?: any;
  profile?: any;
  initialAmount?: number;
  autoOpenAdd?: boolean;
}

export const Payments: React.FC<PaymentsProps> = ({
  eventId,
  totalAmount,
  userId,
  eventStatus,
  onStatusChange,
  initialAmount,
  autoOpenAdd,
}) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { addToast } = useToast();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      amount: 0,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "cash",
      notes: "",
    },
  });

  useEffect(() => {
    if (autoOpenAdd) {
      setIsAdding(true);
      if (initialAmount !== undefined) {
        setValue("amount", parseFloat(initialAmount.toFixed(2)));
      }
    }
  }, [autoOpenAdd, initialAmount, setValue]);

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const loadPayments = async () => {
    try {
      const data = await paymentService.getByEventId(eventId);
      setPayments(data || []);
    } catch (err) {
      logError("Error loading payments", err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const newPaymentAmount = Number(data.amount);
      await paymentService.create({
        event_id: eventId,
        user_id: userId,
        amount: newPaymentAmount,
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        notes: data.notes,
      });

      if (newPaymentAmount > 0 && eventStatus === "quoted" && onStatusChange) {
        onStatusChange("confirmed");
        setStatusMessage("✅ Pago registrado. El evento ha sido marcado como Confirmado.");
        setTimeout(() => setStatusMessage(null), 5000);
      }

      setIsAdding(false);
      reset();
      loadPayments();
      addToast("Pago registrado correctamente.", "success");
    } catch (err) {
      logError("Error creating payment", err);
      addToast("Error al registrar el pago.", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await paymentService.delete(deleteId);
      addToast('Pago eliminado correctamente.', 'success');
      setConfirmOpen(false);
      setDeleteId(null);
      loadPayments();
    } catch (err) {
      logError("Error deleting payment", err);
      addToast('Error al eliminar el pago.', 'error');
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalAmount - totalPaid;
  const progress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;
  const isFullyPaid = balance <= 0.01;

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'card': return <CreditCard className="h-3.5 w-3.5" />;
      case 'transfer': return <CreditCard className="h-3.5 w-3.5" />;
      case 'cash': return <Banknote className="h-3.5 w-3.5" />;
      default: return <DollarSign className="h-3.5 w-3.5" />;
    }
  };

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
            <p className="font-bold text-sm">El evento está totalmente pagado pero sigue como "Cotizado".</p>
            <button
              type="button"
              onClick={() => onStatusChange && onStatusChange("confirmed")}
              className="text-xs font-black uppercase tracking-wider underline mt-1"
            >
              Confirmar ahora
            </button>
          </div>
        </div>
      )}

      <div className="bg-card shadow-sm rounded-3xl p-6 sm:p-8 border border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-black text-text uppercase tracking-tight flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" aria-hidden="true" />
              Pagos y Saldo
            </h2>
            <p className="text-text-tertiary text-xs font-bold uppercase tracking-widest mt-1">Control de ingresos del evento</p>
          </div>
          
          <div className="flex items-center gap-3">
            {!isAdding && (
              <button
                type="button"
                onClick={() => { reset(); setIsAdding(true); }}
                className="inline-flex items-center px-5 py-2.5 premium-gradient text-white text-sm font-black rounded-2xl hover:opacity-90 shadow-lg shadow-primary/20 transition-all active:scale-95 uppercase tracking-tighter"
              >
                <Plus className="h-4 w-4 mr-2" /> 
                Registrar Pago
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface-alt/50 p-6 rounded-2xl border border-border/50">
             <p className="text-[10px] font-black text-text-tertiary uppercase tracking-tighter mb-1">Total del Evento</p>
             <p className="text-2xl font-black text-text">${totalAmount.toFixed(2)}</p>
          </div>
          <div className="bg-success/5 p-6 rounded-2xl border border-success/10">
             <p className="text-[10px] font-black text-success/70 uppercase tracking-tighter mb-1">Total Pagado</p>
             <p className="text-2xl font-black text-success">${totalPaid.toFixed(2)}</p>
          </div>
          <div className={clsx(
            "p-6 rounded-2xl border",
            balance > 0.01
              ? "bg-error/5 border-error/10"
              : "bg-info/5 border-info/10"
          )}>
             <p className={clsx(
               "text-[10px] font-black uppercase tracking-tighter mb-1",
               balance > 0.01 ? "text-error/70" : "text-info/70"
             )}>
               {balance > 0.01 ? 'Saldo Pendiente' : 'Saldo Liquidado'}
             </p>
             <p className={clsx(
               "text-2xl font-black",
               balance > 0.01 ? "text-error" : "text-info"
             )}>
               ${Math.abs(balance).toFixed(2)}
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
             <span className="text-[9px] font-black text-white mix-blend-difference uppercase tracking-widest">
               {Math.min(progress, 100).toFixed(0)}% Completado
             </span>
          </div>
        </div>

        <div className="bg-surface-alt/30 rounded-2xl border border-border overflow-hidden">
          <table className="min-w-full text-sm" aria-label="Historial de pagos">
            <thead>
              <tr className="text-left text-[10px] font-black text-text-tertiary uppercase tracking-wider border-b border-border bg-surface-alt/50">
                <th scope="col" className="py-4 px-6">Fecha</th>
                <th scope="col" className="py-4 px-6">Método</th>
                <th scope="col" className="py-4 px-6">Nota</th>
                <th scope="col" className="py-4 px-6 text-right">Monto</th>
                <th scope="col" className="py-4 px-6 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {payments.map((payment) => (
                <tr key={payment.id} className="group hover:bg-surface-alt/50 transition-colors">
                  <td className="py-4 px-6 font-semibold text-text flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-text-tertiary" />
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-card border border-border text-[10px] font-black uppercase tracking-tight text-text-secondary">
                      {getMethodIcon(payment.payment_method)}
                      {payment.payment_method === 'cash' ? 'Efectivo' :
                       payment.payment_method === 'transfer' ? 'Transferencia' :
                       payment.payment_method === 'card' ? 'Tarjeta' : payment.payment_method}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-text-secondary italic text-xs">
                    {payment.notes || '-'}
                  </td>
                  <td className="py-4 px-6 text-right font-black text-text">
                    ${payment.amount.toFixed(2)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteId(payment.id);
                        setConfirmOpen(true);
                      }}
                      className="p-2 text-text-secondary hover:text-error hover:bg-error/10 rounded-lg transition-all"
                      aria-label="Eliminar pago"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-text-tertiary italic">
                    No hay pagos registrados para este evento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Modal
          isOpen={isAdding}
          onClose={() => setIsAdding(false)}
          title="Registrar Pago"
          maxWidth="2xl"
        >
          <div className="animate-in zoom-in-95 fade-in duration-300">
            <form 
              onSubmit={handleSubmit(onSubmit)} 
              className="relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                <Plus className="h-24 w-24 text-primary" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div>
                  <label htmlFor="payment-amount" className="block text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Monto *</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary font-bold">$</span>
                    <input
                      id="payment-amount"
                      type="number"
                      step="0.01"
                      {...register("amount", { required: "Monto requerido", min: 0.01 })}
                      className="block w-full bg-card border border-border rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-text focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
                      placeholder="0.00"
                    />
                    {balance > 0 && (
                      <button
                        type="button"
                        onClick={() => setValue("amount", parseFloat(balance.toFixed(2)))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[9px] font-black bg-success text-white rounded-md hover:bg-success/90 transition-colors uppercase"
                      >
                        Saldo
                      </button>
                    )}
                  </div>
                  {errors.amount && <p className="text-[10px] text-error font-bold mt-1 uppercase tracking-tighter">{errors.amount.message as string}</p>}
                </div>

                <div>
                  <label htmlFor="payment-date" className="block text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Fecha *</label>
                  <input
                    id="payment-date"
                    type="date"
                    {...register("payment_date", { required: true })}
                    className="block w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-bold text-text focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="payment-method" className="block text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Método *</label>
                  <select
                    id="payment-method"
                    {...register("payment_method")}
                    className="block w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-bold text-text focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all appearance-none cursor-pointer"
                  >
                    <option value="cash">Efectivo 💵</option>
                    <option value="transfer">Transferencia 🏦</option>
                    <option value="card">Tarjeta 💳</option>
                    <option value="check">Cheque 📝</option>
                    <option value="other">Otro 🏷️</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="payment-notes" className="block text-[10px] font-black text-text-tertiary uppercase tracking-widest mb-2">Nota</label>
                  <input
                    id="payment-notes"
                    type="text"
                    {...register("notes")}
                    className="block w-full bg-card border border-border rounded-xl px-4 py-3 text-sm font-bold text-text focus:ring-2 focus:ring-primary/20 focus:border-primary outline-hidden transition-all"
                    placeholder="Ref. de pago..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-2.5 text-xs font-black text-text-tertiary uppercase tracking-widest hover:text-text transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 premium-gradient text-white text-xs font-black rounded-xl hover:opacity-90 shadow-lg shadow-primary/20 transition-all uppercase tracking-widest"
                >
                  Confirmar Pago
                </button>
              </div>
            </form>
          </div>
        </Modal>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar Pago"
        description="¿Estás seguro de que deseas eliminar este registro de pago? El saldo pendiente se actualizará automáticamente."
        confirmText="Eliminar permanentemente"
        cancelText="Conservar"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};
