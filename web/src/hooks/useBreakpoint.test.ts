import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsXl } from './useBreakpoint';

/**
 * matchMedia mock factory. The implementation uses addEventListener, so we
 * capture the listener to simulate a viewport change.
 */
function mockMatchMedia(matches: boolean) {
  const listeners: ((e: { matches: boolean }) => void)[] = [];
  const mql = {
    matches,
    addEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx >= 0) listeners.splice(idx, 1);
    }),
  };
  Object.defineProperty(mql, 'listeners', { value: listeners });
  return mql;
}

describe('useIsXl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when viewport is below xl (1280px)', () => {
    window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia(false)) as any;
    const { result } = renderHook(() => useIsXl());
    expect(result.current).toBe(false);
  });

  it('returns true when viewport is at least xl (1280px)', () => {
    window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia(true)) as any;
    const { result } = renderHook(() => useIsXl());
    expect(result.current).toBe(true);
  });

  it('queries the xl breakpoint (min-width: 1280px)', () => {
    window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia(false)) as any;
    renderHook(() => useIsXl());
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 1280px)');
  });

  it('updates when the viewport crosses the xl boundary', () => {
    let matches = false;
    const mql = mockMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mql) as any;

    const { result, rerender } = renderHook(() => useIsXl());
    expect(result.current).toBe(false);

    // Simulate a resize across the boundary: flip matches and dispatch.
    const listeners = (mql as any).listeners as ((e: { matches: boolean }) => void)[];
    matches = true;
    (mql as any).matches = matches;
    act(() => {
      listeners.forEach((cb) => cb({ matches }));
    });
    rerender();

    expect(result.current).toBe(true);
  });

  it('cleans up the matchMedia listener on unmount', () => {
    const mql = mockMatchMedia(false);
    window.matchMedia = vi.fn().mockReturnValue(mql) as any;

    const { unmount } = renderHook(() => useIsXl());
    unmount();

    expect(mql.removeEventListener).toHaveBeenCalled();
  });
});
