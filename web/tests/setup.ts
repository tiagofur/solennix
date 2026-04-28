/// <reference types="@testing-library/jest-dom" />

import '@testing-library/jest-dom/vitest';
// Initialize i18next before any component imports so `useTranslation`
// returns real Spanish strings in tests (matching production default).
import '../src/i18n/config';
import i18n from 'i18next';
// Pin tests to Spanish so string assertions don't flip to English based
// on the host's navigator.language (CI runners often default to en-US).
void i18n.changeLanguage('es');
import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// React 19 + Vitest/jsdom: explicitly mark act environment for async updates.
// Prevents noisy "environment is not configured to support act(...)" warnings.
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
if (typeof window !== 'undefined') {
  (window as any).IS_REACT_ACT_ENVIRONMENT = true;
}

const localStorageStore = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore.set(key, String(value));
  }),
  removeItem: vi.fn((key: string) => {
    localStorageStore.delete(key);
  }),
  clear: vi.fn(() => {
    localStorageStore.clear();
  }),
};

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

beforeEach(async () => {
  localStorageStore.clear();
  localStorageStore.set('i18nextLng', 'es');
  localStorageMock.getItem.mockImplementation((key: string) => localStorageStore.get(key) ?? null);
  localStorageMock.setItem.mockImplementation((key: string, value: string) => {
    localStorageStore.set(key, String(value));
  });
  localStorageMock.removeItem.mockImplementation((key: string) => {
    localStorageStore.delete(key);
  });
  localStorageMock.clear.mockImplementation(() => {
    localStorageStore.clear();
  });
  await i18n.changeLanguage('es');
});

afterEach(() => {
  // Desmontar explícitamente los React trees del DOM virtual antes de
  // limpiar mocks y handlers MSW. Sin esto, archivos de test grandes
  // (EventSummary.test.tsx, 74 renders de un componente de 1660 LOC) acumulan
  // raíces de React + nodos jsdom en memoria hasta que el worker hace OOM
  // — incluso con globals:true, el auto-cleanup de testing-library puede no
  // ejecutarse dependiendo de cómo se importó render().
  cleanup();
  server.resetHandlers();
  vi.clearAllMocks();
  // Forzar GC si está expuesto (--expose-gc en poolOptions.*.execArgv) para
  // liberar memoria acumulada entre tests de archivos muy grandes.
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
  }
});

afterAll(() => {
  server.close();
});

vi.mock('import.meta.env', () => ({
  VITE_API_URL: 'http://localhost:8080/api',
  DEV: true,
  PROD: false,
}));


Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
