import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { clientService } from '../services/clientService';
import { productService } from '../services/productService';
import { eventService } from '../services/eventService';
import { CheckCircle2, Circle, X, Users, Package, CalendarPlus, ChevronRight } from 'lucide-react';
import { logError } from '../lib/errorHandler';

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
          eventService.getAll()
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
        logError("Error checking onboarding status", error);
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
      icon: <Users className="h-5 w-5" aria-hidden="true" />,
      href: '/clients/new',
      isCompleted: hasClient,
    },
    {
      id: 'product',
      title: 'Crea tu primer producto',
      description: 'Añade servicios o productos a tu catálogo de cotización.',
      icon: <Package className="h-5 w-5" aria-hidden="true" />,
      href: '/products/new',
      isCompleted: hasProduct,
    },
    {
      id: 'event',
      title: 'Agenda un evento',
      description: 'Usa a tu cliente y tus productos para crear tu primera reserva.',
      icon: <CalendarPlus className="h-5 w-5" aria-hidden="true" />,
      href: '/events/new',
      isCompleted: hasEvent,
    },
  ];

  return (
    <div className="bg-card rounded-2xl shadow-sm border border-primary/30 overflow-hidden mb-6 relative animate-fade-in-up">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-text flex items-center">
              Comienza a usar el sistema 🚀
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Completa estos {steps.length} pasos sencillos para configurar tu cuenta.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-text-tertiary hover:text-text-secondary transition-colors p-1 rounded-md hover:bg-surface-alt"
            title="Ocultar para siempre"
            aria-label="Ocultar lista de verificación para siempre"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-xs font-medium text-text-secondary mb-2">
            <span>Progreso</span>
            <span>{progress}% Completado</span>
          </div>
          <div className="w-full bg-surface-alt rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progreso de configuración inicial: ${progress}% completado`}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((step) => (
            <Link 
              key={step.id} 
              to={step.href}
              className={`
                relative flex flex-col p-4 rounded-xl border transition-all duration-300 group
                ${step.isCompleted 
                  ? 'bg-surface-alt border-border opacity-75' 
                  : 'bg-card border-primary/30 hover:border-primary/60 hover:shadow-md'
                }
              `}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-md ${step.isCompleted ? 'bg-success/10 text-success' : 'bg-primary-light text-primary dark:bg-primary/10'}`}>
                  {step.icon}
                </div>
                {step.isCompleted ? (
                   <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
                ) : (
                   <Circle className="h-6 w-6 text-text-tertiary group-hover:text-primary/50 transition-colors" aria-hidden="true" />
                )}
              </div>

              <h3 className={`font-semibold text-sm mb-1 ${step.isCompleted ? 'text-text-secondary' : 'text-text'}`}>
                {step.title}
              </h3>
              <p className="text-xs text-text-secondary grow mb-3">
                {step.description}
              </p>

              {!step.isCompleted && (
                 <div className="mt-auto text-xs font-semibold text-primary flex items-center opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                    Comenzar <ChevronRight className="h-3 w-3 ml-0.5" aria-hidden="true" />
                 </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
