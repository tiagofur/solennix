import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@tests/customRender';
import { AdminDashboard } from './AdminDashboard';
import { adminService } from '@/services/adminService';
import { MemoryRouter } from 'react-router-dom';

// Mock the adminService
vi.mock('@/services/adminService', () => ({
  adminService: {
    getStats: vi.fn(),
    getSubscriptions: vi.fn(),
    getUsers: vi.fn(),
  },
}));

// Mock Recharts to avoid issues with ResponsiveContainer and SVG rendering in JSDOM
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
  PieChart: ({ children }: any) => <svg>{children}</svg>,
  Pie: ({ children }: any) => <g>{children}</g>,
  Cell: () => <rect />,
  Tooltip: () => <div />,
  BarChart: ({ children }: any) => <svg>{children}</svg>,
  Bar: () => <rect />,
  XAxis: () => <g />,
  YAxis: () => <g />,
  CartesianGrid: () => <g />,
}));

const mockStats = {
  total_users: 101,
  basic_users: 71,
  pro_users: 21,
  premium_users: 9,
  total_events: 100,
  total_clients: 50,
  total_products: 200,
  new_users_today: 7,
  new_users_week: 23,
  new_users_month: 53,
  active_subscriptions: 31,
};

const mockSubs = {
  total_active: 19,
  total_canceled: 3,
  total_trialing: 2,
  total_past_due: 1,
  stripe_count: 15,
  apple_count: 3,
  google_count: 2,
};

const mockUsers = [
  { 
    id: '1', 
    name: 'User 1', 
    email: 'u1@test.com', 
    events_count: 10, 
    clients_count: 5, 
    products_count: 2, 
    plan: 'premium',
    role: 'user',
    has_paid_subscription: true,
    created_at: '2023-01-01',
    updated_at: '2023-01-01'
  },
  { 
    id: '2', 
    name: 'User 2', 
    email: 'u2@test.com', 
    events_count: 5, 
    clients_count: 2, 
    products_count: 1, 
    plan: 'pro',
    role: 'user',
    has_paid_subscription: true,
    created_at: '2023-01-01',
    updated_at: '2023-01-01'
  },
];

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminService.getStats).mockResolvedValue(mockStats);
    vi.mocked(adminService.getSubscriptions).mockResolvedValue(mockSubs);
    vi.mocked(adminService.getUsers).mockResolvedValue(mockUsers);
  });

  it('renders loading state initially and then displays statistics', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <AdminDashboard />
        </MemoryRouter>
      );
    });

    // Wait for the main title to ensure component mounted
    expect(await screen.findByText('Panel de Administración')).toBeInTheDocument();

    // Verify key stats are rendered
    expect(await screen.findByText('101')).toBeInTheDocument(); // Total Usuarios
    expect(await screen.findByText('30')).toBeInTheDocument(); // Usuarios Pagados
    expect(await screen.findByText('501')).toBeInTheDocument(); // Total Eventos
  });

  it('calculates derived metrics correctly', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      // conversionRate: (30/101)*100 = 29.7%
      expect(screen.getAllByText('29.7% conversión')[0]).toBeInTheDocument();
      // avgEventsPerUser: 501/101 = 5.0
      expect(screen.getByText('~5.0 por usuario')).toBeInTheDocument();
      // churnRate: (3 / (19+3))*100 = 13.6%
      expect(screen.getByText('13.6%')).toBeInTheDocument();
    });
  });

  it('displays top users by activity', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('User 1')).toBeInTheDocument();
      expect(screen.getByText('User 2')).toBeInTheDocument();
      // Activity score for User 1: 10 + 5 + 2 = 17
      expect(screen.getByText('17 total')).toBeInTheDocument();
    });
  });

  it('handles error when loading data fails', async () => {
    vi.mocked(adminService.getStats).mockRejectedValue(new Error('Failed to load'));

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Error al cargar las estadísticas. Intenta recargar.')).toBeInTheDocument();
    });
  });

  it('reloads data when clicking refresh button', async () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('101')).toBeInTheDocument());

    const refreshBtn = screen.getByLabelText('Recargar estadísticas');
    
    // Changing mock to simulate update
    vi.mocked(adminService.getStats).mockResolvedValue({ ...mockStats, total_users: 105 });

    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByText('105')).toBeInTheDocument();
    });
    
    expect(adminService.getStats).toHaveBeenCalledTimes(2);
  });

  it('shows healthy growth rate indicator', async () => {
    // new_users_week = 23, new_users_month = 53. 23 >= 53/4 (13.25) -> Healthy
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/saludable/)).toBeInTheDocument();
    });
  });

  it('shows low growth rate indicator', async () => {
    // new_users_week = 5, new_users_month = 50. 5 < 12.5 -> Low
    vi.mocked(adminService.getStats).mockResolvedValue({ ...mockStats, new_users_week: 5 });

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/por debajo/)).toBeInTheDocument();
    });
  });

  it('handles empty top users list', async () => {
    vi.mocked(adminService.getUsers).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No hay usuarios registrados aún.')).toBeInTheDocument();
    });
  });
});
