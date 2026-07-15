import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Captures window event listeners so tests can simulate going offline/online
 * by dispatching the captured callbacks — same pattern as useBreakpoint.test.ts.
 */
function captureWindowListeners() {
  const listeners: Record<string, Array<(e: Event) => void>> = {};
  const originalAdd = window.addEventListener;
  const originalRemove = window.removeEventListener;

  vi.spyOn(window, 'addEventListener').mockImplementation(((type: string, cb: any) => {
    if (!listeners[type]) listeners[type] = [];
    listeners[type].push(cb);
  }) as any);

  vi.spyOn(window, 'removeEventListener').mockImplementation(((type: string, cb: any) => {
    listeners[type] = (listeners[type] || []).filter((fn) => fn !== cb);
  }) as any);

  return {
    listeners,
    dispatch(type: string) {
      (listeners[type] || []).forEach((cb) => cb(new Event(type)));
    },
    restore() {
      window.addEventListener = originalAdd;
      window.removeEventListener = originalRemove;
    },
  };
}

describe('useOnlineStatus', () => {
  const originalOnLine = navigator.onLine;
  const cap = captureWindowListeners();

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
  });

  afterAll(() => {
    cap.restore();
  });

  it('returns true when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('returns false when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('updates when the offline event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    act(() => cap.dispatch('offline'));

    expect(result.current).toBe(false);
  });

  it('updates when the online event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);

    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    act(() => cap.dispatch('online'));

    expect(result.current).toBe(true);
  });

  it('removes event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useOnlineStatus());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    removeSpy.mockRestore();
  });
});
