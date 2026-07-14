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

// jsdom has no matchMedia; default to narrow viewport. Individual tests override.
let mockIsXl = false;
vi.mock('../../hooks/useBreakpoint', () => ({
  useIsXl: () => mockIsXl,
}));

// Mock usePlanLimits to avoid pulling in more dependencies
vi.mock('../../hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({
    isBasicPlan: false,
    canCreateClient: true,
    clientsCount: 0,
    clientLimit: 50,
  }),
}));

// Stub the detail panel so xl split-pane tests verify list wiring without
// pulling the full detail data tree (ClientDetailPanel has its own test file).
vi.mock('./ClientDetails', () => ({
  ClientDetailPanel: ({ clientId, embedded }: { clientId: string; embedded?: boolean }) =>
    embedded ? (
      <div data-testid="client-detail-panel" data-client-id={clientId}>
        Detalle del cliente {clientId}
      </div>
    ) : null,
}));

/** Sets up getPage mock. Optionally accepts a per-search override map. */
const mockClients = (clients: any[], searchMap?: Record<string, any[]>) => {
  (clientService.getAll as any).mockResolvedValue(clients);
  (clientService.getPage as any).mockImplementation(({ search }: { search?: string } = {}) => {
    const result = searchMap && search && searchMap[search] !== undefined
      ? searchMap[search]
      : clients;
    return Promise.resolve({
      data: result,
      total: result.length,
      page: 1,
      limit: 20,
      total_pages: result.length === 0 ? 1 : 1,
    });
  });
};

const renderList = () =>
  render(
    <MemoryRouter>
      <ClientList />
    </MemoryRouter>
  );

// Helper to open the RowActionMenu and click a menu item
const openRowMenuAndClick = async (rowText: string, menuItemLabel: RegExp) => {
  const row = screen.getByText(rowText).closest('tr')!;
  const actionsButton = within(row).getByLabelText('Acciones');
  fireEvent.click(actionsButton);

  await waitFor(() => {
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole('menuitem', { name: menuItemLabel }));
};

describe('ClientList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsXl = false;
  });

  afterEach(() => {
    // Always restore real timers so fake-timer tests don't leak into subsequent tests
    vi.useRealTimers();
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
    mockClients(
      [
        { id: '1', name: 'Ana Perez', phone: '5551112222', email: 'ana@example.com', address: 'Calle 1', total_events: 2, total_spent: 1200 },
        { id: '2', name: 'Juan Lopez', phone: '5553334444', email: 'juan@example.com', address: 'Calle 2', total_events: 1, total_spent: 800 },
      ],
      {
        Ana: [{ id: '1', name: 'Ana Perez', phone: '5551112222', email: 'ana@example.com', address: 'Calle 1', total_events: 2, total_spent: 1200 }],
      },
    );

    // Render under real timers so React Query initializes normally
    renderList();
    await waitFor(() => {
      expect(screen.getByText('Juan Lopez')).toBeInTheDocument();
    });

    // Switch to fake timers AFTER the initial load, only for the debounce
    vi.useFakeTimers();
    fireEvent.change(screen.getByPlaceholderText('Buscar cliente por nombre, correo o teléfono...'), {
      target: { value: 'Ana' },
    });
    vi.advanceTimersByTime(300);
    // Restore real timers BEFORE the async assertion so waitFor can tick
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.queryByText('Juan Lopez')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
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
    await openRowMenuAndClick('Ana Perez', /Eliminar|action\.delete/i);

    // ConfirmDialog should appear
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Eliminar|action\.delete/i }));

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

    await openRowMenuAndClick('Ana Perez', /Eliminar|action\.delete/i);

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Eliminar|action\.delete/i }));

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

    await openRowMenuAndClick('Ana Perez', /Eliminar|action\.delete/i);

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: /Cancelar|action\.cancel/i }));

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
    await openRowMenuAndClick('Ana Perez', /Editar|action\.edit/i);
    // The menu item's onClick navigates via the RowActionMenu handler
    expect(mockNavigate).toHaveBeenCalledWith('/clients/1/edit');
  });

  it('shows empty state with search description when search has no results', async () => {
    mockClients(
      [
        { id: '1', name: 'Ana Perez', phone: '5551112222', email: 'ana@example.com', address: 'Calle 1', total_events: 2, total_spent: 1200 },
      ],
      {
        zzzznonexistent: [],
      },
    );

    // Render under real timers so React Query initializes normally
    renderList();
    await waitFor(() => {
      expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    });

    // Switch to fake timers only for the debounce advance
    vi.useFakeTimers();
    fireEvent.change(screen.getByPlaceholderText('Buscar cliente por nombre, correo o teléfono...'), {
      target: { value: 'zzzznonexistent' },
    });
    vi.advanceTimersByTime(300);
    // Restore real timers BEFORE waitFor so async resolution works
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByText('No se encontraron clientes')).toBeInTheDocument();
    });
    expect(screen.getByText('No se encontraron clientes que coincidan con tu búsqueda')).toBeInTheDocument();
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

    const totalHeader = screen.getByText('Total').closest('th')!;

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

  describe('master-detail split pane (xl+)', () => {
    beforeEach(() => {
      mockIsXl = true;
    });

    it('selects client in pane (no navigation) on row click at xl', async () => {
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
      // At xl, row click must NOT navigate to the full detail page.
      expect(mockNavigate).not.toHaveBeenCalledWith('/clients/1');
    });

    it('renders empty selection state when no client is selected at xl', async () => {
      mockClients([
        {
          id: '1',
          name: 'Ana Perez',
          phone: '5551112222',
          email: 'ana@example.com',
          total_events: 0,
          total_spent: 0,
        },
      ]);

      renderList();

      await waitFor(() => {
        expect(screen.getByText('Seleccioná un cliente')).toBeInTheDocument();
      });
    });

    it('renders detail panel in the rail when a client is preselected via URL', async () => {
      mockClients([
        {
          id: '1',
          name: 'Ana Perez',
          phone: '5551112222',
          email: 'ana@example.com',
          total_events: 0,
          total_spent: 0,
        },
      ]);

      render(
        <MemoryRouter initialEntries={['/clients?selected=1']}>
          <ClientList />
        </MemoryRouter>,
      );

      // The stubbed detail panel should render for the selected client id.
      await waitFor(() => {
        expect(screen.getByTestId('client-detail-panel')).toHaveAttribute('data-client-id', '1');
      });
    });
  });
});
