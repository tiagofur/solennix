import React from "react";

/**
 * Base shimmer block — a single rounded rectangle with animate-pulse.
 */
export const SkeletonLine: React.FC<{
  className?: string;
}> = ({ className = "h-4 w-full" }) => (
  <div
    className={`animate-pulse rounded-md bg-surface-alt ${className}`}
    aria-hidden="true"
  />
);

/**
 * Skeleton for a card-style list item (avatar + two text lines).
 */
export const SkeletonCard: React.FC<{
  rows?: number;
}> = ({ rows = 5 }) => (
  <div role="status" aria-label="Cargando..." className="space-y-4 p-6">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center space-x-4 animate-pulse">
        <div className="h-10 w-10 rounded-full bg-surface-alt shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded-md bg-surface-alt" />
          <div className="h-3 w-1/2 rounded-md bg-surface-alt" />
        </div>
      </div>
    ))}
    <span className="sr-only">Cargando...</span>
  </div>
);

interface SkeletonTableColumn {
  /** Tailwind width class for the column (e.g. "w-32", "w-48"). */
  width: string;
  /** If true, renders a circle + text lines instead of a plain bar. */
  avatar?: boolean;
  /** If true, renders a small badge-like pill. */
  badge?: boolean;
}

/**
 * Skeleton that mirrors a <table> layout with configurable columns.
 *
 * Usage:
 * ```tsx
 * <SkeletonTable
 *   columns={[
 *     { width: "w-48", avatar: true },
 *     { width: "w-32" },
 *     { width: "w-20", badge: true },
 *     { width: "w-24" },
 *   ]}
 *   rows={6}
 * />
 * ```
 */
export const SkeletonTable: React.FC<{
  columns: SkeletonTableColumn[];
  rows?: number;
}> = ({ columns, rows = 5 }) => (
  <div role="status" aria-label="Cargando..." className="overflow-x-auto">
    {/* Header shimmer */}
    <div className="bg-surface-alt px-6 py-3 flex items-center gap-6 border-b border-border">
      {columns.map((col, i) => (
        <div key={i} className={`${col.width} shrink-0`}>
          <div className="h-3 w-2/3 rounded-md bg-surface-alt animate-pulse" />
        </div>
      ))}
    </div>

    {/* Row shimmers */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div
        key={rowIdx}
        className="px-6 py-4 flex items-center gap-6 border-b border-border last:border-b-0"
      >
        {columns.map((col, colIdx) => (
          <div key={colIdx} className={`${col.width} shrink-0`}>
            {col.avatar ? (
              <div className="flex items-center space-x-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-surface-alt shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded-md bg-surface-alt" />
                  <div className="h-3 w-1/2 rounded-md bg-surface-alt" />
                </div>
              </div>
            ) : col.badge ? (
              <div className="animate-pulse">
                <div className="h-5 w-16 rounded-full bg-surface-alt" />
              </div>
            ) : (
              <div className="animate-pulse">
                <div className="h-4 w-full rounded-md bg-surface-alt" />
              </div>
            )}
          </div>
        ))}
      </div>
    ))}
    <span className="sr-only">Cargando...</span>
  </div>
);
