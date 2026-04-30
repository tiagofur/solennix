import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n, { i18nReady } from '../src/i18n/config';

await i18nReady;
await i18n.changeLanguage('es');

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

const customRender = (ui: React.ReactElement, options?: RenderOptions) => {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </I18nextProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
};

// Re-export everything from testing-library, override render
export * from '@testing-library/react';
export { customRender as render };
