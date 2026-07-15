import { useSyncExternalStore } from 'react';

/**
 * Subscribe to the browser's online/offline events. Uses `useSyncExternalStore`
 * for tear-free reads (same pattern as `useBreakpoint`).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine
 */
function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

// SSR / non-DOM fallback: assume online.
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Returns `true` when the browser reports an active network connection
 * (`navigator.onLine`). SSR-safe (returns `true` on the server).
 *
 * Note: `navigator.onLine` is not 100% reliable (a captive portal or DNS
 * failure may still report `true`), but it covers the common case of the
 * user physically disconnecting (Wi-Fi off, cable unplugged).
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
