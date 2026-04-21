import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  UserPlus,
  Package,
  Boxes,
  LayoutDashboard,
  Calendar,
  PartyPopper,
  Users,
  Settings,
  ArrowRight,
} from 'lucide-react';
import clsx from 'clsx';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  label: string;
  icon: React.ElementType;
  action: () => void;
  group: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const executeAndClose = useCallback(
    (action: () => void) => {
      action();
      onClose();
    },
    [onClose],
  );

  const quickActions: CommandItem[] = useMemo(
    () => [
      { label: 'Nuevo Evento', icon: Plus, action: () => navigate('/events/new'), group: 'Acciones Rápidas' },
      { label: 'Nuevo Cliente', icon: UserPlus, action: () => navigate('/clients/new'), group: 'Acciones Rápidas' },
      { label: 'Nuevo Producto', icon: Package, action: () => navigate('/products/new'), group: 'Acciones Rápidas' },
      { label: 'Nuevo Ítem de Inventario', icon: Boxes, action: () => navigate('/inventory/new'), group: 'Acciones Rápidas' },
    ],
    [navigate],
  );

  const navItems: CommandItem[] = useMemo(
    () => [
      { label: 'Dashboard', icon: LayoutDashboard, action: () => navigate('/dashboard'), group: 'Navegación' },
      { label: 'Calendario', icon: Calendar, action: () => navigate('/calendar'), group: 'Navegación' },
      { label: 'Eventos', icon: PartyPopper, action: () => navigate('/events'), group: 'Navegación' },
      { label: 'Clientes', icon: Users, action: () => navigate('/clients'), group: 'Navegación' },
      { label: 'Productos', icon: Package, action: () => navigate('/products'), group: 'Navegación' },
      { label: 'Inventario', icon: Boxes, action: () => navigate('/inventory'), group: 'Navegación' },
      { label: 'Configuración', icon: Settings, action: () => navigate('/settings'), group: 'Navegación' },
    ],
    [navigate],
  );

  const allItems = useMemo(() => [...quickActions, ...navItems], [quickActions, navItems]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems;
    const lowerQuery = query.toLowerCase();
    return allItems.filter((item) => item.label.toLowerCase().includes(lowerQuery));
  }, [query, allItems]);

  const hasFallbackSearch = query.trim().length > 0 && filteredItems.length === 0;
  const totalResults = filteredItems.length + (hasFallbackSearch ? 1 : 0);

  // Group items for rendering
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filteredItems) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return groups;
  }, [filteredItems]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      // Focus input on next tick
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isOpen]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const executeItem = useCallback(
    (index: number) => {
      if (index < filteredItems.length) {
        executeAndClose(filteredItems[index].action);
      } else if (hasFallbackSearch) {
        executeAndClose(() => navigate(`/search?q=${encodeURIComponent(query.trim())}`));
      }
    },
    [filteredItems, hasFallbackSearch, executeAndClose, navigate, query],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % totalResults);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + totalResults) % totalResults);
          break;
        case 'Enter':
          e.preventDefault();
          executeItem(activeIndex);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [activeIndex, totalResults, executeItem, onClose],
  );

  // Close on Escape globally when open
  useEffect(() => {
    if (!isOpen) return;
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
    >
      <div
        className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <Search className="h-5 w-5 text-text-secondary shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar o ir a..."
            className="flex-1 bg-transparent text-base text-text placeholder-text-tertiary outline-none"
            aria-label="Buscar comandos"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-text-tertiary bg-surface-alt rounded-lg border border-border font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-96 overflow-y-auto p-2">
          {Object.entries(groupedItems).map(([group, items]) => (
            <div key={group} className="mb-2 last:mb-0">
              <p className="px-3 py-1.5 text-xs font-medium text-text-tertiary">
                {group}
              </p>
              {items.map((item) => {
                const currentIndex = flatIndex++;
                const Icon = item.icon;
                const isActive = currentIndex === activeIndex;
                return (
                  <button
                    key={item.label}
                    type="button"
                    data-active={isActive}
                    className={clsx(
                      'flex items-center gap-3 w-full p-3 rounded-xl cursor-pointer transition-colors text-left',
                      isActive ? 'bg-surface-alt' : 'hover:bg-surface-alt/50',
                    )}
                    onClick={() => executeAndClose(item.action)}
                    onMouseEnter={() => setActiveIndex(currentIndex)}
                  >
                    <Icon className="h-5 w-5 text-text-secondary shrink-0" aria-hidden="true" />
                    <span className="text-sm text-text font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}

          {/* Fallback: search in app */}
          {hasFallbackSearch && (
            <button
              type="button"
              data-active={activeIndex === filteredItems.length}
              className={clsx(
                'flex items-center gap-3 w-full p-3 rounded-xl cursor-pointer transition-colors text-left',
                activeIndex === filteredItems.length ? 'bg-surface-alt' : 'hover:bg-surface-alt/50',
              )}
              onClick={() => executeAndClose(() => navigate(`/search?q=${encodeURIComponent(query.trim())}`))}
              onMouseEnter={() => setActiveIndex(filteredItems.length)}
            >
              <Search className="h-5 w-5 text-text-secondary shrink-0" aria-hidden="true" />
              <span className="text-sm text-text font-medium">
                Buscar &quot;{query.trim()}&quot; en toda la app
              </span>
              <ArrowRight className="h-4 w-4 text-text-tertiary ml-auto" aria-hidden="true" />
            </button>
          )}

          {/* Empty state when no query */}
          {filteredItems.length === 0 && !hasFallbackSearch && (
            <p className="px-3 py-6 text-sm text-text-tertiary text-center">No se encontraron resultados</p>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-5 py-3 border-t border-border flex items-center gap-4 text-xs text-text-tertiary">
          <span><kbd className="font-mono">↑↓</kbd> navegar</span>
          <span><kbd className="font-mono">↵</kbd> seleccionar</span>
          <span><kbd className="font-mono">esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  );
};
