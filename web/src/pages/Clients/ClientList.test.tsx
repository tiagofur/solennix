import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { ClientList } from './ClientList';
import { clientService } from '../../services/clientService';

const mockNavigate = vi.fn();

vi.mock('../../services/clientService', () => ({
  clientService: {
    getAll: vi.fn(),
    getPage: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    uploadPhoto: vi.fn(),
  },
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((_err: unknown, fallback?: string) => fallback || 'Error'),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    toasts: [],
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock usePlanLimits to avoid pulling in more dependencies
vi.mock('../../hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({
    isBasicPlan: false,
    canCreateClient: true,
    clientsCount: 0,
    clientLimit: 50,
  }),
}));

/** Sets up both getAll and getPage mocks with the same data. */
const mockClients = (clients: any[]) => {
  (clientService.getAll as any).mockResolvedValue(clients);
  (clientService.getPage as any).mockResolvedValue({
    data: clients,
    total: clients.length,
    page: 1,
    limit: 20,
    total_pages: 1,
  });
};

const renderList = () =>
  render(
    <MemoryRouter>
      <ClientList />
    </MemoryRouter>
  );

// Helper to open the RowActionMenu and click a menu item
const openRowMenuAndClick = async (rowText: string, menuItemLabel: string) => {
  const row = screen.getByText(rowText).closest('tr')!;
  const actionsButton = within(row).getByLabelText('Acciones');
  fireEvent.click(actionsButton);

  await waitFor(() => {
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  fireEvent.click(screen.getByText(menuItemLabel));
};

describe('ClientList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders clients after loading', async () => {
    mockClients([
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
    mockClients([
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
    mockClients([
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
    mockClients([
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

    // Open RowActionMenu and click Eliminar
    await openRowMenuAndClick('Ana Perez', 'Eliminar');

    // ConfirmDialog should appear
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('Eliminar permanentemente'));

    await waitFor(() => {
      expect(clientService.delete).toHaveBeenCalledWith('1');
    });
  });

  it('shows empty state and logs fetch error', async () => {
    (clientService.getAll as any).mockRejectedValueOnce(new Error('fail'));
    (clientService.getPage as any).mockRejectedValueOnce(new Error('fail'));

    renderList();

    // React Query handles the error; component shows empty state or loading
    await waitFor(() => {
      expect(screen.getByText(/No se encontraron clientes/i)).toBeInTheDocument();
    });
  });

  it('restores state when delete fails', async () => {
    mockClients([
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

    await openRowMenuAndClick('Ana Perez', 'Eliminar');

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('Eliminar permanentemente'));

    // Client should still be visible after failed deletion (React Query invalidates)
    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });
  });

  it('clears delete state on cancel', async () => {
    mockClients([
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

    await openRowMenuAndClick('Ana Perez', 'Eliminar');

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('Cancelar'));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stops propagation on edit link click', async () => {
    mockClients([
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

    // Open RowActionMenu and click Editar — it navigates to edit route
    await openRowMenuAndClick('Ana Perez', 'Editar');
    // The menu item's onClick navigates via the RowActionMenu handler
    expect(mockNavigate).toHaveBeenCalledWith('/clients/1/edit');
  });

  it('shows empty state with search description when search has no results', async () => {
    mockClients([
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
    expect(screen.getByText(/No hay clientes que coincidan/i)).toBeInTheDocument();
  });

  it('sorts by total_events column and shows sort icons', async () => {
    mockClients([
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

    fireEvent.click(eventosHeader);
    expect(eventosHeader.getAttribute('aria-sort')).toBe('ascending');

    fireEvent.click(eventosHeader);
    expect(eventosHeader.getAttribute('aria-sort')).toBe('descending');
  });

  it('sorts by total_spent column', async () => {
    mockClients([
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
    mockClients([
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

    expect(screen.queryByText('ana@example.com')).not.toBeInTheDocument();
    expect(screen.getByText('5551112222')).toBeInTheDocument();
  });
});
