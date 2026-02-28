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
    <div className="h-screen bg-surface-grouped dark:bg-bg flex transition-colors relative overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-card dark:bg-surface-grouped shadow-md transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r border-border",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Menú de navegación principal"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-border">
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

          <div className="flex-1 overflow-y-auto py-4">
            <nav className="px-3 space-y-1" aria-label="Navegación principal">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-text-secondary hover:bg-surface-alt dark:hover:bg-surface"
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

          <div className="border-t border-border p-4">
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full mb-4 flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md bg-surface-alt hover:bg-surface transition-colors border border-border"
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="mr-2 h-5 w-5 text-warning" aria-hidden="true" />
                  <span className="text-text-secondary">Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-5 w-5 text-text" aria-hidden="true" />
                  <span className="text-text">Modo Oscuro</span>
                </>
              )}
            </button>
            <div className="flex items-center mb-4 px-3" role="group" aria-label="Información del usuario">
              <div className="h-8 w-8 rounded-full bg-success flex items-center justify-center text-white font-bold" aria-hidden="true">
                {avatarInitial}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-text">{firstName}</p>
                <p className="text-xs text-text-secondary truncate max-w-[150px]">{user?.email || ''}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-error rounded-md hover:bg-error/10 transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut className="mr-3 h-5 w-5" aria-hidden="true" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-card dark:bg-surface-grouped shadow-xs lg:hidden border-b border-border">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="text-text-secondary focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-primary"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <Logo size={24} className="scale-90" />
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-surface-alt transition-colors"
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 text-warning" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5 text-text" aria-hidden="true" />
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <form onSubmit={handleSearchSubmit} className="mb-6" role="search">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Buscar clientes, eventos, productos o inventario"
                className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm text-text shadow-sm focus:border-primary focus:ring-primary transition-all"
                aria-label="Búsqueda global"
              />
            </div>
          </form>
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
};
