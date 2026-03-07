import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { AdminUsers } from './AdminUsers';
import { adminService, AdminUser } from '@/services/adminService';
import { MemoryRouter } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';

vi.mock('@/services/adminService', () => ({
  adminService: {
    getUsers: vi.fn(),
    getStats: vi.fn(),
    upgradeUser: vi.fn(),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(),
}));

vi.mock('@/lib/errorHandler', () => ({
  logError: vi.fn(),
}));

const mockAddToast = vi.fn();

const getMockData = (): AdminUser[] => [
  { 
    id: 'u1', name: 'Premium User', email: 'u1@test.com', plan: 'premium', plan_expires_at: '2030-12-31T00:00:00Z',
    business_name: 'My Business',
    role: 'user', has_paid_subscription: false, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
    events_count: 10, clients_count: 10, products_count: 10
  },
  { 
    id: 'u2', name: 'Basic User', email: 'u2@test.com', plan: 'basic',
    role: 'user', has_paid_subscription: false, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z',
    events_count: 5, clients_count: 0, products_count: 0
  },
  { 
    id: 'u3', name: 'Expiring Today', email: 'u3@test.com', plan: 'pro', plan_expires_at: new Date(Date.now() + 4 * 3600000).toISOString(),
    role: 'user', has_paid_subscription: false, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z',
    events_count: 0, clients_count: 0, products_count: 0
  },
  { 
    id: 'u4', name: 'Expiring Soon', email: 'u4@test.com', plan: 'pro', plan_expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    role: 'user', has_paid_subscription: false, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z',
    events_count: 0, clients_count: 0, products_count: 0
  },
  { 
    id: 'u4b', name: 'Expired', email: 'u4b@test.com', plan: 'pro', plan_expires_at: '2000-01-01T00:00:00Z',
    role: 'user', has_paid_subscription: false, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z',
    events_count: 0, clients_count: 0, products_count: 0
  },
  { 
    id: 'u5', name: 'Free User', email: 'u5@test.com', plan: 'free' as any,
    role: 'user', has_paid_subscription: false, created_at: '2023-05-01T00:00:00Z', updated_at: '2023-05-01T00:00:00Z',
    events_count: 15, clients_count: 5, products_count: 0
  },
  {
    id: 'adm', name: 'Real Admin', email: 'admin@t.com', role: 'admin',
    plan: 'pro', has_paid_subscription: true, created_at: '2023-01-01T00:00:00Z', updated_at: '2023-01-01T00:00:00Z',
    events_count: 100, clients_count: 100, products_count: 100
  }
];

describe('AdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminService.getUsers).mockResolvedValue(getMockData());
    vi.mocked(adminService.getStats).mockResolvedValue({
      total_users: 7, basic_users: 1, pro_users: 4, premium_users: 1,
      total_events: 10, total_clients: 10, total_products: 10,
      new_users_today: 0, new_users_week: 0, new_users_month: 0, active_subscriptions: 1
    });
    vi.mocked(useToast).mockReturnValue({ addToast: mockAddToast, toasts: [], removeToast: vi.fn() } as any);
    vi.mocked(adminService.upgradeUser).mockImplementation(async (id, plan, expiresAt) => {
      const u = getMockData().find(t => t.id === id)!;
      return { ...u, plan, plan_expires_at: expiresAt || null };
    });
    window.confirm = vi.fn(() => true);
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

  it('verifies singular user text formatting', async () => {
    vi.mocked(adminService.getUsers).mockResolvedValueOnce([getMockData()[0]]);
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Cargando usuarios...')).not.toBeInTheDocument());
    expect(screen.getByText('1 usuario registrado')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 de 1 usuario')).toBeInTheDocument();
  });

  it('verifies data reload failure', async () => {
    vi.mocked(adminService.getUsers).mockRejectedValueOnce(new Error('Load Fail'));
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Cargando usuarios...')).not.toBeInTheDocument());
    expect(screen.getByText(/Error al cargar usuarios/i)).toBeInTheDocument();
  });

  it('verifies all functionalities and achieves 100% coverage', async () => {
    const { container } = render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Cargando usuarios...')).not.toBeInTheDocument());
    
    // Check expired user branch coverage
    expect(screen.getByText('Expirado')).toBeInTheDocument();

    // Check business_name rendering
    expect(screen.getByText('My Business')).toBeInTheDocument();

    // 1. Filtering and Sorting
    const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
    // Filter to 0 results
    fireEvent.change(searchInput, { target: { value: 'UnreachableXYZ123' } });
    expect(screen.getByText('No se encontraron usuarios con esos filtros.')).toBeInTheDocument();
    
    // Filter to exactly 1 result (plurals test is handled in separate test block, but this checks filtering)
    fireEvent.change(searchInput, { target: { value: 'Expiring Today' } });
    expect(screen.getByText('Expiring Today')).toBeInTheDocument();
    
    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });

    fireEvent.click(screen.getByText('Pro', { selector: 'button' }).closest('button') || screen.getByText('Pro', { selector: 'span' }).closest('button')!);
    fireEvent.click(screen.getByText('Todos').closest('button')!);

    const nameBtn = screen.getByText('Usuario').closest('button')!;
    fireEvent.click(nameBtn);
    fireEvent.click(nameBtn);
    fireEvent.click(nameBtn);
    
    // To trigger desc on created_at: click plan, then click created_at again
    fireEvent.click(screen.getByText('Plan').closest('button')!);
    fireEvent.click(screen.getByText('Actividad').closest('button')!);
    fireEvent.click(screen.getByText('Registro').closest('button')!); // Switches back to created_at descending

    // 2. Gift Workflow and Validation
    const basicRow = screen.getByText('Basic User').closest('tr')!;
    fireEvent.click(within(basicRow).getByText('Regalar').closest('button')!);
    await screen.findByText('Regalar plan');

    // Dialog cancellation
    fireEvent.click(screen.getByText('Cancelar').closest('button')!);
    fireEvent.click(within(basicRow).getByText('Regalar').closest('button')!);
    await screen.findByText('Regalar plan');
    const closeXBtn = container.querySelector('button .lucide-x')!.closest('button')!;
    fireEvent.click(closeXBtn);
    
    // Resume Gift flow
    fireEvent.click(within(basicRow).getByText('Regalar').closest('button')!);
    await screen.findByText('Regalar plan');
    
    // clear the date to test validation error
    const dateInput = container.querySelector('input[type="date"]')!;
    fireEvent.change(dateInput, { target: { value: '' } });
    
    let confirmBtn = screen.getByText('Confirmar regalo').closest('button')!;
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('Selecciona una fecha'), 'error'));

    // Fix the date and submit to test 'hasta' success message branch
    const dateInputStr = '2030-10-10';
    fireEvent.change(dateInput, { target: { value: dateInputStr } });
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('hasta'), 'success'));

    // Gift it again but with noExpiry & Premium
    fireEvent.click(within(basicRow).getByText('Editar regalo').closest('button')!);
    await screen.findByText('Regalar plan');

    // Check "No expiry" and succeed
    const checkbox = screen.getByText(/Sin vencimiento/i).closest('label')!.querySelector('input')!;
    fireEvent.click(checkbox);
    
    confirmBtn = screen.getByText('Confirmar regalo').closest('button')!;
    fireEvent.click(confirmBtn);
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('permanente'), 'success'));

    // 2. Edit Gift & Error (unknown primitive error string)
    const premRow = screen.getByText('Premium User').closest('tr')!;
    fireEvent.click(within(premRow).getByText('Editar regalo').closest('button')!);
    await screen.findByText('Regalar plan');
    vi.mocked(adminService.upgradeUser).mockRejectedValueOnce('Primitive String Reject');
    fireEvent.click(screen.getByText('Confirmar regalo').closest('button')!);
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('Error al asignar el plan.', 'error'));

    // 2.5 Edit Gift & Error (Standard Error Object)
    fireEvent.click(within(premRow).getByText('Editar regalo').closest('button')!);
    await screen.findByText('Regalar plan');
    vi.mocked(adminService.upgradeUser).mockRejectedValueOnce(new Error('Gift Fail Object'));
    fireEvent.click(screen.getByText('Confirmar regalo').closest('button')!);
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('Gift Fail Object', 'error'));

    // 3. Downgrade & Error (Standard Error Object)
    vi.mocked(adminService.upgradeUser).mockClear();
    vi.mocked(window.confirm).mockReturnValueOnce(true);
    vi.mocked(adminService.upgradeUser).mockRejectedValueOnce(new Error('Downgrade Fail'));
    fireEvent.click(within(premRow).getByText('Rebajar').closest('button')!);
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('Downgrade Fail', 'error'));

    // 3.5 Downgrade & Error (Unknown Primitive String)
    vi.mocked(adminService.upgradeUser).mockClear();
    vi.mocked(window.confirm).mockReturnValueOnce(true);
    vi.mocked(adminService.upgradeUser).mockRejectedValueOnce('Unknown Error');
    fireEvent.click(within(premRow).getByText('Rebajar').closest('button')!);
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('Error al actualizar el plan.', 'error'));

    // 4. Downgrade & Cancel / Success
    vi.mocked(adminService.upgradeUser).mockClear();
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    fireEvent.click(within(premRow).getByText('Rebajar').closest('button')!);
    expect(adminService.upgradeUser).not.toHaveBeenCalled();

    vi.mocked(window.confirm).mockReturnValueOnce(true);
    vi.mocked(adminService.upgradeUser).mockResolvedValueOnce({ ...getMockData()[0], plan: 'basic' });
    fireEvent.click(within(premRow).getByText('Rebajar').closest('button')!);
    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('plan Basic'), 'success'));

    // 4. CSV Export
    const originalCE = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = originalCE(tag);
      if (tag === 'a') vi.spyOn(el, 'click').mockImplementation(() => {});
      return el;
    });
    fireEvent.click(screen.getByText('Exportar CSV').closest('button')!);
    expect(mockAddToast).toHaveBeenCalledWith(expect.stringContaining('exportados'), 'success');

    // 5. Subscription Status Logic
    expect(screen.getByText('Suscripción activa')).toBeInTheDocument();
    
    // 6. Admin User View (No management buttons)
    const adminRow = screen.getByText('Real Admin').closest('tr')!;
    expect(within(adminRow).queryByText(/Regalar|Rebajar|Editar/)).toBeNull();

    // 7. Data Reload Error
    vi.mocked(adminService.getUsers).mockRejectedValueOnce(new Error('Load Err'));
    render(<MemoryRouter><AdminUsers /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Error al cargar usuarios.')).toBeInTheDocument());
  });
});
