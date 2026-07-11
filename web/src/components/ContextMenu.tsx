import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { RowActionMenuItem } from './RowActionMenu';

export interface ContextMenuProps {
  /** Cursor or anchor coordinates (viewport-relative). */
  position: { x: number; y: number };
  items: RowActionMenuItem[];
  onClose: () => void;
}

/**
 * Cursor-positioned context menu for table rows (#883).
 *
 * Renders the same items as RowActionMenu but positioned at the cursor
 * (right-click / Shift+F10) instead of a trigger button. Shares the item
 * type so every list page reuses its existing action definitions.
 *
 * Closes on: click-outside, scroll, resize, escape.
 * Repositions to stay within the viewport (flips up / clamps right).
 */
export const ContextMenu: React.FC<ContextMenuProps> = ({ position, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => onClose();
    const handleResize = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // capture so we close before the triggering click completes bubbling
    document.addEventListener('click', handleClickOutside, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Position: open downward by default; flip up if not enough space below.
  const MENU_HEIGHT_ESTIMATE = items.length * 40 + 16;
  const MENU_WIDTH = 200;
  const spaceBelow = window.innerHeight - position.y;
  const openUp = spaceBelow < MENU_HEIGHT_ESTIMATE;
  const top = openUp ? Math.max(8, position.y - MENU_HEIGHT_ESTIMATE) : position.y + 4;
  const left = Math.max(8, Math.min(position.x, window.innerWidth - MENU_WIDTH - 8));

  const firstDestructiveIdx = items.findIndex((item) => item.variant === 'destructive');

  return createPortal(
    <div
      ref={menuRef}
      className="z-[100] min-w-[180px] bg-card border border-border rounded-xl shadow-lg py-1"
      style={{ position: 'fixed', top, left }}
      role="menu"
    >
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isDestructive = item.variant === 'destructive';
        const showDivider = idx === firstDestructiveIdx && idx > 0;
        const className = `w-full px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
          isDestructive ? 'text-error hover:bg-error/10' : 'text-text hover:bg-surface-alt'
        }`;
        return (
          <React.Fragment key={idx}>
            {showDivider && <div className="border-t border-border my-1" role="separator" />}
            {item.href ? (
              <Link
                to={item.href}
                className={className}
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  onClose();
                }}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            ) : (
              <button
                type="button"
                className={className}
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  onClose();
                }}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </div>,
    document.body,
  );
};

export default ContextMenu;
