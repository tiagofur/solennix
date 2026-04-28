import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.git',
      '.cache',
      'tests/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/vite-env.d.ts',
      ],
    },
    testTimeout: 15000,
    teardownTimeout: 30000,
    // Workers pool configuration — los tests grandes (EventSummary.test.tsx,
    // 74 renders de un componente de 1660 LOC que importa recharts + PDF
    // generators) hacen OOM del fork con el heap por defecto de Node. Vitest
    // no propaga NODE_OPTIONS del parent, así que el worker hay que tunearlo
    // acá. `--expose-gc` permite que los afterEach liberen memoria entre
    // tests si llegara a hacer falta.
    // Pool de forks con heap ampliado + --expose-gc. NODE_OPTIONS del parent
    // NO se propaga a los workers de vitest, por eso hay que tunearlo acá.
    // El `--expose-gc` habilita el `globalThis.gc()` que tests/setup.ts
    // invoca en afterEach para liberar memoria entre tests en archivos
    // grandes (EventSummary.test.tsx tiene 74 renders de un componente
    // de 1660 LOC que importa recharts + PDF generators).
    // Pool de forks con heap ampliado + --expose-gc. NODE_OPTIONS del parent
    // NO se propaga a los workers de vitest, por eso hay que tunearlo acá.
    // `--expose-gc` habilita el `globalThis.gc()` que tests/setup.ts
    // invoca en afterEach para liberar memoria entre tests.
    pool: 'forks',
    execArgv: ['--max-old-space-size=6144', '--expose-gc'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
