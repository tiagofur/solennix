import React from 'react';
import { useToast, ToastType } from '../hooks/useToast';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-green-500" />,
  error: <AlertCircle className="h-5 w-5 text-red-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
};

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800',
  error: 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800',
  info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'pointer-events-auto flex items-center p-4 rounded-lg border shadow-lg transition-all animate-fade-in-up min-w-[300px]',
            TOAST_STYLES[toast.type]
          )}
        >
          <div className="shrink-0">{TOAST_ICONS[toast.type]}</div>
          <div className="ml-3 mr-8 text-sm font-medium text-gray-900 dark:text-gray-100">
            {toast.message}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-auto -mx-1.5 -my-1.5 p-1.5 inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 focus:outline-hidden"
          >
            <span className="sr-only">Cerrar</span>
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
