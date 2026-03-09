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
        <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary animate-spin" />
        <h2 className="text-2xl font-bold mb-2 text-text">
          Verificando pago...
        </h2>
        <p className="text-text-secondary">
          Por favor espera mientras confirmamos tu pago
        </p>
      </div>
    );
  }

  if (error || !paymentDetails) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8">
        <div className="bg-error/5 border border-error/30 rounded-lg p-6 text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-error" />
          <h2 className="text-2xl font-bold mb-2 text-error">
            Error al verificar pago
          </h2>
          <p className="text-error mb-6">{error}</p>
          <Link
            to={`/events/${id}/summary`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-error hover:bg-error/90 text-white rounded-lg transition-colors"
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
            ? 'bg-success/10 border-success/30'
            : 'bg-warning/10 border-warning/30'
        }`}
      >
        {isSuccess ? (
          <>
            <CheckCircle className="w-20 h-20 mx-auto mb-4 text-success" />
            <h1 className="text-3xl font-bold mb-2 text-success">
              ¡Pago Exitoso!
            </h1>
            <p className="text-lg text-success/80 mb-6">
              Tu pago ha sido procesado correctamente
            </p>

            <div className="bg-card rounded-lg p-6 mb-6 text-left">
              <h3 className="font-semibold text-text mb-4">
                Detalles del Pago
              </h3>
              <div className="space-y-2 text-text-secondary">
                <div className="flex justify-between">
                  <span>Monto:</span>
                  <span className="font-bold">${paymentDetails.amount.toFixed(2)} MXN</span>
                </div>
                <div className="flex justify-between">
                  <span>Estado:</span>
                  <span className="font-bold text-success">Pagado</span>
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
              <p className="text-sm text-text-secondary">
                Recibirás un correo de confirmación en breve
              </p>

              <Link
                to={`/events/${id}/summary`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-success hover:bg-success/90 text-white rounded-lg transition-colors font-semibold"
              >
                Ver detalles del evento
              </Link>

              <div className="pt-4">
                <Link
                  to="/events"
                  className="text-success hover:underline"
                >
                  Volver a la lista de eventos
                </Link>
              </div>
            </div>
          </>
        ) : (
          <>
            <XCircle className="w-20 h-20 mx-auto mb-4 text-warning" />
            <h1 className="text-3xl font-bold mb-2 text-warning">
              Pago Pendiente
            </h1>
            <p className="text-lg text-warning/80 mb-6">
              El pago está siendo procesado. Por favor espera unos minutos.
            </p>

            <Link
              to={`/events/${id}/summary`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-warning hover:bg-warning/90 text-white rounded-lg transition-colors font-semibold"
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
