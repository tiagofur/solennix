import React, { useState } from 'react';
import { Shield, Zap, CheckCircle, ArrowRight, Star } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import { logError } from '../lib/errorHandler';

export const Pricing: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, checkAuth } = useAuth();

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      setError(null);
      const { url } = await subscriptionService.createCheckoutSession();
      if (url) {
        window.location.href = url;
      }
    } catch (err: unknown) {
      logError('Failed to create checkout session', err);
      const detail = err instanceof Error ? err.message : '';
      setError('Hubo un error al iniciar el proceso de pago. Por favor intenta nuevamente.' + (detail ? ` (${detail})` : ''));
    } finally {
      setLoading(false);
    }
  };

  const handleDebugUpgrade = async () => {
    try {
      setLoading(true);
      setError(null);
      await subscriptionService.debugUpgrade();
      await checkAuth(); // Refrescar contexto para obtener el nuevo plan
      alert('Plan actualizado a Premium (Modo Debug)');
    } catch (err: unknown) {
      logError('Failed to debug upgrade', err);
      setError('Error al actualizar plan en modo debug.');
    } finally {
      setLoading(false);
    }
  };

  const featuresFree = [
    'Hasta 3 eventos por mes',
    'Hasta 50 clientes registrados',
    'Hasta 20 ítems en catálogo',
    'Gestión básica de clientes',
    'Calendario de eventos',
    'Generación de PDFs (cotizaciones, contratos y más)',
  ];

  const featuresPro = [
    'Eventos ilimitados',
    'Clientes y catálogo ilimitados',
    'Control de pagos e ingresos en múltiples plazos',
    'Reportes y analíticas avanzadas',
    'Soporte prioritario',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
      <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
        <h1 className="text-4xl font-extrabold text-text tracking-tight sm:text-5xl lg:text-6xl">
          Planes y Precios
        </h1>
        <p className="mt-2 text-xl text-text-secondary">
          Potencia tu negocio de eventos
        </p>
        <p className="mt-5 text-xl text-text-secondary">
          Elige el plan que se adapte al tamaño y crecimiento de tus eventos.
        </p>
      </div>

      {error && (
        <div className="mb-8 max-w-max mx-auto bg-error/5 border-l-4 border-error p-4 rounded-md" role="alert">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-error">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Free Plan */}
        <div className="bg-card rounded-2xl shadow-lg border border-border overflow-hidden flex flex-col">
          <div className="p-8 sm:p-10">
            <h3 className="text-2xl font-semibold text-text mb-2">Básico</h3>
            <p className="text-text-secondary mb-6">Perfecto para empezar y organizar eventos pequeños.</p>
            <div className="flex items-baseline mb-8">
              <span className="text-5xl font-extrabold text-text">$0</span>
              <span className="text-xl text-text-secondary ml-2">/mes</span>
            </div>
            
            <button
              type="button"
              disabled
              className="w-full bg-surface-alt text-text-secondary font-medium py-3 px-4 rounded-xl cursor-not-allowed"
              aria-label="Plan Básico - Plan actual"
            >
              Plan Actual
            </button>
          </div>
          <div className="bg-surface-alt p-8 sm:p-10 flex-1 border-t border-border">
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

        {/* Pro Plan */}
        <div className="bg-linear-to-br from-primary via-primary-dark to-accent rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all hover:-translate-y-1 relative" style={{background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 45%, var(--color-accent) 100%)'}}>
          <div className="absolute top-0 right-0 bg-white/25 backdrop-blur-sm text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-widest">
            Recomendado
          </div>
          <div className="p-8 sm:p-10">
            <div className="flex items-center mb-2">
              <h3 className="text-2xl font-semibold text-white">Pro</h3>
              <Star className="h-5 w-5 text-warning ml-2 fill-current" aria-hidden="true" />
            </div>
            <p className="text-primary-light mb-4">Todas las herramientas para escalar tu negocio sin límites.</p>
            {/* Promo badge */}
            <div className="inline-flex items-center gap-1.5 bg-primary-light/20 text-primary-light text-xs font-bold px-3 py-1 rounded-full mb-4">
              🎉 Precio de lanzamiento — ¡Por tiempo limitado!
            </div>
            <div className="flex items-baseline mb-6">
              <span className="text-4xl font-black text-white">$1,499</span>
              <span className="text-xl text-primary-light line-through opacity-75 ml-2">$2,499</span>
              <span className="text-lg text-primary-light font-medium ml-2">MXN/año</span>
            </div>
            <div className="flex items-baseline mb-8">
              <span className="text-2xl font-bold text-white">$149</span>
              <span className="text-xl text-primary-light line-through opacity-75 ml-2">$199</span>
              <span className="text-lg text-primary-light font-medium ml-2">MXN/mes</span>
            </div>
            
            {(user?.plan === 'premium' || user?.plan === 'pro') ? (
              <button
                type="button"
                disabled
                className="w-full bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-xl cursor-not-allowed border border-white/30 flex items-center justify-center gap-2"
                aria-label="Plan Pro - Tu plan actual"
              >
                <Shield className="h-5 w-5" aria-hidden="true" />
                Tu plan actual
              </button>
            ) : (
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full bg-white text-primary-dark hover:bg-primary-light font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-75 hover:shadow-xl"
                aria-label="Suscribirse al Plan Pro - Iniciar proceso de pago"
              >
                {loading ? 'Procesando...' : (
                  <>
                    <Zap className="h-5 w-5 text-warning" aria-hidden="true" />
                    Comenzar ahora <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            )}
            
            {/* Desarrollo: Botón para simular upgrade sin stripe */}
            {import.meta.env.MODE === 'development' && user?.plan !== 'premium' && user?.plan !== 'pro' && (
              <button
                type="button"
                onClick={handleDebugUpgrade}
                disabled={loading}
                className="w-full mt-3 bg-black/20 hover:bg-black/30 text-white/80 hover:text-white font-medium py-2 px-4 rounded-lg text-sm border border-white/20 transition-colors"
                aria-label="Modo desarrollo - Actualizar a Pro sin pago"
              >
                [Dev] Upgrade (Mode Debug)
              </button>
            )}
          </div>
          <div className="bg-black/20 backdrop-blur-sm p-8 sm:p-10 flex-1 border-t border-white/20">
            <ul className="space-y-4">
              <li className="flex items-start">
                <CheckCircle className="h-5 w-5 text-white shrink-0 mr-3 mt-0.5" aria-hidden="true" />
                <span className="text-white font-semibold">Todo lo anterior, y además:</span>
              </li>
              {featuresPro.map((feature, i) => (
                <li key={i} className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-primary-light shrink-0 mr-3 mt-0.5" aria-hidden="true" />
                  <span className="text-white">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
