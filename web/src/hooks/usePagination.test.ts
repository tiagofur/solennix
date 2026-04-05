import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePagination } from './usePagination';

interface TestItem {
  name: string;
  age: number;
}

const ITEMS: TestItem[] = [
  { name: 'Carlos', age: 30 },
  { name: 'Ana', age: 25 },
  { name: 'María', age: 35 },
  { name: 'Pedro', age: 28 },
  { name: 'Lucía', age: 22 },
  { name: 'Diego', age: 40 },
];

describe('usePagination', () => {
  it('returns first page of data', () => {
    const { result } = renderHook(() =>
      usePagination({ data: ITEMS, itemsPerPage: 3 }),
    );
    expect(result.current.currentData).toHaveLength(3);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.totalItems).toBe(6);
  });

  it('navigates to second page', () => {
    const { result } = renderHook(() =>
      usePagination({ data: ITEMS, itemsPerPage: 3 }),
    );
    act(() => result.current.handlePageChange(2));
    expect(result.current.currentPage).toBe(2);
    expect(result.current.currentData).toHaveLength(3);
  });

  it('ignores out-of-bounds page changes', () => {
    const { result } = renderHook(() =>
      usePagination({ data: ITEMS, itemsPerPage: 3 }),
    );
    act(() => result.current.handlePageChange(0));
    expect(result.current.currentPage).toBe(1);
    act(() => result.current.handlePageChange(99));
    expect(result.current.currentPage).toBe(1);
  });

  it('sorts ascending by string key', () => {
    const { result } = renderHook(() =>
      usePagination({ data: ITEMS, itemsPerPage: 10, initialSortKey: 'name', initialSortOrder: 'asc' }),
    );
    expect(result.current.currentData[0].name).toBe('Ana');
    expect(result.current.currentData[5].name).toBe('Pedro');
  });

  it('sorts descending by number key', () => {
    const { result } = renderHook(() =>
      usePagination({ data: ITEMS, itemsPerPage: 10, initialSortKey: 'age', initialSortOrder: 'desc' }),
    );
    expect(result.current.currentData[0].age).toBe(40);
    expect(result.current.currentData[5].age).toBe(22);
  });

  it('toggles sort order on same key', () => {
    const { result } = renderHook(() =>
      usePagination({ data: ITEMS, itemsPerPage: 10, initialSortKey: 'name', initialSortOrder: 'asc' }),
    );
    expect(result.current.sortOrder).toBe('asc');
    act(() => result.current.handleSort('name'));
    expect(result.current.sortOrder).toBe('desc');
    expect(result.current.currentData[0].name).toBe('Pedro');
  });

  it('resets to asc when switching sort key', () => {
    const { result } = renderHook(() =>
      usePagination({ data: ITEMS, itemsPerPage: 10, initialSortKey: 'name', initialSortOrder: 'desc' }),
    );
    act(() => result.current.handleSort('age'));
    expect(result.current.sortKey).toBe('age');
    expect(result.current.sortOrder).toBe('asc');
    expect(result.current.currentData[0].age).toBe(22);
  });

  it('handles empty data', () => {
    const { result } = renderHook(() =>
      usePagination({ data: [] as TestItem[], itemsPerPage: 5 }),
    );
    expect(result.current.currentData).toHaveLength(0);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.totalItems).toBe(0);
  });
});
