import React, { useState } from 'react';
import { Shield, Zap, CheckCircle, ArrowRight, Star } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';

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
      console.error('Failed to create checkout session:', err);
      setError('Hubo un error al iniciar el proceso de pago. Por favor intenta nuevamente.');
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
      console.error('Failed to debug upgrade:', err);
      setError('Error al actualizar plan en modo debug.');
    } finally {
      setLoading(false);
    }
  };

  const featuresFree = [
    'Hasta 3 eventos por mes',
    'Catálogo de productos e inventario',
    'Gestión de clientes básica',
    'Generación de cotizaciones PDF estándar',
  ];

  const featuresPro = [
    'Eventos ilimitados',
    'Control de pagos e ingresos en múltiples plazos',
    'Integración con calendario de Google',
    'Reportes y analíticas avanzadas',
    'Soporte prioritario',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl">
          Potencia tu negocio de eventos
        </h1>
        <p className="mt-5 text-xl text-gray-500">
          Elige el plan que se adapte al tamaño y crecimiento de tus eventos.
        </p>
      </div>

      {error && (
        <div className="mb-8 max-w-max mx-auto bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {/* Free Plan */}
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">Básico</h3>
            <p className="text-gray-500 mb-6">Perfecto para empezar y organizar eventos pequeños.</p>
            <div className="flex items-baseline mb-8">
              <span className="text-5xl font-extrabold text-gray-900">$0</span>
              <span className="text-xl text-gray-500 ml-2">/mes</span>
            </div>
            
            <button 
              disabled
              className="w-full bg-gray-100 text-gray-500 font-medium py-3 px-4 rounded-xl cursor-not-allowed"
            >
              Plan Actual
            </button>
          </div>
          <div className="bg-gray-50 p-8 flex-1 border-t border-gray-100">
            <ul className="space-y-4">
              {featuresFree.map((feature, i) => (
                <li key={i} className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 shrink-0 mr-3" />
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pro Plan */}
        <div className="bg-brand-900 rounded-2xl shadow-xl overflow-hidden flex flex-col transform transition-all hover:-translate-y-1 relative ring-4 ring-brand-500 ring-opacity-50">
          <div className="absolute top-0 right-0 bg-linear-to-l from-brand-400 to-brand-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
            Recomendado
          </div>
          <div className="p-8">
            <div className="flex items-center mb-2">
              <h3 className="text-2xl font-semibold text-white">Pro</h3>
              <Star className="h-5 w-5 text-yellow-400 ml-2 fill-current" />
            </div>
            <p className="text-brand-100 mb-6">Todas las herramientas para escalar tu negocio sin límites.</p>
            <div className="flex items-baseline mb-8">
              <span className="text-5xl font-extrabold text-white">$499</span>
              <span className="text-xl text-brand-200 ml-2">MXN/mes</span>
            </div>
            
            {user?.plan === 'premium' ? (
              <button 
                disabled
                className="w-full bg-brand-800 text-brand-100 font-medium py-3 px-4 rounded-xl cursor-not-allowed shadow-inner flex items-center justify-center"
              >
                <Shield className="h-5 w-5 mr-2" />
                Tu plan actual
              </button>
            ) : (
              <button 
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full bg-white text-brand-600 hover:bg-gray-50 font-bold py-3 px-4 rounded-xl shadow-md transition duration-150 ease-in-out flex items-center justify-center disabled:opacity-75"
              >
                {loading ? 'Procesando...' : (
                  <>
                    <Zap className="h-5 w-5 mr-2 text-yellow-500" />
                    Obtener Premium <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>
            )}
            
            {/* Desarrollo: Botón para simular upgrade sin stripe */}
            {import.meta.env.MODE === 'development' && user?.plan !== 'premium' && (
              <button 
                onClick={handleDebugUpgrade}
                disabled={loading}
                className="w-full mt-3 bg-brand-800 text-brand-200 hover:text-white font-medium py-2 px-4 rounded-lg text-sm border border-brand-700"
              >
                [Dev] Upgrade (Mode Debug)
              </button>
            )}
          </div>
          <div className="bg-brand-800 p-8 flex-1 border-t border-brand-700">
            <ul className="space-y-4">
              <li className="flex items-start">
                <CheckCircle className="h-6 w-6 text-brand-300 shrink-0 mr-3" />
                <span className="text-white font-medium">Todo lo del plan básico, y además:</span>
              </li>
              {featuresPro.map((feature, i) => (
                <li key={i} className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-brand-400 shrink-0 mr-3" />
                  <span className="text-brand-100">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
