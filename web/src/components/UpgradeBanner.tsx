import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles, AlertCircle } from 'lucide-react';

interface UpgradeBannerProps {
  type: 'limit-reached' | 'upsell';
  currentUsage?: number;
  limit?: number;
  className?: string;
}

export const UpgradeBanner: React.FC<UpgradeBannerProps> = ({ 
  type, 
  currentUsage = 0, 
  limit = 3,
  className = ''
}) => {
  if (type === 'limit-reached') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-red-200 dark:border-red-900/30 overflow-hidden relative ${className}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-100 dark:bg-red-900/20 rounded-full blur-3xl -mx-20 -my-20 opacity-50 point-events-none"></div>
        <div className="relative p-8 flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Límite de Eventos Alcanzado</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                Has alcanzado el límite de {limit} eventos mensuales de tu plan Gratis. Para seguir creciendo tu negocio y crear más eventos, mejora a nuestro plan Pro.
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 w-full max-w-sm mb-8 border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Eventos este mes</span>
                    <span className="font-bold text-red-600 dark:text-red-400">{currentUsage} / {limit}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
            </div>

            <Link 
                to="/pricing"
                className="inline-flex items-center justify-center px-8 py-3.5 border border-transparent text-base font-bold rounded-xl text-white bg-linear-to-r from-brand-orange to-orange-500 hover:from-orange-500 hover:to-orange-400 shadow-lg shadow-brand-orange/30 transition-all hover:scale-105"
            >
                <Sparkles className="h-5 w-5 mr-2" />
                Mejorar a Pro
            </Link>
        </div>
      </div>
    );
  }

  // Upsell style (e.g., to put in dashboard softly)
  return (
    <div className={`bg-linear-to-r from-brand-orange/10 to-orange-100 dark:from-brand-orange/5 dark:to-orange-900/20 rounded-xl p-6 border border-brand-orange/20 flex flex-col sm:flex-row items-center justify-between gap-6 ${className}`}>
        <div className="flex items-start gap-4 flex-1">
            <div className="h-10 w-10 bg-brand-orange/20 rounded-full flex items-center justify-center shrink-0 mt-1">
                <Sparkles className="h-5 w-5 text-brand-orange" />
            </div>
            <div>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Desbloquea el poder Crealis Pro
                    <span className="bg-brand-orange text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Pro</span>
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Lleva tu control de eventos al siguiente nivel con eventos ilimitados, personalización avanzada de PDFs y soporte prioritario.
                </p>
                <div className="mt-3 flex items-center text-xs font-medium text-gray-500 dark:text-gray-500">
                    <AlertCircle className="h-3.5 w-3.5 mr-1" />
                    En Plan Gratis: {currentUsage} de {limit} eventos mensuales usados.
                </div>
            </div>
        </div>
        <Link 
            to="/pricing"
            className="shrink-0 inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-bold rounded-lg text-white bg-brand-orange hover:bg-orange-600 shadow-xs transition-colors"
        >
            Ver Planes
        </Link>
    </div>
  );
};
