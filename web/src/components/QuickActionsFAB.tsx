import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, CalendarPlus, Zap } from 'lucide-react';
import clsx from 'clsx';

const HIDDEN_PATHS = ['/settings', '/events/new', '/cotizacion-rapida'];

export const QuickActionsFAB: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Close when navigating
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
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
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="fixed bottom-24 right-5 z-50 flex flex-col items-end gap-3 lg:hidden">
        {/* Action items */}
        <div
          className={clsx(
            'flex flex-col items-end gap-2 transition-all duration-200',
            isOpen
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 pointer-events-none',
          )}
        >
          <Link
            to="/cotizacion-rapida"
            className="flex items-center gap-2 pl-4 pr-3 py-2.5 bg-card border border-border rounded-2xl shadow-lg hover:shadow-xl transition-all"
            onClick={() => setIsOpen(false)}
          >
            <span className="text-sm font-semibold text-text whitespace-nowrap">
              Cotización Rápida
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
              Nuevo Evento
            </span>
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <CalendarPlus className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
          </Link>
        </div>

        {/* Main FAB button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            'h-14 w-14 rounded-2xl premium-gradient shadow-lg shadow-primary/30 flex items-center justify-center transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95',
          )}
          aria-label={isOpen ? 'Cerrar acciones rápidas' : 'Acciones rápidas'}
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
