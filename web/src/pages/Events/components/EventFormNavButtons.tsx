import React from 'react';
import { ChevronRight, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface EventFormNavButtonsProps {
  activeStep: number;
  totalSteps: number;
  isStepLoading: boolean;
  isLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export const EventFormNavButtons: React.FC<EventFormNavButtonsProps> = ({
  activeStep,
  totalSteps,
  isStepLoading,
  isLoading,
  onPrev,
  onNext,
  onSubmit,
}) => {
  const { t } = useTranslation(['events', 'common']);
  const isLastStep = activeStep >= totalSteps;
  const prevLabel = t('events:form.previous');
  const prevAria = t('events:form.previous');
  const nextLabel = isStepLoading ? t('events:form.loading') : t('events:form.next');
  const nextAria = t('events:form.next');
  const saveLabel = isLoading ? t('events:form.saving') : t('events:form.save');

  return (
    <div className="flex justify-between pt-4">
      <button
        type="button"
        onClick={onPrev}
        disabled={activeStep === 1}
        className={`px-4 py-2 border border-border rounded-xl shadow-sm text-sm font-medium text-text-secondary bg-card hover:bg-surface-alt transition-colors ${activeStep === 1 ? 'invisible' : ''}`}
        aria-label={prevAria}
      >
        {prevLabel}
      </button>

      {isLastStep ? (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading || isStepLoading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-xs text-sm font-medium rounded-xl text-white bg-success hover:bg-success/90 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-success/50 disabled:opacity-50 transition-colors"
        >
          <Save className="h-5 w-5 mr-2" aria-hidden="true" />
          {saveLabel}
        </button>
      ) : (
        <button
          type="button"
          onClick={onNext}
          disabled={isStepLoading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-xs text-sm font-medium rounded-xl text-white premium-gradient hover:opacity-90 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-opacity"
          aria-label={nextAria}
        >
          {nextLabel}
          <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};
