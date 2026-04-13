import React, { useEffect, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  CalendarCheck,
  Users,
  Package,
  Boxes,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Moon,
  Sun,
  Shield,
  ChevronsLeft,
  ChevronsRight,
  Link2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { logError } from '@/lib/errorHandler';
import clsx from 'clsx';
import { ToastContainer } from './ToastContainer';
import { Logo } from './Logo';
import { CommandPalette } from './CommandPalette';
import { BottomTabBar } from './BottomTabBar';
import { QuickActionsFAB } from './QuickActionsFAB';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';

export const Layout: React.FC = () => {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { shortcuts, helpOpen, setHelpOpen, currentSection } = useKeyboardShortcuts();

  const firstName = user?.name ? user.name.split(' ')[0] : "Usuario";
  const avatarInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Initialize push notifications after login
  useEffect(() => {
    if (user) {
      import('@/lib/notifications').then(({ initPushNotifications }) => {
        initPushNotifications();
      });
    }
  }, [user]);

  // Global Ctrl+K / Cmd+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleOpenPalette = () => setIsCommandPaletteOpen(true);
    document.addEventListener('open-command-palette', handleOpenPalette);
    return () => document.removeEventListener('open-command-palette', handleOpenPalette);
  }, []);

  const navigation = [
    { name: 'Inicio', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Calendario', href: '/calendar', icon: Calendar },
    { name: 'Eventos', href: '/events', icon: CalendarCheck },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Productos', href: '/products', icon: Package },
    { name: 'Inventario', href: '/inventory', icon: Boxes },
    { name: 'Formularios', href: '/event-forms', icon: Link2 },
    { name: 'Configuración', href: '/settings', icon: Settings },
    // Admin link — only visible to admins
    ...(user?.role === 'admin' ? [{ name: 'Admin', href: '/admin', icon: Shield }] : []),
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      logError('Error signing out', error);
      // Force cleanup of Supabase tokens only
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
          localStorage.removeItem(key);
        }
      });
      window.location.href = '/login';
    }
  };

  return (
    <div className="h-screen bg-bg flex transition-colors relative overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[999] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-xl focus:text-sm focus:font-bold">
        Saltar al contenido
      </a>
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          role="button"
          aria-label="Cerrar menú de navegación"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setIsSidebarOpen(false);
            }
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 lg:z-auto bg-bg lg:bg-transparent transform transition-all duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          // Mobile: always w-64
          "w-64",
          // Desktop: collapsible
          isCollapsed ? "lg:w-20" : "lg:w-64",
          isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
        aria-label="Menú de navegación principal"
      >
        <div className="flex flex-col h-full lg:px-4 lg:py-4">
          {/* Logo / Header */}
          <div className={clsx(
            "flex items-center justify-between h-16 px-6 mb-4 border-b border-border lg:border-transparent",
            isCollapsed ? "lg:px-0 lg:justify-center" : "lg:px-4 lg:mb-2"
          )}>
            <Logo size={28} showText={!isCollapsed} />
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-6 w-6 text-text-secondary" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-2">
            <nav className={clsx("space-y-1", isCollapsed ? "lg:flex lg:flex-col lg:items-center lg:px-0 px-3" : "px-3 lg:px-2")} aria-label="Navegación principal">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      "flex items-center text-sm font-semibold transition-all duration-200",
                      isCollapsed
                        ? "lg:w-11 lg:h-11 lg:rounded-xl lg:justify-center px-4 py-3 rounded-2xl w-full"
                        : "justify-start px-4 py-3 rounded-2xl w-full",
                      isActive
                        ? "bg-[var(--color-primary-light)] text-primary"
                        : "text-text-secondary hover:bg-surface-alt hover:text-text"
                    )}
                    onClick={() => setIsSidebarOpen(false)}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon className={clsx("h-[22px] w-[22px] shrink-0", !isCollapsed && "mr-3")} aria-hidden="true" />
                    <span className={clsx(isCollapsed && "lg:hidden")}>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Collapse Toggle (desktop only) */}
          <div className="hidden lg:block px-2 pb-2">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={clsx(
                "flex items-center w-full py-2 text-text-secondary hover:text-text hover:bg-surface-alt rounded-xl transition-colors",
                isCollapsed ? "justify-center px-2" : "px-4"
              )}
              aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
              {!isCollapsed && <span className="ml-2 text-sm">Colapsar</span>}
            </button>
          </div>

          {/* Bottom Section: User Profile + Actions */}
          <div className={clsx("border-t border-border lg:border-transparent", isCollapsed ? "lg:p-1 p-4" : "p-4 lg:p-2")}>
            {/* User Profile Mini */}
            <div className={clsx(
              "flex items-center mb-4 bg-surface-alt/50 rounded-2xl border border-border",
              isCollapsed ? "lg:justify-center lg:px-0 lg:py-2 px-3 py-2 pl-2" : "px-3 py-2 pl-2"
            )}>
              <div className="h-9 w-9 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center text-white font-bold shadow-sm shrink-0" aria-hidden="true">
                {avatarInitial}
              </div>
              <div className={clsx("ml-3 flex-1 min-w-0", isCollapsed && "lg:hidden")}>
                <p className="text-sm font-bold text-text truncate">{firstName}</p>
                <p className="text-xs text-text-secondary truncate">{user?.email || ''}</p>
              </div>
            </div>

            {/* Theme + Logout buttons */}
            <div className={clsx("mb-2", isCollapsed ? "lg:flex lg:flex-col lg:gap-2 flex gap-2" : "flex gap-2")}>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex-1 flex items-center justify-center px-3 py-2.5 text-sm font-semibold rounded-xl bg-surface hover:bg-surface-alt transition-colors border border-border text-text shadow-sm"
                aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex-1 flex items-center justify-center px-3 py-2.5 text-sm font-semibold rounded-xl bg-surface hover:bg-error/10 hover:text-error hover:border-error/30 transition-colors border border-border text-text shadow-sm"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area (Layered Panel) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-0 lg:py-2 lg:pr-2">
        {/* Mobile Header */}
        <header className="bg-surface-grouped shadow-sm lg:hidden border-b border-border shrink-0">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="text-text-secondary hover:text-text transition-colors"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <Logo size={24} className="scale-90" />
            <div className="w-6" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* The Panel Container */}
        <div className="flex-1 overflow-hidden flex flex-col bg-surface-grouped lg:rounded-[3rem] lg:border border-border lg:shadow-xl relative z-10">

          {/* Topbar inside panel */}
          <div className="shrink-0 px-6 lg:px-10 py-4 lg:py-6 flex items-center justify-between gap-4">
            <div className="flex-1 max-w-2xl" role="search">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setIsCommandPaletteOpen(true)}
                  className="w-full rounded-2xl border-0 bg-surface-alt py-3.5 pl-12 pr-4 text-sm text-text-tertiary text-left focus:ring-2 focus:ring-primary focus:bg-surface transition-all shadow-inner cursor-pointer"
                  aria-label="Abrir búsqueda"
                >
                  Buscar o presiona ⌘K...
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Page Content */}
          <main id="main-content" className="flex-1 overflow-y-auto px-6 lg:px-10 pb-28 md:pb-10">
            <Outlet />
          </main>
        </div>
      </div>

      <BottomTabBar />
      <QuickActionsFAB />
      <ToastContainer />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} currentSection={currentSection} />
    </div>
  );
};
