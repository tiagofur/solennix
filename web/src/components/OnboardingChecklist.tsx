import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { clientService } from '../services/clientService';
import { productService } from '../services/productService';
import { eventService } from '../services/eventService';
import { CheckCircle2, Circle, X, Users, Package, CalendarPlus, ChevronRight } from 'lucide-react';

export const OnboardingChecklist: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [hasClient, setHasClient] = useState(false);
  const [hasProduct, setHasProduct] = useState(false);
  const [hasEvent, setHasEvent] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const hideKey = `hideOnboarding_${user.id}`;
    if (localStorage.getItem(hideKey) === 'true') {
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        const [clients, products, events] = await Promise.all([
          clientService.getAll(),
          productService.getAll(),
          eventService.getUpcoming(1) // Just need to know if any exist
        ]);

        const clientExists = (clients || []).length > 0;
        const productExists = (products || []).length > 0;
        const eventExists = (events || []).length > 0;

        setHasClient(clientExists);
        setHasProduct(productExists);
        setHasEvent(eventExists);

        let completed = 0;
        if (clientExists) completed++;
        if (productExists) completed++;
        if (eventExists) completed++;

        setProgress(Math.round((completed / 3) * 100));
        
        // Show only if not 100% complete
        if (completed < 3) {
          setIsVisible(true);
        } else {
          // If 100% complete, auto-hide forever
          localStorage.setItem(hideKey, 'true');
        }
      } catch (error) {
        console.error("Error checking onboarding status", error);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [user]);

  const handleDismiss = () => {
    if (!user) return;
    localStorage.setItem(`hideOnboarding_${user.id}`, 'true');
    setIsVisible(false);
  };

  if (loading || !isVisible) return null;

  const steps = [
    {
      id: 'client',
      title: 'Añade tu primer cliente',
      description: 'Registra los datos básicos para poder cotizarle.',
      icon: <Users className="h-5 w-5" />,
      href: '/clients/new',
      isCompleted: hasClient,
    },
    {
      id: 'product',
      title: 'Crea tu primer producto',
      description: 'Añade servicios o productos a tu catálogo de cotización.',
      icon: <Package className="h-5 w-5" />,
      href: '/products/new',
      isCompleted: hasProduct,
    },
    {
      id: 'event',
      title: 'Agenda un evento',
      description: 'Usa a tu cliente y tus productos para crear tu primera reserva.',
      icon: <CalendarPlus className="h-5 w-5" />,
      href: '/events/new',
      isCompleted: hasEvent,
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xs border border-brand-orange/20 overflow-hidden mb-6 relative animate-fade-in-up">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              Comienza a usar el sistema 🚀
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Completa estos {steps.length} pasos sencillos para configurar tu cuenta.
            </p>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Ocultar para siempre"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            <span>Progreso</span>
            <span>{progress}% Completado</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-brand-orange h-2.5 rounded-full transition-all duration-1000 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step) => (
            <Link 
              key={step.id} 
              to={step.href}
              className={`
                relative flex flex-col p-4 rounded-lg border transition-all duration-300 group
                ${step.isCompleted 
                  ? 'bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700 opacity-75' 
                  : 'bg-white border-brand-orange/30 hover:border-brand-orange/60 hover:shadow-md dark:bg-gray-800'
                }
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-md ${step.isCompleted ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-orange-50 text-brand-orange dark:bg-brand-orange/10'}`}>
                  {step.icon}
                </div>
                {step.isCompleted ? (
                   <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                   <Circle className="h-6 w-6 text-gray-300 dark:text-gray-600 group-hover:text-brand-orange/50 transition-colors" />
                )}
              </div>
              
              <h3 className={`font-semibold text-sm mb-1 ${step.isCompleted ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                {step.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 grow mb-3">
                {step.description}
              </p>
              
              {!step.isCompleted && (
                 <div className="mt-auto text-xs font-semibold text-brand-orange flex items-center opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                    Comenzar <ChevronRight className="h-3 w-3 ml-0.5" />
                 </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
