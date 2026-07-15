import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  PartyPopper,
  Users,
  Package,
  Boxes,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Shield,
  ChevronsLeft,
  ChevronsRight,
  Link2,
  UserCog,
  Wallet,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { logError } from '@/lib/errorHandler';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { ToastContainer } from './ToastContainer';
import { OfflineBanner } from './OfflineBanner';
import { Logo } from './Logo';
import { CommandPalette } from './CommandPalette';
import { BottomTabBar } from './BottomTabBar';
import { QuickActionsFAB } from './QuickActionsFAB';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';

export const Layout: React.FC = () => {
  const { signOut, user } = useAuth();
  const { t } = useTranslation('common');
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { shortcuts, helpOpen, setHelpOpen, currentSection } = useKeyboardShortcuts();

  const firstName = user?.name ? user.name.split(' ')[0] : t('user');
  const avatarInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  // Persist sidebar collapsed state
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // ── Resizable sidebar (#884) ──────────────────────────────
  // Desktop sidebar width is user-adjustable (200–320px) and persisted.
  // Collapsed state forces 80px (icon-rail mode). Mobile stays fixed w-64.
  const SIDEBAR_MIN = 200;
  const SIDEBAR_MAX = 320;
  const SIDEBAR_COLLAPSED = 80;
  const SIDEBAR_DEFAULT = 256;
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const stored = Number(localStorage.getItem('sidebar-width'));
    return Number.isFinite(stored) && stored >= SIDEBAR_MIN && stored <= SIDEBAR_MAX
      ? stored
      : SIDEBAR_DEFAULT;
  });

  useEffect(() => {
    if (!isCollapsed) localStorage.setItem('sidebar-width', String(sidebarWidth));
  }, [sidebarWidth, isCollapsed]);

  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only resize in expanded desktop mode (not mobile slide-in, not collapsed).
    if (isCollapsed) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      const next = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startWidth + delta));
      setSidebarWidth(next);
    };
    const onUp = (ev: PointerEvent) => {
      handle.releasePointerCapture(ev.pointerId);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

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

  // Global paywall trigger: when ApiClient receives 403 plan_limit_exceeded
  // it dispatches this event. The toast is already shown by the api layer;
  // here we redirect to the pricing page so the user lands on a CTA
  // instead of the action they tried to perform. Already-on-/pricing users
  // stay put — no point re-routing.
  useEffect(() => {
    let timerId: number | null = null;
    const handlePlanLimit = () => {
      if (location.pathname !== '/pricing') {
        // Short delay so the user reads the toast before the route change.
        timerId = window.setTimeout(() => navigate('/pricing'), 800);
      }
    };
    window.addEventListener('plan:limit-exceeded', handlePlanLimit);
    return () => {
      window.removeEventListener('plan:limit-exceeded', handlePlanLimit);
      if (timerId !== null) window.clearTimeout(timerId);
    };
  }, [location.pathname, navigate]);

  const navigation = [
    { name: t('nav.dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('nav.events'), href: '/events', icon: PartyPopper },
    { name: t('nav.clients'), href: '/clients', icon: Users },
    { name: t('nav.staff'), href: '/staff', icon: UserCog },
    { name: t('nav.products'), href: '/products', icon: Package },
    { name: t('nav.inventory'), href: '/inventory', icon: Boxes },
    { name: t('nav.forms'), href: '/event-forms', icon: Link2 },
    { name: t('nav.payments_inbox', { defaultValue: 'Cobros' }), href: '/payments/inbox', icon: Wallet },
    { name: t('nav.reviews', { defaultValue: 'Reseñas' }), href: '/reviews', icon: MessageSquare },
    { name: t('nav.settings'), href: '/settings', icon: Settings },
    // Admin link — only visible to admins
    ...(user?.role === 'admin' ? [{ name: t('nav.admin'), href: '/admin', icon: Shield }] : []),
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      // signOut already runs clearUserScopedStorage() in its finally block,
      // so session-scoped localStorage (incl. Supabase tokens) is cleared
      // regardless. This catch is a safety net for unexpected throws.
      logError('Error signing out', error);
    }
  };

  return (
    <div className="h-screen bg-bg flex transition-colors relative overflow-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-999 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-xl focus:text-sm focus:font-bold">
        {t('nav.skip_to_content')}
      </a>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
          role="button"
          aria-label={t('nav.close_nav')}
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
          "fixed inset-y-0 left-0 z-50 lg:z-20 liquid-glass transform transition-all duration-200 ease-in-out lg:translate-x-0 lg:relative lg:inset-0",
          // Mobile: always w-64. Desktop width driven by inline style (#884).
          "w-64 lg:border-r lg:border-border sidebar-resizable",
          isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
        style={{
          // Desktop-only width; mobile keeps w-64 via class. Collapsed → icon rail.
          ['--lg-sidebar-width' as string]: `${isCollapsed ? SIDEBAR_COLLAPSED : sidebarWidth}px`,
        }}
        aria-label={t('nav.main_nav')}
      >
        <div className={clsx(
          "flex flex-col h-full lg:py-4 relative z-10",
          isCollapsed ? "lg:px-2.5" : "lg:px-4"
        )}>
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
              aria-label={t('nav.close_nav')}
            >
              <X className="h-6 w-6 text-text-secondary" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-2">
            <nav className={clsx("space-y-1", isCollapsed ? "lg:flex lg:flex-col lg:items-center lg:px-0 px-3" : "px-3 lg:px-2")} aria-label={t('nav.main_nav')}>
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      "flex items-center text-sm font-semibold transition-all duration-200 active-ios-scale",
                      isCollapsed
                        ? "lg:w-12 lg:h-12 lg:rounded-xl lg:justify-center px-4 py-3 rounded-2xl w-full"
                        : "justify-start px-4 py-3 rounded-2xl w-full",
                      isActive
                        ? "bg-primary-light/80 text-primary border-l-3 border-primary"
                        : "text-text-secondary hover:bg-surface-alt/50 hover:text-text border-l-3 border-transparent"
                    )}
                    onClick={() => setIsSidebarOpen(false)}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <Icon className={clsx("h-5.5 w-5.5 shrink-0", !isCollapsed && "mr-3")} aria-hidden="true" />
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
                "flex items-center w-full py-2 text-text-secondary hover:text-text hover:bg-surface-alt rounded-xl transition-colors active-ios-scale",
                isCollapsed ? "justify-center px-2" : "px-4"
              )}
              aria-label={isCollapsed ? t('nav.expand_menu') : t('nav.collapse_menu')}
            >
              {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
              {!isCollapsed && <span className="ml-2 text-sm">{t('nav.collapse')}</span>}
            </button>
          </div>

          {/* Bottom Section: User Profile + Actions */}
          <div className={clsx("border-t border-border lg:border-transparent", isCollapsed ? "lg:p-1 p-4" : "p-4 lg:p-2")}>
            {/* User Profile Mini */}
            <div className={clsx(
              "flex items-center mb-4 bg-surface-alt/40 rounded-2xl border border-border/60 backdrop-blur-sm",
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

            {/* Sign out button */}
            <div className="mb-2 flex lg:justify-center">
              <button
                type="button"
                onClick={handleSignOut}
                className={clsx(
                  "flex items-center justify-center text-sm font-semibold rounded-xl bg-surface/55 hover:bg-error/10 hover:text-error hover:border-error/30 transition-colors border border-border text-text shadow-xs active-ios-scale",
                  isCollapsed
                    ? "lg:w-12 lg:h-12 lg:p-0"
                    : "w-full px-3 py-2.5"
                )}
                aria-label={t('nav.logout')}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        {/* Resize handle (desktop, expanded only) — #884 */}
        {!isCollapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t('nav.resize_sidebar', { defaultValue: 'Resize sidebar' })}
            onPointerDown={startResize}
            className="hidden lg:block absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors group-resize"
          />
        )}
      </aside>

      {/* Main Content Area (Layered Panel) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden lg:pl-0 lg:py-2 lg:pr-2 relative z-10">
        {/* Mobile Header */}
        <header className="bg-surface-grouped/80 backdrop-blur-md shadow-xs lg:hidden border-b border-border shrink-0">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="text-text-secondary hover:text-text transition-colors"
              aria-label={t('nav.open_nav')}
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
            <Logo size={24} className="scale-90" />
            <div className="w-6" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* The Panel Container */}
        <div className="flex-1 overflow-hidden flex flex-col bg-surface-grouped/80 backdrop-blur-xl lg:rounded-lg lg:border border-border lg:shadow-xl relative z-10">

          {/* Topbar inside panel */}
          <div className="shrink-0 px-6 lg:px-10 py-4 lg:py-6 flex items-center justify-between gap-4">
            <div className="flex-1 max-w-2xl" role="search">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setIsCommandPaletteOpen(true)}
                  className="w-full rounded-2xl border-0 bg-surface-alt py-3.5 pl-12 pr-4 text-sm text-text-tertiary text-left focus:ring-2 focus:ring-primary focus:bg-surface transition-all shadow-inner cursor-pointer"
                  aria-label={t('nav.open_search')}
                >
                  {t('nav.search_or_shortcut')}
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Page Content */}
          <main id="main-content" className="flex-1 overflow-y-auto px-6 lg:px-10 pb-28 md:pb-6">
            <Outlet />
          </main>
        </div>
      </div>

      <BottomTabBar />
      <QuickActionsFAB />
      <OfflineBanner />
      <ToastContainer />
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <KeyboardShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={shortcuts} currentSection={currentSection} />
    </div>
  );
};
