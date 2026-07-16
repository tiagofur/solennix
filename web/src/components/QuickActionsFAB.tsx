import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, CalendarPlus, Zap } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

const HIDDEN_PATHS = ['/settings', '/events/new', '/cotizacion-rapida'];

export const QuickActionsFAB: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation('common');

  // Close when navigating
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const fabButtonRef = React.useRef<HTMLButtonElement>(null);

  // Close on Escape and restore focus to the FAB trigger
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        requestAnimationFrame(() => fabButtonRef.current?.focus());
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const shouldHide = HIDDEN_PATHS.some(
    (path) => location.pathname === path || location.pathname.startsWith(path + '/'),
  );

  if (shouldHide) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-3 md:hidden">
        {/* Action items — unmount when closed so they leave the tab order */}
        {isOpen && (
          <div className="flex flex-col items-end gap-2 transition-all duration-200 opacity-100 translate-y-0">
            <Link
              to="/cotizacion-rapida"
              className="flex items-center gap-2 pl-4 pr-3 py-2.5 bg-card border border-border rounded-2xl shadow-lg hover:shadow-xl transition-all"
              onClick={() => setIsOpen(false)}
            >
              <span className="text-sm font-semibold text-text whitespace-nowrap">
                {t('quick_actions.quick_quote')}
              </span>
              <div className="h-9 w-9 rounded-xl bg-surface-alt flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
            </Link>

            <Link
              to="/events/new"
              className="flex items-center gap-2 pl-4 pr-3 py-2.5 bg-card border border-border rounded-2xl shadow-lg hover:shadow-xl transition-all"
              onClick={() => setIsOpen(false)}
            >
              <span className="text-sm font-semibold text-text whitespace-nowrap">
                {t('quick_actions.new_event')}
              </span>
              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <CalendarPlus className="h-4 w-4 text-primary" aria-hidden="true" />
              </div>
            </Link>
          </div>
        )}

        {/* Main FAB button */}
        <button
          ref={fabButtonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'h-14 w-14 rounded-2xl premium-gradient shadow-lg shadow-primary/30 flex items-center justify-center transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          )}
          aria-label={isOpen ? t('quick_actions.close_quick_actions') : t('quick_actions.open_quick_actions')}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Plus
            className={clsx(
              'h-6 w-6 text-white transition-transform duration-200',
              isOpen && 'rotate-45',
            )}
            aria-hidden="true"
          />
        </button>
      </div>
    </>
  );
};
