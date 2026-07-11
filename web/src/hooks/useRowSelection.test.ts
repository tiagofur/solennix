import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRowSelection } from './useRowSelection';

describe('useRowSelection', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useRowSelection(['a', 'b', 'c']));
    expect(result.current.count).toBe(0);
    expect(result.current.hasSelection).toBe(false);
  });

  it('toggle adds and removes an id', () => {
    const { result } = renderHook(() => useRowSelection(['a', 'b']));
    act(() => result.current.toggle('a'));
    expect(result.current.selected.has('a')).toBe(true);
    expect(result.current.count).toBe(1);

    act(() => result.current.toggle('a'));
    expect(result.current.selected.has('a')).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('toggleAll selects all when none selected', () => {
    const { result } = renderHook(() => useRowSelection(['a', 'b', 'c']));
    act(() => result.current.toggleAll());
    expect(result.current.allSelected).toBe(true);
    expect(result.current.count).toBe(3);
  });

  it('toggleAll clears when all selected', () => {
    const { result } = renderHook(() => useRowSelection(['a', 'b']));
    act(() => result.current.toggleAll());
    act(() => result.current.toggleAll());
    expect(result.current.count).toBe(0);
  });

  it('someSelected is true when partially selected', () => {
    const { result } = renderHook(() => useRowSelection(['a', 'b', 'c']));
    act(() => result.current.toggle('a'));
    expect(result.current.someSelected).toBe(true);
    expect(result.current.allSelected).toBe(false);
  });

  it('clear empties the selection', () => {
    const { result } = renderHook(() => useRowSelection(['a', 'b']));
    act(() => result.current.toggleAll());
    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
    expect(result.current.hasSelection).toBe(false);
  });

  it('selectedArray reflects current selection order', () => {
    const { result } = renderHook(() => useRowSelection(['a', 'b']));
    act(() => result.current.toggle('b'));
    act(() => result.current.toggle('a'));
    expect(result.current.selectedArray).toEqual(['b', 'a']);
  });
});
