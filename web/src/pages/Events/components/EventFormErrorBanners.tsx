import React from 'react';
import { AlertCircle } from 'lucide-react';
import { type FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

interface EventFormErrorBannersProps {
  error: string | null;
  errors: FieldErrors;
  isSubmitted: boolean;
  isValid: boolean;
}

export const EventFormErrorBanners: React.FC<EventFormErrorBannersProps> = ({
  error,
  errors,
  isSubmitted,
  isValid,
}) => {
  const { t } = useTranslation(['events', 'common']);

  return (
    <>
      {error && (
        <div
          className="bg-error/5 border-l-4 border-error p-4 rounded-md"
          role="alert"
        >
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-error" aria-hidden="true" />
            <div className="ml-3">
              <p className="text-sm text-error">{error}</p>
            </div>
          </div>
        </div>
      )}

      {isSubmitted && !isValid && (
        <div
          className="bg-error/5 border border-error/20 p-5 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-500"
          role="alert"
        >
          <div className="flex gap-4">
            <div className="p-2 bg-error/10 rounded-xl h-fit">
              <AlertCircle className="h-6 w-6 text-error" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-error font-black uppercase tracking-tight mb-2">{t('events:form.error_title')}</p>
              <p className="text-sm text-text-secondary mb-3">{t('events:form.error_save')}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 list-none">
                {Object.entries(errors).map(([key, err]) => (
                  <li key={key} className="text-xs text-error/80 flex items-center">
                    <span className="mr-2 opacity-50">●</span>
                    {(err as { message?: string })?.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
