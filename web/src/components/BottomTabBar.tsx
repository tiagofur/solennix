import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  PartyPopper,
  Users,
  MoreHorizontal,
  Package,
  Boxes,
  Settings,
  X,
} from 'lucide-react';
import clsx from 'clsx';

const TABS = [
  { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Calendario', href: '/calendar', icon: Calendar },
  // Events uses PartyPopper to match Android's Celebration icon — conveys
  // "event / party" instead of "another calendar" which is what
  // CalendarCheck read as next to the Calendario tab.
  { name: 'Eventos', href: '/events', icon: PartyPopper },
  { name: 'Clientes', href: '/clients', icon: Users },
];

const MORE_ITEMS = [
  { name: 'Productos', href: '/products', icon: Package },
  { name: 'Inventario', href: '/inventory', icon: Boxes },
  { name: 'Configuración', href: '/settings', icon: Settings },
];

export const BottomTabBar: React.FC = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    location.pathname === href ||
    (href !== '/dashboard' && location.pathname.startsWith(href));

  const isMoreActive = MORE_ITEMS.some(
    (item) => location.pathname === item.href || location.pathname.startsWith(item.href),
  );

  return (
    <>
      {/* "Más" overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* "Más" drawer */}
      {moreOpen && (
        <div className="fixed bottom-[4.5rem] left-4 right-4 z-50 bg-card rounded-2xl border border-border shadow-2xl p-2 md:hidden">
          <div className="flex items-center justify-between px-3 py-2 mb-1">
            <span className="text-xs font-medium text-text-secondary">
              Más opciones
            </span>
            <button
              type="button"
              onClick={() => setMoreOpen(false)}
              className="p-1 text-text-secondary hover:text-text rounded-lg transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          {MORE_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMoreOpen(false)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-3 rounded-xl transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-text hover:bg-surface-alt',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-semibold">{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-surface-grouped border-t border-border md:hidden safe-area-bottom"
        aria-label="Navegación principal"
      >
        <div className="flex items-center justify-around h-[4.5rem] px-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.href);
            return (
              <Link
                key={tab.name}
                to={tab.href}
                className={clsx(
                  'flex flex-col items-center justify-center flex-1 py-2 transition-colors',
                  active ? 'text-primary' : 'text-text-secondary',
                )}
              >
                <Icon
                  className={clsx('h-5 w-5 mb-1', active && 'drop-shadow-sm')}
                  aria-hidden="true"
                />
                <span className={clsx('text-xs font-semibold', active && 'font-bold')}>
                  {tab.name}
                </span>
              </Link>
            );
          })}

          {/* "Más" tab */}
          <button
            type="button"
            onClick={() => setMoreOpen(!moreOpen)}
            className={clsx(
              'flex flex-col items-center justify-center flex-1 py-2 transition-colors',
              moreOpen || isMoreActive ? 'text-primary' : 'text-text-secondary',
            )}
            aria-label="Más opciones"
          >
            <MoreHorizontal
              className={clsx('h-5 w-5 mb-1', (moreOpen || isMoreActive) && 'drop-shadow-sm')}
              aria-hidden="true"
            />
            <span
              className={clsx(
                'text-xs font-semibold',
                (moreOpen || isMoreActive) && 'font-bold',
              )}
            >
              Más
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
