import React from 'react';
import { CheckCircle, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface WizardStep {
  id: number;
  title: string;
  icon: LucideIcon;
}

interface EventFormStepperProps {
  steps: WizardStep[];
  activeStep: number;
  onSelectStep: (id: number) => void;
}

export const EventFormStepper: React.FC<EventFormStepperProps> = ({
  steps,
  activeStep,
  onSelectStep,
}) => {
  const { t } = useTranslation(['events', 'common']);
  const progressAria = t('events:form.progress_aria');

  return (
    <nav aria-label={progressAria} className="mb-8">
      <div className="relative">
        {/* Progress Line */}
        <div
          className="absolute top-1/2 left-0 w-full h-1 bg-border -translate-y-1/2 rounded-full overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="h-full bg-primary transition-all duration-500 ease-in-out"
            style={{ width: `${((activeStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>

        <ol role="list" className="relative flex justify-between w-full">
          {steps.map((step) => {
            const Icon = step.icon;
            const isCompleted = activeStep > step.id;
            const isActive = activeStep === step.id;

            return (
              <li key={step.id} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (activeStep > step.id) onSelectStep(step.id);
                  }}
                  disabled={activeStep < step.id}
                  className="group flex flex-col items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-lg"
                >
                  <span
                    className={`relative z-10 w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-500 ${
                      isCompleted
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : isActive
                          ? 'bg-card border-2 border-primary text-primary shadow-xl ring-4 ring-primary/10 scale-110'
                          : 'bg-surface-alt border-2 border-border text-text-tertiary'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" aria-hidden="true" />
                    ) : (
                      <Icon className="w-6 h-6" aria-hidden="true" />
                    )}

                    {isActive && (
                      <span className="absolute -inset-1 rounded-2xl animate-pulse bg-primary/20 blur-sm -z-10" />
                    )}
                  </span>
                  <span
                    className={`mt-3 text-xs font-black uppercase tracking-widest transition-colors duration-300 ${
                      isActive ? 'text-primary' : 'text-text-secondary'
                    }`}
                  >
                    {step.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};
