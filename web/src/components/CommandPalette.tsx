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
  MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('common');
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
      { label: t('quick_actions.new_event'), icon: Plus, action: () => navigate('/events/new'), group: t('command_palette.quick_actions_group') },
      { label: t('quick_actions.new_client'), icon: UserPlus, action: () => navigate('/clients/new'), group: t('command_palette.quick_actions_group') },
      { label: t('quick_actions.new_product'), icon: Package, action: () => navigate('/products/new'), group: t('command_palette.quick_actions_group') },
      { label: t('command_palette.new_inventory_item'), icon: Boxes, action: () => navigate('/inventory/new'), group: t('command_palette.quick_actions_group') },
    ],
    [navigate, t],
  );

  const navItems: CommandItem[] = useMemo(
    () => [
      { label: t('nav.dashboard'), icon: LayoutDashboard, action: () => navigate('/dashboard'), group: t('command_palette.navigation_group') },
      { label: t('nav.calendar'), icon: Calendar, action: () => navigate('/calendar'), group: t('command_palette.navigation_group') },
      { label: t('nav.events'), icon: PartyPopper, action: () => navigate('/events'), group: t('command_palette.navigation_group') },
      { label: t('nav.clients'), icon: Users, action: () => navigate('/clients'), group: t('command_palette.navigation_group') },
      { label: t('nav.products'), icon: Package, action: () => navigate('/products'), group: t('command_palette.navigation_group') },
      { label: t('nav.inventory'), icon: Boxes, action: () => navigate('/inventory'), group: t('command_palette.navigation_group') },
      { label: t('nav.reviews', { defaultValue: 'Reseñas' }), icon: MessageSquare, action: () => navigate('/reviews'), group: t('command_palette.navigation_group') },
      { label: t('nav.settings'), icon: Settings, action: () => navigate('/settings'), group: t('command_palette.navigation_group') },
    ],
    [navigate, t],
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
      aria-label={t('command_palette.title')}
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
            placeholder={t('command_palette.placeholder')}
            className="flex-1 bg-transparent text-base text-text placeholder-text-tertiary outline-none"
            aria-label={t('command_palette.search')}
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
                {t('command_palette.search_all', { query: query.trim() })}
              </span>
              <ArrowRight className="h-4 w-4 text-text-tertiary ml-auto" aria-hidden="true" />
            </button>
          )}

          {/* Empty state when no query */}
          {filteredItems.length === 0 && !hasFallbackSearch && (
            <p className="px-3 py-6 text-sm text-text-tertiary text-center">{t('command_palette.no_results')}</p>
          )}
        </div>

        {/* Footer hints */}
        <div className="px-5 py-3 border-t border-border flex items-center gap-4 text-xs text-text-tertiary">
          <span><kbd className="font-mono">↑↓</kbd> {t('command_palette.hint_navigate')}</span>
          <span><kbd className="font-mono">↵</kbd> {t('command_palette.hint_select')}</span>
          <span><kbd className="font-mono">esc</kbd> {t('command_palette.hint_close')}</span>
        </div>
      </div>
    </div>
  );
};
