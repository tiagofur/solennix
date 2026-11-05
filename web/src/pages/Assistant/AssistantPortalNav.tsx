import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarRange, LogOut, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary text-white'
      : 'bg-surface-alt text-text-secondary hover:bg-card hover:text-text',
  ].join(' ');

export const AssistantPortalNav: React.FC = () => {
  const { t } = useTranslation(['common']);
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <nav className="flex flex-wrap gap-2" aria-label={t('assistant.portal_nav', { defaultValue: 'Navegación de secretaría' })}>
      <NavLink to="/assistant" end className={linkClass}>
        <CalendarRange className="h-4 w-4" aria-hidden="true" />
        {t('assistant.nav.agenda', { defaultValue: 'Agenda' })}
      </NavLink>
      <NavLink to="/assistant/staff" className={linkClass}>
        <Users className="h-4 w-4" aria-hidden="true" />
        {t('assistant.nav.staff', { defaultValue: 'Personal' })}
      </NavLink>
      <button
        type="button"
        onClick={() => {
          void handleSignOut();
        }}
        disabled={isSigningOut}
        className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors bg-surface-alt text-text-secondary hover:bg-card hover:text-text disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {t('nav.logout')}
      </button>
    </nav>
  );
};
