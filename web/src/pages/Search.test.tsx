import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { SearchPage } from './Search';
import { searchService } from '../services/searchService';
import { logError } from '../lib/errorHandler';

let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams],
  };
});

vi.mock('../services/searchService', () => ({
  searchService: {
    searchAll: vi.fn(),
  },
}));

vi.mock('../lib/errorHandler', () => ({
  logError: vi.fn(),
}));

describe('SearchPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it('renders empty state when no query provided', () => {
    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Busca en toda tu operación/i)).toBeInTheDocument();
  });

  it('renders results when search returns data', async () => {
    mockSearchParams = new URLSearchParams('?q=evento');
    (searchService.searchAll as any).mockResolvedValue({
      client: [{ id: '1', title: 'Ana', href: '/clients/1' }],
      event: [{ id: '2', title: 'Boda', href: '/events/2', meta: '2024-01-02', status: 'confirmed' }],
      product: [{ id: '3', title: 'Menu', href: '/products/3', meta: '10 items' }],
      inventory: [{ id: '4', title: 'Sillas', href: '/inventory/4' }],
    });

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Resultados')).toBeInTheDocument();
    });
    expect(screen.getByText(/Clientes/i)).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText(/Eventos/i)).toBeInTheDocument();
    expect(screen.getByText('Boda')).toBeInTheDocument();
    expect(screen.getByText(/Productos/i)).toBeInTheDocument();
    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByText(/Inventario/i)).toBeInTheDocument();
    expect(screen.getByText('Sillas')).toBeInTheDocument();
  });

  it('renders error state when search fails', async () => {
    mockSearchParams = new URLSearchParams('?q=evento');
    (searchService.searchAll as any).mockRejectedValue(new Error('fail'));

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No pudimos completar la búsqueda/i)).toBeInTheDocument();
    });
    // logError is now called by React Query's global error handler, not the component directly
  });

  it('falls back to raw value when event date is invalid', async () => {
    mockSearchParams = new URLSearchParams('?q=evento');
    (searchService.searchAll as any).mockResolvedValue({
      client: [],
      event: [{ id: '10', title: 'Evento Raro', href: '/events/10', meta: 'not-a-date', status: 'confirmed' }],
      product: [],
      inventory: [],
    });

    render(
      <MemoryRouter>
        <SearchPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Evento Raro')).toBeInTheDocument();
    });
    // The invalid date should fall back to the raw string 'not-a-date'
    expect(screen.getByText(/not-a-date/)).toBeInTheDocument();
  });
});
