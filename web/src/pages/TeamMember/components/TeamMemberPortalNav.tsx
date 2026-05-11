import React from 'react';
import { NavLink } from 'react-router-dom';
import { CalendarRange, ClipboardList, ListTodo } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary text-white'
      : 'bg-surface-alt text-text-secondary hover:bg-card hover:text-text',
  ].join(' ');

export const TeamMemberPortalNav: React.FC = () => {
  const { t } = useTranslation(['common']);

  return (
    <nav className="flex flex-wrap gap-2" aria-label={t('team.portal_nav', { defaultValue: 'Navegación personal' })}>
      <NavLink to="/team/assignments" className={linkClass}>
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
        {t('team.nav.assignments', { defaultValue: 'Asignaciones' })}
      </NavLink>
      <NavLink to="/team/events" className={linkClass}>
        <ListTodo className="h-4 w-4" aria-hidden="true" />
        {t('team.nav.events', { defaultValue: 'Mis eventos' })}
      </NavLink>
      <NavLink to="/team/calendar" className={linkClass}>
        <CalendarRange className="h-4 w-4" aria-hidden="true" />
        {t('team.nav.calendar', { defaultValue: 'Calendario' })}
      </NavLink>
    </nav>
  );
};
