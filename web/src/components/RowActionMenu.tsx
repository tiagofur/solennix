import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { MoreVertical } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface RowActionMenuItem {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant?: "default" | "destructive";
  href?: string;
}

interface RowActionMenuProps {
  items: RowActionMenuItem[];
}

export const RowActionMenu: React.FC<RowActionMenuProps> = ({ items }) => {
  const { t } = useTranslation(['common']);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false });

  const close = useCallback(() => setOpen(false), []);

  const closeAndRestoreFocus = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  // Calculate position when opening
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const menuHeight = 250;
      const openUp = spaceBelow < menuHeight;
      setPos({
        top: openUp ? rect.top : rect.bottom + 4,
        left: Math.max(8, rect.right - 180),
        openUp,
      });
    };
    updatePosition();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        close();
      }
    };
    document.addEventListener("click", handleClickOutside, true);
    return () => document.removeEventListener("click", handleClickOutside, true);
  }, [open, close]);

  // Keyboard: Escape, arrow navigation, initial focus on first item
  useEffect(() => {
    if (!open) return;

    const getItems = () =>
      Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
      );

    requestAnimationFrame(() => {
      getItems()[0]?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeAndRestoreFocus();
        return;
      }

      // APG Menu Button: Tab leaves the menu and dismisses it
      if (e.key === "Tab") {
        close();
        return;
      }

      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") {
        return;
      }

      const els = getItems();
      if (els.length === 0) return;

      e.preventDefault();
      const currentIdx = els.indexOf(document.activeElement as HTMLElement);

      if (e.key === "Home") {
        els[0].focus();
        return;
      }
      if (e.key === "End") {
        els[els.length - 1].focus();
        return;
      }

      let next =
        e.key === "ArrowDown"
          ? (currentIdx + 1) % els.length
          : (currentIdx - 1 + els.length) % els.length;
      if (currentIdx < 0) {
        next = e.key === "ArrowDown" ? 0 : els.length - 1;
      }
      els[next].focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, closeAndRestoreFocus]);

  const firstDestructiveIdx = items.findIndex(
    (item) => item.variant === "destructive",
  );

  const menuContent = open
    ? createPortal(
        <div
          ref={menuRef}
          className="z-[100] min-w-[180px] bg-card border border-border rounded-xl shadow-lg py-1"
          style={{
            position: "fixed",
            ...(pos.openUp
              ? { bottom: window.innerHeight - pos.top + 4, left: pos.left }
              : { top: pos.top, left: pos.left }),
          }}
          role="menu"
        >
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isDestructive = item.variant === "destructive";
            const showDivider = idx === firstDestructiveIdx && idx > 0;

            const className = `w-full px-3 py-2 text-sm flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              isDestructive
                ? "text-error hover:bg-error/10"
                : "text-text hover:bg-surface-alt"
            }`;

            return (
              <React.Fragment key={idx}>
                {showDivider && (
                  <div className="border-t border-border my-1" role="separator" />
                )}
                {item.href ? (
                  <Link
                    to={item.href}
                    className={className}
                    role="menuitem"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick();
                      closeAndRestoreFocus();
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
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick();
                      closeAndRestoreFocus();
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
      )
    : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="p-1.5 text-text-secondary hover:text-primary hover:bg-surface-alt rounded-lg transition-colors inline-block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={t('command_palette.actions_group')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      {menuContent}
    </div>
  );
};
