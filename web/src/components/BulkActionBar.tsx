import React from 'react';
import clsx from 'clsx';

export interface BulkActionBarProps {
  /** Number of selected rows. Bar is hidden when 0. */
  count: number;
  /** Clears the selection (X button). */
  onClear: () => void;
  /** Bulk actions (Export, Delete, Change status…). */
  children: React.ReactNode;
  className?: string;
}

/**
 * Floating bulk-action bar shown when list rows are selected (#885).
 *
 * Appears fixed at the bottom center when `count > 0`. Each list page wires its
 * own actions as children (export selected, delete with confirm, status change).
 * Hidden on mobile (`hidden lg:flex`) where multi-select is not offered.
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  count,
  onClear,
  children,
  className,
}) => {
  if (count === 0) return null;

  return (
    <div
      className={clsx(
        'hidden lg:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'items-center gap-4 px-5 py-3',
        'bg-card border border-border rounded-2xl shadow-xl',
        'animate-scale-in',
        className,
      )}
      role="toolbar"
      aria-label="Acciones en lote"
    >
      <span className="text-sm font-semibold text-text whitespace-nowrap">
        {count} {count === 1 ? 'seleccionado' : 'seleccionados'}
      </span>
      <div className="h-6 w-px bg-border" role="separator" />
      <div className="flex items-center gap-2">{children}</div>
      <div className="h-6 w-px bg-border" role="separator" />
      <button
        type="button"
        onClick={onClear}
        className="p-1.5 text-text-secondary hover:text-text hover:bg-surface-alt rounded-lg transition-colors"
        aria-label="Limpiar selección"
      >
        ✕
      </button>
    </div>
  );
};

export default BulkActionBar;
