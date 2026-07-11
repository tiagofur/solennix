import { useCallback, useMemo, useState } from 'react';

/**
 * Multi-select state for list views (#885).
 *
 * Tracks a Set of selected row ids and exposes toggle/toggleAll/clear plus
 * derived flags for the select-all checkbox indeterminate state. Each list
 * page owns its own instance; the checkbox column and BulkActionBar consume it.
 *
 * @param ids All row ids currently rendered — drives toggleAll/allSelected.
 */
export function useRowSelection<T extends string>(ids: T[] = []) {
  const [selected, setSelected] = useState<Set<T>>(new Set());

  const toggle = useCallback((id: T) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      // If everything is selected, clear; otherwise select all.
      if (prev.size === ids.length && ids.length > 0) return new Set();
      return new Set(ids);
    });
  }, [ids]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const allSelected = ids.length > 0 && selected.size === ids.length;
  const someSelected = selected.size > 0 && selected.size < ids.length;

  const selectedArray = useMemo(() => Array.from(selected), [selected]);

  return {
    selected,
    selectedArray,
    count: selected.size,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
    hasSelection: selected.size > 0,
  };
}

export default useRowSelection;
