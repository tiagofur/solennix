import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUpdateEventStatus } from '../hooks/queries/useEventQueries';

export type EventStatus = 'quoted' | 'confirmed' | 'completed' | 'cancelled';

const STATUS_CLASSES: Record<EventStatus, string> = {
  quoted: 'bg-status-quoted/10 text-status-quoted',
  confirmed: 'bg-status-confirmed/10 text-status-confirmed',
  completed: 'bg-status-completed/10 text-status-completed',
  cancelled: 'bg-status-cancelled/10 text-status-cancelled',
};

const STATUS_ORDER: EventStatus[] = ['quoted', 'confirmed', 'completed', 'cancelled'];

interface StatusDropdownProps {
  eventId: string;
  currentStatus: EventStatus;
  onStatusChange?: (newStatus: EventStatus) => void;
}

export const StatusDropdown: React.FC<StatusDropdownProps> = ({
  eventId,
  currentStatus,
  onStatusChange,
}) => {
  const { t } = useTranslation(['common']);
  const [open, setOpen] = useState(false);
  const updateStatus = useUpdateEventStatus();
  const loading = updateStatus.isPending;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0, openUp: false });

  const cfg = STATUS_CLASSES[currentStatus] ?? STATUS_CLASSES.quoted;
  const currentLabel = t(`common:status.${currentStatus}`);

  const close = useCallback(() => setOpen(false), []);

  // Calculate position when opening
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 200;
    const openUp = spaceBelow < menuHeight;
    setPos({
      top: openUp ? rect.top : rect.bottom + 4,
      left: rect.left,
      openUp,
    });
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
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
    document.addEventListener('click', handleClickOutside, true);
    return () => document.removeEventListener('click', handleClickOutside, true);
  }, [open, close]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  const handleSelect = (newStatus: EventStatus) => {
    if (newStatus === currentStatus || loading) return;
    setOpen(false);
    updateStatus.mutate(
      { id: eventId, status: newStatus },
      { onSuccess: () => onStatusChange?.(newStatus) },
    );
  };

  const dropdownContent = open
    ? createPortal(
        <div
          ref={menuRef}
          className="z-[100] min-w-[160px] bg-card border border-border rounded-xl shadow-lg py-1"
          style={{
            position: 'fixed',
            ...(pos.openUp
              ? { bottom: window.innerHeight - pos.top + 4, left: pos.left }
              : { top: pos.top, left: pos.left }),
          }}
          role="listbox"
          aria-label={t('common:status.select_status')}
          onClick={(e) => e.stopPropagation()}
        >
          {STATUS_ORDER.map((status) => {
            const optClasses = STATUS_CLASSES[status];
            const isSelected = status === currentStatus;
            return (
              <button
                key={status}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(status);
                }}
                className={`w-full px-3 py-2 text-sm flex items-center gap-2 transition-colors hover:bg-surface-alt ${isSelected ? 'font-semibold' : ''}`}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${optClasses.split(' ')[1] ? `bg-current ${optClasses.split(' ').pop()}` : ''}`}
                  style={{ opacity: 1 }}
                  aria-hidden="true"
                />
                <span className={optClasses.split(' ').pop() || ''}>{t(`common:status.${status}`)}</span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 ml-auto text-text-secondary" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        disabled={loading}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((prev) => !prev);
        }}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer hover:ring-2 hover:ring-current/20 disabled:opacity-60 ${cfg}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common:status.status_aria_change', { status: currentLabel })}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : null}
        {currentLabel}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {dropdownContent}
    </div>
  );
};
