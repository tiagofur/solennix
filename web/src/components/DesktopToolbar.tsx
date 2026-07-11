import React from 'react';
import clsx from 'clsx';

export interface DesktopToolbarProps {
  /** Section title shown on the left of the toolbar. */
  title: string;
  /** Primary actions (New, Export, Filter…) rendered on the right. */
  actions: React.ReactNode;
  className?: string;
}

/**
 * Persistent per-section toolbar for desktop (lg+).
 *
 * Renders inline as the first child of a page's scrollable content and sticks
 * to the top of the scroll container so primary actions stay reachable while
 * scrolling long lists. Hidden on mobile, where pages keep their in-content
 * header (see Layout.tsx `<main>`).
 *
 * Related: issue #881 — Per-section desktop toolbars with primary actions.
 */
export const DesktopToolbar: React.FC<DesktopToolbarProps> = ({
  title,
  actions,
  className,
}) => {
  return (
    <div
      className={clsx(
        'hidden lg:flex items-center justify-between gap-4',
        'sticky top-0 z-20 -mx-6 lg:-mx-10 px-6 lg:px-10 py-3',
        'bg-surface-grouped/90 backdrop-blur-md border-b border-border',
        className,
      )}
    >
      <h2 className="text-lg font-bold text-text tracking-tight truncate">{title}</h2>
      <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
    </div>
  );
};

export default DesktopToolbar;
