import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@tests/customRender';
import { AdminUsers } from './AdminUsers';
import { adminService, type AdminUser } from '@/services/adminService';
import { MemoryRouter } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';

vi.mock('@/services/adminService', () => ({
  adminService: {
    getUsers: vi.fn(),
    getStats: vi.fn(),
    upgradeUser: vi.fn(),
    getSubscriptions: vi.fn(),
    getInactiveUsers: vi.fn(),
    getUsersWithZeroResources: vi.fn(),
    deleteUser: vi.fn(),
    verifyUserEmail: vi.fn(),
    blockUser: vi.fn(),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(),
}));

vi.mock('@/lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: (error: unknown, defaultMessage: string = 'Ocurrió un error') => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return defaultMessage;
  },
}));

const mockAddToast = vi.fn();

const getMockData = (): AdminUser[] => [
  {
    id: 'u1', name: 'Premium User', email: 'u1@test.com', plan: 'premium', plan_expires_at: '2030-12-31T00:00:00Z',
    business_name: 'My Business',
    role: 'user', has_paid_subscription: false, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
    events_count: 10, clients_count: 10, products_count: 10, account_status: 'active',
    email_verified_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 'u2', name: 'Basic User', email: 'u2@test.com', plan: 'basic',
    role: 'user', has_paid_subscription: false, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z',
    events_count: 5, clients_count: 0, products_count: 0, account_status: 'active'
  },
  {
    id: 'u3', name: 'Expiring Today', email: 'u3@test.com', plan: 'pro', plan_expires_at: new Date(Date.now() + 4 * 3600000).toISOString(),
    role: 'user', has_paid_subscription: false, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z',
    events_count: 0, clients_count: 0, products_count: 0, account_status: 'active'
  },
  {
    id: 'u4', name: 'Expiring Soon', email: 'u4@test.com', plan: 'pro', plan_expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    role: 'user', has_paid_subscription: false, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z',
    events_count: 0, clients_count: 0, products_count: 0, account_status: 'active'
  },
  {
    id: 'u4b', name: 'Expired', email: 'u4b@test.com', plan: 'pro', plan_expires_at: '2000-01-01T00:00:00Z',
    role: 'user', has_paid_subscription: false, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z',
    events_count: 0, clients_count: 0, products_count: 0, account_status: 'active'
  },
  {
    id: 'u5', name: 'Free User', email: 'u5@test.com', plan: 'free' as any,
    role: 'user', has_paid_subscription: false, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z',
    events_count: 15, clients_count: 5, products_count: 0, account_status: 'active'
  },
  {
    id: 'adm', name: 'Real Admin', email: 'admin@t.com', role: 'admin',
    plan: 'pro', has_paid_subscription: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
    events_count: 100, clients_count: 100, products_count: 100, account_status: 'active'
  },
  {
    id: 'u-blocked', name: 'Blocked Pending', email: 'blocked@test.com', plan: 'basic',
    role: 'user', has_paid_subscription: false, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
    events_count: 0, clients_count: 0, products_count: 0,
    account_status: 'blocked', deletion_eligible_at: '2026-08-31T12:00:00'
  }
];

const defaultStats = {
  total_users: 8, basic_users: 2, pro_users: 4, business_users: 1, premium_users: 0,
  total_events: 10, total_clients: 10, total_products: 10,
  new_users_today: 0, new_users_week: 0, new_users_month: 0, active_subscriptions: 1
};

describe('AdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminService.getUsers).mockImplementation(async (type, status) => {
      if (status === 'eligible_for_deletion') {
        return getMockData().filter(u => u.account_status === 'blocked');
      }
      return getMockData();
    });
    vi.mocked(adminService.getInactiveUsers).mockResolvedValue(getMockData().slice(2, 4)); // u3, u4
    vi.mocked(adminService.getUsersWithZeroResources).mockResolvedValue(getMockData().slice(3, 5)); // u4, u4b
    vi.mocked(adminService.deleteUser).mockResolvedValue({ success: true } as any);
    vi.mocked(adminService.getStats).mockResolvedValue(defaultStats);
    vi.mocked(adminService.getSubscriptions).mockResolvedValue({
      total_active: 0,
      total_canceled: 0,
      total_trialing: 0,
      total_past_due: 0,
      stripe_count: 0,
      apple_count: 0,
      google_count: 0,
    });
    vi.mocked(useToast).mockReturnValue({ addToast: mockAddToast, toasts: [], removeToast: vi.fn() } as any);
    vi.mocked(adminService.upgradeUser).mockImplementation(async (id, plan, expiresAt) => {
      const u = getMockData().find(t => t.id === id)!;
      return { ...u, plan, plan_expires_at: expiresAt || null };
    });
    vi.mocked(adminService.verifyUserEmail).mockImplementation(async (id) => {
      const u = getMockData().find(t => t.id === id)!;
      return { ...u, email_verified_at: new Date().toISOString() };
    });
    vi.mocked(adminService.blockUser).mockImplementation(async (id) => {
      const u = getMockData().find(t => t.id === id)!;
      return { ...u, account_status: 'blocked', deletion_eligible_at: '2026-12-01T00:00:00Z' };
    });
    window.URL.createObjectURL = vi.fn(() => 'blob:url');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies empty users state', async () => {
    vi.mocked(adminService.getUsers).mockResolvedValueOnce([]);
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Cargando usuarios...')).not.toBeInTheDocument());
    expect(screen.getByText('No hay usuarios registrados aún.')).toBeInTheDocument();
  });

  it('verifies data reload failure', async () => {
    vi.mocked(adminService.getUsers).mockRejectedValueOnce(new Error('Load Fail'));
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Cargando usuarios...')).not.toBeInTheDocument());
    expect(screen.getByText(/Error al cargar usuarios/i)).toBeInTheDocument();
  });

  it('renders blocked pending user details and badges', async () => {
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Cargando usuarios...')).not.toBeInTheDocument());

    expect(screen.getByText('Blocked Pending')).toBeInTheDocument();
    expect(screen.getByText('Bloqueado (Baja Pendiente)')).toBeInTheDocument();
    expect(screen.getByText(/Elegible: 31 (ago\.?|Aug) '26/i)).toBeInTheDocument();
  });

  it('handles auditing filter views correctly', async () => {
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Cargando usuarios...')).not.toBeInTheDocument());

    // 1. Inactive filter click
    const inactiveFilterBtn = screen.getByRole('button', { name: 'Inactivos (> 30 días)' });
    fireEvent.click(inactiveFilterBtn);
    expect(adminService.getInactiveUsers).toHaveBeenCalledWith(30);
    // Should display only mocked inactive users (u3: Expiring Today, u4: Expiring Soon)
    await waitFor(() => {
      expect(screen.getByText('Expiring Today')).toBeInTheDocument();
      expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
      expect(screen.queryByText('Premium User')).not.toBeInTheDocument();
    });

    // 2. Zero resources filter click
    const zeroResourcesFilterBtn = screen.getByRole('button', { name: 'Sin Recursos' });
    fireEvent.click(zeroResourcesFilterBtn);
    expect(adminService.getUsersWithZeroResources).toHaveBeenCalled();
    // Should display mocked zero resource users (u4: Expiring Soon, u4b: Expired)
    await waitFor(() => {
      expect(screen.getByText('Expired')).toBeInTheDocument();
      expect(screen.queryByText('Expiring Today')).not.toBeInTheDocument();
    });

    // 3. Eligible for deletion filter click
    const eligibleFilterBtn = screen.getByRole('button', { name: 'Elegibles para Eliminación' });
    fireEvent.click(eligibleFilterBtn);
    expect(adminService.getUsers).toHaveBeenCalledWith('users', 'eligible_for_deletion');
    // Should display blocked user
    await waitFor(() => {
      expect(screen.getByText('Blocked Pending')).toBeInTheDocument();
      expect(screen.queryByText('Premium User')).not.toBeInTheDocument();
    });
  });

  it('handles permanent deletion flow (cancellation and confirm success)', async () => {
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Cargando usuarios...')).not.toBeInTheDocument());

    const blockedRow = screen.getByText('Blocked Pending').closest('tr')!;
    
    // Open dropdown
    fireEvent.click(within(blockedRow).getByRole('button', { name: /Acciones/i }));
    const deleteBtn = screen.getByRole('menuitem', { name: /Eliminar permanente/i });

    // Click permanent deletion
    fireEvent.click(deleteBtn);

    // ConfirmDialog should be visible
    expect(screen.getByText('Eliminar usuario permanentemente')).toBeInTheDocument();
    expect(screen.getByText(/¿Estás seguro de que deseas eliminar permanentemente a Blocked Pending/i)).toBeInTheDocument();

    // 1. Cancel deletion
    const cancelBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBtn);
    expect(adminService.deleteUser).not.toHaveBeenCalled();

    // 2. Confirm deletion
    fireEvent.click(within(blockedRow).getByRole('button', { name: /Acciones/i }));
    const deleteBtnConfirm = screen.getByRole('menuitem', { name: /Eliminar permanente/i });
    fireEvent.click(deleteBtnConfirm);
    const confirmBtn = screen.getByRole('button', { name: 'Eliminar permanentemente' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminService.deleteUser).toHaveBeenCalledWith('u-blocked');
      expect(mockAddToast).toHaveBeenCalledWith('Usuario Blocked Pending eliminado permanentemente', 'success');
    });
  });

  it('verifies all standard functionalities and achieves comprehensive coverage', async () => {
    const { container } = render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Cargando usuarios...')).not.toBeInTheDocument());

    expect(screen.getByText('Expirado')).toBeInTheDocument();
    expect(screen.getByText('My Business')).toBeInTheDocument();

    // 1. Filtering and Sorting
    const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
    fireEvent.change(searchInput, { target: { value: 'UnreachableXYZ123' } });
    expect(screen.getByText('No se encontraron usuarios con esos filtros.')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'Expiring Today' } });
    expect(screen.getByText('Expiring Today')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '' } });

    const proFilterBtn = screen.getAllByRole('button', { name: /Pro/i })[0];
    fireEvent.click(proFilterBtn);
    const allPlanBtn = screen
      .getAllByRole('button')
      .find((button) => (button.textContent || '').trim().startsWith('Todos ('));
    expect(allPlanBtn).toBeTruthy();
    fireEvent.click(allPlanBtn!);

    const nameBtn = screen.getByRole('button', { name: /^Usuario$/i });
    fireEvent.click(nameBtn);
    fireEvent.click(nameBtn);

    fireEvent.click(screen.getByText('Plan').closest('button')!);
    fireEvent.click(screen.getByText('Actividad').closest('button')!);
    fireEvent.click(screen.getByText('Registro').closest('button')!);

    // 2. Gift Workflow
    const basicRow = screen.getByText('Basic User').closest('tr')!;
    
    // Attempt 1: Open menu and click Regalar, then Cancel
    fireEvent.click(within(basicRow).getByRole('button', { name: /Acciones/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Regalar/i }));
    await screen.findByText('Regalar plan');
    fireEvent.click(screen.getByText('Cancelar').closest('button')!);

    // Attempt 2: Open menu and click Regalar, then Close X
    fireEvent.click(within(basicRow).getByRole('button', { name: /Acciones/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Regalar/i }));
    await screen.findByText('Regalar plan');
    const closeXBtn = container.querySelector('button .lucide-x')!.closest('button')!;
    fireEvent.click(closeXBtn);

    // Attempt 3: Open menu and click Regalar, then submit error
    fireEvent.click(within(basicRow).getByRole('button', { name: /Acciones/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Regalar/i }));
    await screen.findByText('Regalar plan');

    const dateInput = container.querySelector('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: '' } });

    const confirmBtn = screen.getByText('Confirmar regalo').closest('button')!;
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Selecciona una fecha'), 'error'));

    // Attempt 4: Fill date and confirm success
    const dateInputStr = '2030-10-10';
    fireEvent.change(dateInput, { target: { value: dateInputStr } });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('hasta'), 'success'));

    // 3. Downgrade with ConfirmDialog
    const premRow = screen.getByText('Premium User').closest('tr')!;
    vi.mocked(adminService.upgradeUser).mockResolvedValueOnce({ ...getMockData()[0], plan: 'basic' });
    
    fireEvent.click(within(premRow).getByRole('button', { name: /Acciones/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Rebajar/i }));
    
    await screen.findByText('Rebajar plan');
    const successDialog = screen.getByRole('dialog');
    fireEvent.click(within(successDialog).getByText('Rebajar').closest('button')!);
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('plan Basic'), 'success'));
  });

  it('displays email verification status and allows manual verification', async () => {
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Cargando usuarios...')).not.toBeInTheDocument());

    // Premium User has email_verified_at, so should display "Verificado"
    const premRow = screen.getByText('Premium User').closest('tr')!;
    expect(within(premRow).getByText('Verificado')).toBeInTheDocument();
    
    // There shouldn't be a verification action in dropdown for verified users (it wouldn't be added)
    fireEvent.click(within(premRow).getByRole('button', { name: /Acciones/i }));
    expect(screen.queryByRole('menuitem', { name: /Verificar/i })).not.toBeInTheDocument();
    
    // Close the dropdown by clicking outside or escape (let's re-render or click to close it)
    fireEvent.click(within(premRow).getByRole('button', { name: /Acciones/i })); // toggle close

    // Basic User doesn't have email_verified_at, so should display "Pendiente"
    const basicRow = screen.getByText('Basic User').closest('tr')!;
    expect(within(basicRow).getByText('Pendiente')).toBeInTheDocument();
    
    // Open actions and click Verificar
    fireEvent.click(within(basicRow).getByRole('button', { name: /Acciones/i }));
    const verifyBtn = screen.getByRole('menuitem', { name: /Verificar/i });
    expect(verifyBtn).toBeInTheDocument();

    // Perform manual verification
    fireEvent.click(verifyBtn);
    await waitFor(() => {
      expect(adminService.verifyUserEmail).toHaveBeenCalledWith('u2');
      expect(mockAddToast).toHaveBeenCalledWith('Email verificado exitosamente', 'success');
    });
  });

  it('handles block user flow (cancellation, validation error, confirm success)', async () => {
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Cargando usuarios...')).not.toBeInTheDocument());

    const userRow = screen.getByText('Premium User').closest('tr')!;

    // 1. Open menu and click Bloquear
    fireEvent.click(within(userRow).getByRole('button', { name: /Acciones/i }));
    const blockBtn = screen.getByRole('menuitem', { name: /Bloquear/i });
    fireEvent.click(blockBtn);

    // Verify modal is open
    expect(screen.getByText('Bloquear Usuario')).toBeInTheDocument();
    expect(screen.getByLabelText(/Motivo del bloqueo/i)).toBeInTheDocument();

    // 2. Submit empty reason (should show validation error)
    const confirmBlockBtn = screen.getByRole('button', { name: /^Bloquear$/ });
    fireEvent.click(confirmBlockBtn);
    expect(screen.getByText('El motivo es obligatorio')).toBeInTheDocument();
    expect(adminService.blockUser).not.toHaveBeenCalled();

    // 3. Cancel block modal
    const cancelBlockBtn = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelBlockBtn);
    expect(screen.queryByText('Bloquear Usuario')).not.toBeInTheDocument();

    // 4. Open modal again, write reason and confirm success
    fireEvent.click(within(userRow).getByRole('button', { name: /Acciones/i }));
    const blockBtn2 = screen.getByRole('menuitem', { name: /Bloquear/i });
    fireEvent.click(blockBtn2);

    const textarea = screen.getByLabelText(/Motivo del bloqueo/i);
    fireEvent.change(textarea, { target: { value: 'Comportamiento inadecuado' } });
    
    const confirmBlockBtn2 = screen.getByRole('button', { name: /^Bloquear$/ });
    fireEvent.click(confirmBlockBtn2);

    await waitFor(() => {
      expect(adminService.blockUser).toHaveBeenCalledWith('u1', 'Comportamiento inadecuado');
      expect(mockAddToast).toHaveBeenCalledWith('Usuario bloqueado exitosamente', 'success');
      expect(screen.queryByText('Bloquear Usuario')).not.toBeInTheDocument();
    });
  });
});
