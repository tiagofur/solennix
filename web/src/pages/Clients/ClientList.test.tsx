import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClientList } from './ClientList';
import { clientService } from '../../services/clientService';
import { logError } from '../../lib/errorHandler';

const mockNavigate = vi.fn();

vi.mock('../../services/clientService', () => ({
  clientService: {
    getAll: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const renderList = () =>
  render(
    <MemoryRouter>
      <ClientList />
    </MemoryRouter>
  );

describe('ClientList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders clients after loading', async () => {
    (clientService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Ana Perez',
        phone: '5551112222',
        email: 'ana@example.com',
        address: 'Calle 1',
        total_events: 2,
        total_spent: 1200,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('2 eventos')).toBeInTheDocument();
  });

  it('filters clients by search term', async () => {
    (clientService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Ana Perez',
        phone: '5551112222',
        email: 'ana@example.com',
        address: 'Calle 1',
        total_events: 2,
        total_spent: 1200,
      },
      {
        id: '2',
        name: 'Juan Lopez',
        phone: '5553334444',
        email: 'juan@example.com',
        address: 'Calle 2',
        total_events: 1,
        total_spent: 800,
      },
    ]);

    renderList();
    await waitFor(() => {
      expect(screen.getByText('Juan Lopez')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Buscar clientes...'), {
      target: { value: 'Ana' },
    });

    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    expect(screen.queryByText('Juan Lopez')).not.toBeInTheDocument();
  });

  it('navigates to detail on row click', async () => {
    (clientService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Ana Perez',
        phone: '5551112222',
        email: 'ana@example.com',
        address: 'Calle 1',
        total_events: 2,
        total_spent: 1200,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Ana Perez'));
    expect(mockNavigate).toHaveBeenCalledWith('/clients/1');
  });

  it('deletes a client after confirmation', async () => {
    (clientService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Ana Perez',
        phone: '5551112222',
        email: 'ana@example.com',
        address: 'Calle 1',
        total_events: 2,
        total_spent: 1200,
      },
    ]);
    (clientService.delete as any).mockResolvedValue({});

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Eliminar cliente Ana Perez/i }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar cliente' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(clientService.delete).toHaveBeenCalledWith('1');
      expect(screen.queryByText('Ana Perez')).not.toBeInTheDocument();
    });
  });

  it('shows empty state and logs fetch error', async () => {
    (clientService.getAll as any).mockRejectedValueOnce(new Error('fail'));

    renderList();

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error fetching clients', expect.any(Error));
    });
    expect(screen.getByText(/No se encontraron clientes/i)).toBeInTheDocument();
  });

  it('restores state when delete fails', async () => {
    (clientService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Ana Perez',
        phone: '5551112222',
        email: 'ana@example.com',
        address: 'Calle 1',
        total_events: 2,
        total_spent: 1200,
      },
    ]);
    (clientService.delete as any).mockRejectedValueOnce(new Error('fail'));

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Eliminar cliente Ana Perez/i }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar cliente' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error deleting client', expect.any(Error));
    });
    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
  });

  it('clears delete state on cancel', async () => {
    (clientService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Ana Perez',
        phone: '5551112222',
        email: 'ana@example.com',
        address: 'Calle 1',
        total_events: 2,
        total_spent: 1200,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Eliminar cliente Ana Perez/i }));
    const dialog = screen.getByRole('dialog', { name: 'Eliminar cliente' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('dialog', { name: 'Eliminar cliente' })).not.toBeInTheDocument();
  });

  it('stops propagation on edit link click', async () => {
    (clientService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Ana Perez',
        phone: '5551112222',
        email: 'ana@example.com',
        address: 'Calle 1',
        total_events: 2,
        total_spent: 1200,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('link', { name: /Editar cliente Ana Perez/i }));
    expect(mockNavigate).not.toHaveBeenCalledWith('/clients/1');
  });

  it('shows empty state with search description when search has no results', async () => {
    (clientService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Ana Perez',
        phone: '5551112222',
        email: 'ana@example.com',
        address: 'Calle 1',
        total_events: 2,
        total_spent: 1200,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('Buscar clientes...'), {
      target: { value: 'zzzznonexistent' },
    });

    expect(screen.getByText('No se encontraron clientes')).toBeInTheDocument();
    expect(screen.getByText('Intenta ajustar los términos de búsqueda.')).toBeInTheDocument();
    // Should NOT show the "Agregar Cliente" action button when searching
    expect(screen.queryByText('Agregar Cliente')).not.toBeInTheDocument();
  });

  it('sorts by total_events column and shows sort icons', async () => {
    (clientService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Ana Perez',
        phone: '5551112222',
        email: 'ana@example.com',
        address: 'Calle 1',
        total_events: 5,
        total_spent: 1200,
      },
      {
        id: '2',
        name: 'Juan Lopez',
        phone: '5553334444',
        email: 'juan@example.com',
        address: 'Calle 2',
        total_events: 1,
        total_spent: 400,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });

    const eventosHeader = screen.getByText('Eventos').closest('th')!;

    // Click Eventos header to sort ascending
    fireEvent.click(eventosHeader);
    expect(eventosHeader.getAttribute('aria-sort')).toBe('ascending');

    // Click again to toggle to descending
    fireEvent.click(eventosHeader);
    expect(eventosHeader.getAttribute('aria-sort')).toBe('descending');
  });

  it('sorts by total_spent column', async () => {
    (clientService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Ana Perez',
        phone: '5551112222',
        email: 'ana@example.com',
        address: 'Calle 1',
        total_events: 2,
        total_spent: 1200,
      },
      {
        id: '2',
        name: 'Juan Lopez',
        phone: '5553334444',
        email: 'juan@example.com',
        address: 'Calle 2',
        total_events: 1,
        total_spent: 400,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });

    const totalHeader = screen.getByText('Total Gastado').closest('th')!;

    fireEvent.click(totalHeader);
    expect(totalHeader.getAttribute('aria-sort')).toBe('ascending');

    fireEvent.click(totalHeader);
    expect(totalHeader.getAttribute('aria-sort')).toBe('descending');
  });

  it('renders client without email', async () => {
    (clientService.getAll as any).mockResolvedValue([
      {
        id: '1',
        name: 'Ana Perez',
        phone: '5551112222',
        email: null,
        address: 'Calle 1',
        total_events: 2,
        total_spent: 1200,
      },
    ]);

    renderList();

    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });

    // Email should not be rendered
    expect(screen.queryByText('ana@example.com')).not.toBeInTheDocument();
    // Phone should still be rendered
    expect(screen.getByText('5551112222')).toBeInTheDocument();
  });
});
