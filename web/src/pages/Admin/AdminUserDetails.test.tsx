import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@tests/customRender';
import { AdminUserDetails } from './AdminUserDetails';
import { adminService } from '@/services/adminService';
import { activityService } from '@/services/activityService';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/services/adminService', () => ({
  adminService: {
    getUserById: vi.fn(),
  },
}));

vi.mock('@/services/activityService', () => ({
  activityService: {
    getAdminAuditLogs: vi.fn(),
  },
}));

const mockUser = {
  id: 'u1',
  name: 'Test Administrator',
  email: 'testadmin@solennix.com',
  plan: 'pro',
  role: 'admin',
  business_name: 'Solennix HQ',
  has_paid_subscription: false,
  account_status: 'active',
  created_at: '2026-01-01T12:00:00Z',
  updated_at: '2026-01-01T12:00:00Z',
  events_count: 15,
  clients_count: 8,
  products_count: 22,
};

const mockAuditLogsResponse = {
  data: [
    {
      id: 'log1',
      user_id: 'u1',
      action: 'create',
      resource_type: 'event',
      resource_id: 'e1',
      details: 'Created event "Boda de Ana"',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 Chrome/120.0',
      created_at: '2026-06-01T10:00:00Z',
    },
    {
      id: 'log2',
      user_id: 'u1',
      action: 'update',
      resource_type: 'product',
      resource_id: 'p1',
      details: 'Updated product price for "Pastel"',
      ip_address: '192.168.1.102',
      user_agent: 'Mozilla/5.0 Safari/605.1',
      created_at: '2026-06-02T15:30:00Z',
    },
    {
      id: 'log3',
      user_id: 'u1',
      action: 'login_failed',
      resource_type: 'user',
      resource_id: 'u1',
      details: '{"reason":"email_not_verified"}',
      ip_address: '192.168.1.103',
      user_agent: 'Mozilla/5.0 Chrome/120.0',
      created_at: '2026-06-03T11:00:00Z',
    }
  ],
  total: 3,
  page: 1,
  limit: 20,
  total_pages: 1,
};

describe('AdminUserDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminService.getUserById).mockResolvedValue(mockUser);
    vi.mocked(activityService.getAdminAuditLogs).mockResolvedValue(mockAuditLogsResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderComponent = (userId = 'u1') => {
    return render(
      <MemoryRouter initialEntries={[`/admin/users/${userId}`]}>
        <Routes>
          <Route path="/admin/users/:id" element={<AdminUserDetails />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading states and then user info with metrics', async () => {
    renderComponent();

    // Verify loading state is shown initially (either user or audit logs loading)
    expect(screen.getByText('Cargando información del usuario...')).toBeInTheDocument();

    // Wait for queries to resolve and render content
    await waitFor(() => expect(screen.queryByText(/Cargando información del usuario/i)).not.toBeInTheDocument());

    // Verify profile details
    expect(screen.getByText('Test Administrator')).toBeInTheDocument();
    expect(screen.getByText('testadmin@solennix.com')).toBeInTheDocument();
    expect(screen.getByText('Negocio: Solennix HQ')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();

    // Verify adoption cards
    expect(screen.getByText('Eventos creados')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument(); // events_count

    expect(screen.getByText('Clientes registrados')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument(); // clients_count

    expect(screen.getByText('Productos en catálogo')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument(); // products_count

    expect(screen.getByText('Puntaje de actividad')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument(); // activityScore = 15 + 8 + 22 = 45
  });

  it('renders timeline activities safely without PII (exposing no IPs or User Agents)', async () => {
    renderComponent();

    await waitFor(() => expect(screen.queryByText(/Cargando/i)).not.toBeInTheDocument());

    // Verify timeline entries are visible
    expect(screen.getByText('Created event "Boda de Ana"')).toBeInTheDocument();
    expect(screen.getByText('Updated product price for "Pastel"')).toBeInTheDocument();
    expect(screen.getByText('Intento de inicio de sesión fallido: Correo no verificado')).toBeInTheDocument();
    expect(screen.getByText('Recurso: event')).toBeInTheDocument();
    expect(screen.getByText('Recurso: product')).toBeInTheDocument();
    expect(screen.getByText('Recurso: user')).toBeInTheDocument();
    expect(screen.getByText('Acción: Intento de inicio de sesión fallido')).toBeInTheDocument();

    // CRITICAL SECURITY CHECKS: Ensure PII data from logs is NOT rendered in the UI
    expect(screen.queryByText('192.168.1.100')).not.toBeInTheDocument();
    expect(screen.queryByText('192.168.1.102')).not.toBeInTheDocument();
    expect(screen.queryByText('192.168.1.103')).not.toBeInTheDocument();
    expect(screen.queryByText(/Mozilla\/5\.0/)).not.toBeInTheDocument();
  });

  it('handles API loading error elegantly and allows refetching', async () => {
    vi.mocked(adminService.getUserById).mockRejectedValueOnce(new Error('API failure'));
    renderComponent();

    await waitFor(() => expect(screen.queryByText(/Cargando/i)).not.toBeInTheDocument());

    // Error alert is shown
    expect(screen.getByText('No se pudieron cargar los detalles del usuario.')).toBeInTheDocument();

    // Mock resolve for refetch
    vi.mocked(adminService.getUserById).mockResolvedValue(mockUser);

    // Click refresh button
    const reloadBtn = screen.getByRole('button', { name: /Recargar/i });
    fireEvent.click(reloadBtn);

    // Verify reload triggers fetch again and loads data
    await waitFor(() => {
      expect(adminService.getUserById).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Test Administrator')).toBeInTheDocument();
      expect(screen.queryByText('No se pudieron cargar los detalles del usuario.')).not.toBeInTheDocument();
    });
  });
});
