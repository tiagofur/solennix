import { renderHook, act } from '@testing-library/react';
import { usePagination } from './usePagination';

type Item = { name: string; age: number };

const makeItems = (count: number): Item[] =>
  Array.from({ length: count }, (_, i) => ({ name: `item-${i}`, age: i }));

describe('usePagination', () => {
  it('paginates data correctly', () => {
    const items = makeItems(25);
    const { result } = renderHook(() =>
      usePagination({ data: items, itemsPerPage: 10 })
    );

    expect(result.current.totalPages).toBe(3);
    expect(result.current.totalItems).toBe(25);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.currentData).toHaveLength(10);
    expect(result.current.currentData[0].name).toBe('item-0');
  });

  it('navigates to the next page', () => {
    const items = makeItems(25);
    const { result } = renderHook(() =>
      usePagination({ data: items, itemsPerPage: 10 })
    );

    act(() => result.current.handlePageChange(2));
    expect(result.current.currentPage).toBe(2);
    expect(result.current.currentData[0].name).toBe('item-10');
  });

  it('ignores out-of-range page changes', () => {
    const items = makeItems(5);
    const { result } = renderHook(() =>
      usePagination({ data: items, itemsPerPage: 10 })
    );

    act(() => result.current.handlePageChange(0));
    expect(result.current.currentPage).toBe(1);

    act(() => result.current.handlePageChange(2));
    expect(result.current.currentPage).toBe(1);
  });

  it('sorts data ascending by string key', () => {
    const items: Item[] = [
      { name: 'banana', age: 1 },
      { name: 'apple', age: 2 },
      { name: 'cherry', age: 3 },
    ];
    const { result } = renderHook(() =>
      usePagination({ data: items, initialSortKey: 'name', initialSortOrder: 'asc' })
    );

    expect(result.current.currentData[0].name).toBe('apple');
    expect(result.current.currentData[2].name).toBe('cherry');
  });

  it('sorts data descending by number key', () => {
    const items = makeItems(5);
    const { result } = renderHook(() =>
      usePagination({ data: items, initialSortKey: 'age', initialSortOrder: 'desc' })
    );

    expect(result.current.currentData[0].age).toBe(4);
    expect(result.current.currentData[4].age).toBe(0);
  });

  it('toggles sort order when sorting by the same key', () => {
    const items: Item[] = [
      { name: 'b', age: 2 },
      { name: 'a', age: 1 },
    ];
    const { result } = renderHook(() =>
      usePagination({ data: items })
    );

    act(() => result.current.handleSort('name'));
    expect(result.current.sortKey).toBe('name');
    expect(result.current.sortOrder).toBe('asc');
    expect(result.current.currentData[0].name).toBe('a');

    act(() => result.current.handleSort('name'));
    expect(result.current.sortOrder).toBe('desc');
    expect(result.current.currentData[0].name).toBe('b');
  });

  it('switches to a new sort key with ascending order', () => {
    const items = makeItems(3);
    const { result } = renderHook(() =>
      usePagination({ data: items, initialSortKey: 'name', initialSortOrder: 'desc' })
    );

    act(() => result.current.handleSort('age'));
    expect(result.current.sortKey).toBe('age');
    expect(result.current.sortOrder).toBe('asc');
  });

  it('handles empty data', () => {
    const { result } = renderHook(() =>
      usePagination({ data: [], itemsPerPage: 10 })
    );

    expect(result.current.totalPages).toBe(0);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.currentData).toEqual([]);
  });

  it('handles equal values in sort', () => {
    const items: Item[] = [
      { name: 'same', age: 1 },
      { name: 'same', age: 2 },
    ];
    const { result } = renderHook(() =>
      usePagination({ data: items, initialSortKey: 'name', initialSortOrder: 'asc' })
    );

    expect(result.current.currentData).toHaveLength(2);
  });

  it('handles no initial sort key', () => {
    const items = makeItems(3);
    const { result } = renderHook(() =>
      usePagination({ data: items })
    );

    // Data should be in original order (no sorting)
    expect(result.current.currentData[0].name).toBe('item-0');
    expect(result.current.sortKey).toBe('');
  });
});
