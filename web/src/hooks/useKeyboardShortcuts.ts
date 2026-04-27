import { useEffect, useCallback, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const [helpOpen, setHelpOpen] = useState(false);

  const currentSection = Object.entries(SECTION_MAP).find(([prefix]) =>
    pathname.startsWith(prefix),
  )?.[1];

  const shortcuts: Shortcut[] = useMemo(() => [
    // Global navigation
    { key: 'g d', label: 'G D', description: 'Ir al Dashboard', action: () => navigate('/dashboard') },
    { key: 'g e', label: 'G E', description: 'Ir a Eventos', action: () => navigate('/events') },
    { key: 'g c', label: 'G C', description: 'Ir a Clientes', action: () => navigate('/clients') },
    { key: 'g p', label: 'G P', description: 'Ir a Productos', action: () => navigate('/products') },
    { key: 'g i', label: 'G I', description: 'Ir a Inventario', action: () => navigate('/inventory') },
    { key: 'g k', label: 'G K', description: 'Ir a Calendario', action: () => navigate('/calendar') },

    // Contextual "new" — depends on current section
    {
      key: 'n',
      label: 'N',
      description: 'Crear nuevo (contextual)',
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
    { key: '?', label: '?', description: 'Mostrar atajos de teclado', action: () => setHelpOpen((v) => !v) },
  ], [navigate, currentSection]);

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

    // Handle two-key sequences (g+letter)
    if (key === 'g') {
      e.preventDefault();
      const handleSecondKey = (e2: KeyboardEvent) => {
        const k2 = e2.key.toLowerCase();
        const combo = `g ${k2}`;
        const shortcut = shortcuts.find((s) => s.key === combo);
        if (shortcut) {
          e2.preventDefault();
          shortcut.action();
        }
        document.removeEventListener('keydown', handleSecondKey);
      };
      document.addEventListener('keydown', handleSecondKey, { once: true });
      // Auto-cleanup after 1 second if no second key
      setTimeout(() => document.removeEventListener('keydown', handleSecondKey), 1000);
      return;
    }

    // Handle single-key shortcuts
    const shortcut = shortcuts.find((s) => s.key === key && !s.key.includes(' '));
    if (shortcut) {
      e.preventDefault();
      shortcut.action();
    }
  }, [currentSection, navigate, shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    shortcuts,
    helpOpen,
    setHelpOpen,
    currentSection,
  };
}
