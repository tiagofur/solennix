import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { eventPaymentService } from '@/services/eventPaymentService';
import { logError } from '@/lib/errorHandler';

export default function EventPaymentSuccess() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<{
    status: string;
    amount: number;
    email: string;
  } | null>(null);

  useEffect(() => {
    if (!id || !sessionId) {
      setError('Información de pago faltante');
      setLoading(false);
      return;
    }

    const fetchPaymentDetails = async () => {
      try {
        const session = await eventPaymentService.getPaymentSession(id, sessionId);
        setPaymentDetails({
          status: session.payment_status,
          amount: session.amount_total,
          email: session.customer_email,
        });
      } catch (err) {
        logError(err, 'Failed to fetch payment session');
        setError('No se pudo verificar el pago. Por favor contacta a soporte.');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [id, sessionId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 text-center">
        <Loader2 className="w-16 h-16 mx-auto mb-4 text-brand-orange animate-spin" />
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
          Verificando pago...
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Por favor espera mientras confirmamos tu pago
        </p>
      </div>
    );
  }

  if (error || !paymentDetails) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600 dark:text-red-400" />
          <h2 className="text-2xl font-bold mb-2 text-red-900 dark:text-red-300">
            Error al verificar pago
          </h2>
          <p className="text-red-700 dark:text-red-400 mb-6">{error}</p>
          <Link
            to={`/events/${id}/summary`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al evento
          </Link>
        </div>
      </div>
    );
  }

  const isSuccess = paymentDetails.status === 'paid';

  return (
    <div className="max-w-2xl mx-auto mt-12 p-8">
      <div
        className={`border rounded-lg p-8 text-center ${
          isSuccess
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}
      >
        {isSuccess ? (
          <>
            <CheckCircle className="w-20 h-20 mx-auto mb-4 text-green-600 dark:text-green-400" />
            <h1 className="text-3xl font-bold mb-2 text-green-900 dark:text-green-300">
              ¡Pago Exitoso!
            </h1>
            <p className="text-lg text-green-700 dark:text-green-400 mb-6">
              Tu pago ha sido procesado correctamente
            </p>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Detalles del Pago
              </h3>
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                <div className="flex justify-between">
                  <span>Monto:</span>
                  <span className="font-bold">${paymentDetails.amount.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">Pagado</span>
                </div>
                {paymentDetails.email && (
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="font-mono text-sm">{paymentDetails.email}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Recibirás un correo de confirmación en breve
              </p>

              <Link
                to={`/events/${id}/summary`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold"
              >
                Ver detalles del evento
              </Link>

              <div className="pt-4">
                <Link
                  to="/events"
                  className="text-green-700 dark:text-green-400 hover:underline"
                >
                  Volver a la lista de eventos
                </Link>
              </div>
            </div>
          </>
        ) : (
          <>
            <XCircle className="w-20 h-20 mx-auto mb-4 text-yellow-600 dark:text-yellow-400" />
            <h1 className="text-3xl font-bold mb-2 text-yellow-900 dark:text-yellow-300">
              Pago Pendiente
            </h1>
            <p className="text-lg text-yellow-700 dark:text-yellow-400 mb-6">
              El pago está siendo procesado. Por favor espera unos minutos.
            </p>

            <Link
              to={`/events/${id}/summary`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver al evento
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
