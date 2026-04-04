import React from 'react';
import { useToast, ToastType } from '../hooks/useToast';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-success" aria-hidden="true" />,
  error: <AlertCircle className="h-5 w-5 text-error" aria-hidden="true" />,
  info: <Info className="h-5 w-5 text-info" aria-hidden="true" />,
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-success/10 border-success/30',
  error: 'bg-error/10 border-error/30',
  info: 'bg-info/10 border-info/30',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 pointer-events-none" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={clsx(
            'pointer-events-auto flex items-center p-4 rounded-xl border shadow-lg transition-all animate-fade-in-up min-w-[300px]',
            TOAST_STYLES[toast.type]
          )}
        >
          <div className="shrink-0">{TOAST_ICONS[toast.type]}</div>
          <div className="ml-3 mr-8 text-sm font-medium text-text">
            {toast.message}
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="ml-auto -mx-1.5 -my-1.5 p-1.5 inline-flex items-center justify-center h-8 w-8 rounded-lg text-text-secondary hover:text-text focus:outline-hidden"
            aria-label="Cerrar notificación"
          >
            <span className="sr-only">Cerrar</span>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
};
