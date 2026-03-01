import React, { useEffect, useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
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
  Calculator
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { logError } from '../lib/errorHandler';
import clsx from 'clsx';
import { ToastContainer } from './ToastContainer';
import { Logo } from './Logo';

export const Layout: React.FC = () => {
  const { signOut, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const firstName = user?.name ? user.name.split(' ')[0] : "Usuario";
  const avatarInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  useEffect(() => {
    if (location.pathname !== '/search') return;
    const params = new URLSearchParams(location.search);
    setSearchValue(params.get('q') || '');
  }, [location.pathname, location.search]);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Calendario', href: '/calendar', icon: Calendar },
    { name: 'Cotización', href: '/events/new', icon: Calculator },
    { name: 'Clientes', href: '/clients', icon: Users },
    { name: 'Productos', href: '/products', icon: Package },
    { name: 'Inventario', href: '/inventory', icon: Boxes },
    { name: 'Configuración', href: '/settings', icon: Settings },
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

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed) return;
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    setIsSidebarOpen(false);
  };

  return (
    <div className="h-screen bg-bg flex transition-colors relative overflow-hidden">
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-bg lg:bg-transparent transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
          isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
        aria-label="Menú de navegación principal"
      >
        <div className="flex flex-col h-full lg:px-4 lg:py-4">
          <div className="flex items-center justify-between h-16 px-6 lg:px-4 mb-4 lg:mb-2 border-b border-border lg:border-transparent">
            <Logo size={28} />
            <button
              type="button"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <X className="h-6 w-6 text-text-secondary" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            <nav className="px-3 lg:px-2 space-y-1" aria-label="Navegación principal">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      "flex items-center px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-200",
                      isActive
                        ? "bg-primary text-white shadow-md shadow-primary/20"
                        : "text-text-secondary hover:bg-surface-alt hover:text-text"
                    )}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <Icon className="mr-3 h-5 w-5" aria-hidden="true" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-4 lg:p-2 border-t border-border lg:border-transparent">
            {/* User Profile Mini */}
            <div className="flex items-center mb-4 px-3 py-2 bg-surface-alt/50 rounded-2xl border border-border pl-2">
              <div className="h-9 w-9 rounded-xl bg-linear-to-br from-primary to-orange-400 flex items-center justify-center text-white font-bold shadow-sm" aria-hidden="true">
                {avatarInitial}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-bold text-text truncate">{firstName}</p>
                <p className="text-xs text-text-secondary truncate">{user?.email || ''}</p>
              </div>
            </div>

            <div className="flex gap-2 mb-2">
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
             <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl" role="search">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" aria-hidden="true" />
                <input
                  type="search"
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Buscar clientes, eventos, productos..."
                  className="w-full rounded-2xl border-0 bg-surface-alt py-3.5 pl-12 pr-4 text-sm text-text placeholder-text-tertiary focus:ring-2 focus:ring-primary focus:bg-surface transition-all shadow-inner"
                  aria-label="Búsqueda global"
                />
              </div>
            </form>
          </div>

          {/* Scrollable Page Content */}
          <main className="flex-1 overflow-y-auto px-6 lg:px-10 pb-10">
            <Outlet />
          </main>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

