import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { paymentService } from "../../../services/paymentService";
import { Database } from "../../../types/supabase";
import { Plus, Trash2, DollarSign } from "lucide-react";
import { logError } from "../../../lib/errorHandler";
import { ConfirmDialog } from "../../../components/ConfirmDialog";

type Payment = Database["public"]["Tables"]["payments"]["Row"];

interface PaymentsProps {
  eventId: string;
  totalAmount: number;
  userId: string;
}

export const Payments: React.FC<PaymentsProps> = ({ eventId, totalAmount, userId }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      amount: 0,
      payment_date: new Date().toISOString().split("T")[0],
      payment_method: "cash",
      notes: "",
    },
  });

  useEffect(() => {
    loadPayments();
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
      await paymentService.create({
        event_id: eventId,
        user_id: userId,
        amount: Number(data.amount),
        payment_date: data.payment_date,
        payment_method: data.payment_method,
        notes: data.notes,
      });
      setIsAdding(false);
      reset();
      loadPayments();
    } catch (err) {
      logError("Error creating payment", err);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await paymentService.delete(deleteId);
      setConfirmOpen(false);
      setDeleteId(null);
      loadPayments();
    } catch (err) {
      logError("Error deleting payment", err);
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = totalAmount - totalPaid;
  const progress = totalAmount > 0 ? (totalPaid / totalAmount) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
          <DollarSign className="h-5 w-5 mr-2 text-green-600" />
          Pagos y Saldo
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
             <span className="text-sm text-gray-500 dark:text-gray-400 block">Total a Pagar</span>
             <span className="text-xl font-bold text-gray-900 dark:text-white">${totalAmount.toFixed(2)}</span>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
             <span className="text-sm text-green-600 dark:text-green-400 block">Pagado</span>
             <span className="text-xl font-bold text-green-700 dark:text-green-300">${totalPaid.toFixed(2)}</span>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
             <span className="text-sm text-red-600 dark:text-red-400 block">Saldo Pendiente</span>
             <span className="text-xl font-bold text-red-700 dark:text-red-300">${balance.toFixed(2)}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-6">
          <div 
            className={`h-2.5 rounded-full ${balance <= 0 ? 'bg-green-600' : 'bg-brand-orange'}`} 
            style={{ width: `${Math.min(progress, 100)}%` }}
          ></div>
        </div>

        {/* Payment List */}
        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg mb-4">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Fecha</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Método</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Nota</th>
                <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-white">Monto</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {payment.payment_method === 'cash' ? 'Efectivo' : 
                     payment.payment_method === 'transfer' ? 'Transferencia' : 
                     payment.payment_method === 'card' ? 'Tarjeta' : payment.payment_method}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {payment.notes || '-'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-right font-medium text-gray-900 dark:text-white">
                    ${payment.amount.toFixed(2)}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <button
                      onClick={() => {
                        setDeleteId(payment.id);
                        setConfirmOpen(true);
                      }}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No hay pagos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-brand-orange bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 focus:outline-none"
          >
            <Plus className="h-4 w-4 mr-2" /> Registrar Nuevo Pago
          </button>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md border dark:border-gray-600 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    {...register("amount", { required: "Monto requerido", min: 0.01 })}
                    className="block w-full rounded-md border-gray-300 dark:border-gray-600 pl-7 pr-12 focus:border-brand-orange focus:ring-brand-orange sm:text-sm p-2 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message as string}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha</label>
                <input
                  type="date"
                  {...register("payment_date", { required: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm p-2 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Método</label>
                <select
                  {...register("payment_method")}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm p-2 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="card">Tarjeta</option>
                  <option value="check">Cheque</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nota (Opcional)</label>
                <input
                  type="text"
                  {...register("notes")}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-orange focus:ring-brand-orange sm:text-sm p-2 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                  placeholder="Referencia, folio, etc."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex justify-center rounded-md border border-transparent bg-brand-orange px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
              >
                Guardar Pago
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Eliminar Pago"
        description="¿Estás seguro de que deseas eliminar este pago? Esto afectará el saldo pendiente."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
};
