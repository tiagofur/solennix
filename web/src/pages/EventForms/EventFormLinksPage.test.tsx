import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { EventFormLinksPage } from './EventFormLinksPage';

vi.mock('@/hooks/queries/useEventFormQueries', () => ({
  useEventFormLinks: vi.fn(() => ({ data: [], isLoading: false })),
  useGenerateLink: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useDeleteLink: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <EventFormLinksPage />
    </MemoryRouter>,
  );

describe('EventFormLinksPage smoke', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the page title without crashing', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Formularios')).toBeInTheDocument();
    });
  });

  it('renders the subtitle', async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText('Genera enlaces para que tus clientes llenen datos de su evento'),
      ).toBeInTheDocument();
    });
  });

  it('renders empty state when no links exist', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Sin formularios')).toBeInTheDocument();
    });
  });
});
