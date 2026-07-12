import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface Shortcut {
  key: string;
  label: string;
  description: string;
  action: () => void;
  /** Only active on these path prefixes (empty = global) */
  paths?: string[];
}

const SECTION_MAP: Record<string, string> = {
  '/events': 'events',
  '/clients': 'clients',
  '/products': 'products',
  '/inventory': 'inventory',
};

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useTranslation(['common']);
  const [helpOpen, setHelpOpen] = useState(false);
  const gPressedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentSection = Object.entries(SECTION_MAP).find(([prefix]) =>
    pathname.startsWith(prefix),
  )?.[1];

  const shortcuts: Shortcut[] = useMemo(() => [
    // Global navigation
    { key: 'g d', label: 'G D', description: t('common:shortcuts.go_to', { target: t('common:nav.dashboard') }), action: () => navigate('/dashboard') },
    { key: 'g e', label: 'G E', description: t('common:shortcuts.go_to', { target: t('common:nav.events') }), action: () => navigate('/events') },
    { key: 'g c', label: 'G C', description: t('common:shortcuts.go_to', { target: t('common:nav.clients') }), action: () => navigate('/clients') },
    { key: 'g p', label: 'G P', description: t('common:shortcuts.go_to', { target: t('common:nav.products') }), action: () => navigate('/products') },
    { key: 'g i', label: 'G I', description: t('common:shortcuts.go_to', { target: t('common:nav.inventory') }), action: () => navigate('/inventory') },
    { key: 'g k', label: 'G K', description: t('common:shortcuts.go_to', { target: t('common:nav.calendar') }), action: () => navigate('/events?view=calendar') },

    // Contextual "new" — depends on current section
    {
      key: 'n',
      label: 'N',
      description: t('common:shortcuts.create_new_contextual'),
      action: () => {
        switch (currentSection) {
          case 'events': navigate('/events/new'); break;
          case 'clients': navigate('/clients/new'); break;
          case 'products': navigate('/products/new'); break;
          case 'inventory': navigate('/inventory/new'); break;
          default: navigate('/events/new'); break;
        }
      },
    },

    // Help
    { key: '?', label: '?', description: t('common:shortcuts.show_help'), action: () => setHelpOpen((v) => !v) },
  ], [navigate, currentSection, t]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Skip if user is typing in an input, textarea, select, or contentEditable
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return;
    }

    // Skip if modifier keys are held (allow Cmd+K for CommandPalette)
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const key = e.key.toLowerCase();

    // If 'g' was pressed previously, try to match the "g <key>" combo
    if (gPressedRef.current) {
      gPressedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      const combo = `g ${key}`;
      const shortcut = shortcuts.find((s) => s.key === combo);
      if (shortcut) {
        e.preventDefault();
        shortcut.action();
        return;
      }
      // If no combo matched, fall through to handle single-key shortcuts
    }

    // Handle two-key sequences (g+letter) start
    if (key === 'g') {
      e.preventDefault();
      gPressedRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        gPressedRef.current = false;
        timeoutRef.current = null;
      }, 1000);
      return;
    }

    // Handle single-key shortcuts
    const shortcut = shortcuts.find((s) => s.key === key && !s.key.includes(' '));
    if (shortcut) {
      e.preventDefault();
      shortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [handleKeyDown]);

  return {
    shortcuts,
    helpOpen,
    setHelpOpen,
    currentSection,
  };
}
