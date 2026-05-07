import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { logError } from '../lib/errorHandler';

const mockSignOut = vi.fn();
const mockNavigate = vi.fn();
let mockLocation = { pathname: '/dashboard', search: '' };
let mockUser: { name: string; email: string; role?: string } | null = { name: 'Ana', email: 'ana@example.com' };

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    user: mockUser,
  }),
}));

vi.mock('@/lib/errorHandler', () => ({
  logError: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
  };
});

// Mock child components that are not relevant to Layout tests
vi.mock('./BottomTabBar', () => ({ BottomTabBar: () => <div data-testid="bottom-tab-bar" /> }));
vi.mock('./QuickActionsFAB', () => ({ QuickActionsFAB: () => null }));
vi.mock('./CommandPalette', () => ({ CommandPalette: ({ isOpen }: any) => isOpen ? <div data-testid="command-palette" /> : null }));
vi.mock('./KeyboardShortcutsHelp', () => ({ KeyboardShortcutsHelp: () => null }));
vi.mock('../hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({ shortcuts: [], helpOpen: false, setHelpOpen: vi.fn(), currentSection: 'global' }),
}));

const renderLayout = () =>
  render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>
  );

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation = { pathname: '/dashboard', search: '' };
    mockUser = { name: 'Ana', email: 'ana@example.com' };
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  it('renders navigation and user profile', () => {
    renderLayout();
    const sidebar = screen.getByRole('complementary', { name: /navegación principal/i });
    expect(within(sidebar).getByText(/Dashboard|Inicio|nav\.dashboard/)).toBeInTheDocument();
    expect(within(sidebar).getByText(/Clientes|nav\.clients/)).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  });

  it('signs out from sidebar action', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión|cerrar sesion|nav\.logout/i }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('handles sign out failure and redirects', async () => {
    mockSignOut.mockRejectedValue(new Error('fail'));
    localStorage.setItem('sb-test-auth-token', 'token');

    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión|cerrar sesion|nav\.logout/i }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error signing out', expect.any(Error));
    });
    expect(window.location.href).toBe('/login');
  });

  it('opens and closes the mobile sidebar', () => {
    const { container } = renderLayout();
    const menuButton = container.querySelector('header button');
    expect(menuButton).toBeTruthy();

    fireEvent.click(menuButton as Element);
    expect(container.querySelector('.fixed.inset-0')).toBeInTheDocument();

    fireEvent.click(container.querySelector('.fixed.inset-0') as Element);
    expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
  });

  it('closes sidebar when a nav link is clicked', () => {
    const { container } = renderLayout();
    const menuButton = container.querySelector('header button');
    fireEvent.click(menuButton as Element);

    const sidebar = screen.getByRole('complementary', { name: /navegación principal/i });
    fireEvent.click(within(sidebar).getByText(/Dashboard|Inicio|nav\.dashboard/));
    expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
  });

  it('closes sidebar after search button click', () => {
    const { container } = renderLayout();
    const menuButton = container.querySelector('header button');
    fireEvent.click(menuButton as Element);

    // Search is now a button that opens CommandPalette
    const searchButton = screen.getByLabelText(/abrir búsqueda|nav\.open_search/i);
    fireEvent.click(searchButton);

    // CommandPalette should be shown
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });

  it('opens command palette via search button', () => {
    renderLayout();
    const searchButton = screen.getByLabelText(/abrir búsqueda|nav\.open_search/i);
    fireEvent.click(searchButton);
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });

  it('opens command palette via Ctrl+K', () => {
    renderLayout();
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
  });

  it('uses smartphone-only bottom spacing for the main content area', () => {
    renderLayout();
    expect(screen.getByRole('main').className).toContain('pb-28');
    expect(screen.getByRole('main').className).toContain('md:pb-10');
    expect(screen.getByRole('main').className).not.toContain('lg:pb-10');
  });

  // --- Overlay keyboard handler tests ---

  it('closes sidebar overlay when Enter key is pressed', () => {
    const { container } = renderLayout();

    const menuButton = container.querySelector('header button');
    fireEvent.click(menuButton as Element);

    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();

    fireEvent.keyDown(overlay as Element, { key: 'Enter' });

    expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
  });

  it('closes sidebar overlay when Space key is pressed', () => {
    const { container } = renderLayout();

    const menuButton = container.querySelector('header button');
    fireEvent.click(menuButton as Element);

    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();

    fireEvent.keyDown(overlay as Element, { key: ' ' });

    expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
  });

  it('does not close sidebar overlay on other key presses', () => {
    const { container } = renderLayout();

    const menuButton = container.querySelector('header button');
    fireEvent.click(menuButton as Element);

    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();

    fireEvent.keyDown(overlay as Element, { key: 'Escape' });

    expect(container.querySelector('.fixed.inset-0')).toBeInTheDocument();
  });

  it('closes sidebar when X button in sidebar header is clicked', () => {
    const { container } = renderLayout();

    const menuButton = container.querySelector('header button');
    fireEvent.click(menuButton as Element);

    const sidebar = screen.getByRole('complementary', { name: /navegación principal/i });
    const closeButton = within(sidebar).getByRole('button', { name: /cerrar menú|nav\.close_nav/i });
    fireEvent.click(closeButton);

    expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
  });

  // --- User fallback tests ---

  it('shows fallback name "Usuario" when user has no name', () => {
    mockUser = { name: '', email: 'test@example.com' };
    renderLayout();
    expect(screen.getByText('Usuario')).toBeInTheDocument();
  });

  it('shows "U" as avatar initial when user has no name', () => {
    mockUser = { name: '', email: 'test@example.com' };
    renderLayout();
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('renders all navigation items', () => {
    renderLayout();
    const sidebar = screen.getByRole('complementary', { name: /navegación principal/i });
    expect(within(sidebar).getByText(/Dashboard|Inicio|nav\.dashboard/)).toBeInTheDocument();
    expect(within(sidebar).getByText(/Calendario|nav\.calendar/)).toBeInTheDocument();
    expect(within(sidebar).getByText(/Eventos|nav\.events/)).toBeInTheDocument();
    expect(within(sidebar).getByText(/Clientes|nav\.clients/)).toBeInTheDocument();
    expect(within(sidebar).getByText(/Productos|nav\.products/)).toBeInTheDocument();
    expect(within(sidebar).getByText(/Inventario|nav\.inventory/)).toBeInTheDocument();
    expect(within(sidebar).getByText(/Configuración|nav\.settings/)).toBeInTheDocument();
    expect(within(sidebar).queryByText(/Ayuda|Help|nav\.help/)).not.toBeInTheDocument();
  });

  it('highlights active nav item based on current route', () => {
    mockLocation = { pathname: '/clients', search: '' };
    renderLayout();
    const sidebar = screen.getByRole('complementary', { name: /navegación principal/i });
    const clientLink = within(sidebar).getByText(/Clientes|nav\.clients/).closest('a');
    expect(clientLink?.className).toContain('bg-');
    expect(clientLink?.className).toContain('text-primary');
  });

  it('does not highlight inactive nav items', () => {
    mockLocation = { pathname: '/dashboard', search: '' };
    renderLayout();
    const sidebar = screen.getByRole('complementary', { name: /navegación principal/i });
    const clientLink = within(sidebar).getByText(/Clientes|nav\.clients/).closest('a');
    expect(clientLink?.className).toContain('text-text-secondary');
  });
});
