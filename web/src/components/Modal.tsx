import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  titleId?: string;
  descriptionId?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
  titleId,
  descriptionId,
}) => {
  const { t } = useTranslation('common');
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Prevent scrolling of the body when modal is open. Capture the existing
    // overflow so nested modals / other UIs that rely on a prior scroll lock
    // don't get their value clobbered when this modal unmounts.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
          aria-hidden="true"
          onClick={onClose}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className={clsx(
            "relative transform overflow-hidden rounded-2xl liquid-glass text-left transition-all sm:my-8 w-full animate-in zoom-in-95 duration-300",
            maxWidthClasses[maxWidth]
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-border/80 flex justify-between items-center bg-transparent">
            <h3 
              id={titleId}
              className="text-xl font-bold text-text"
            >
              {title}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-text-tertiary hover:text-text hover:bg-surface-alt rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={t('modal.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
