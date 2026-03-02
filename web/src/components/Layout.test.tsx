import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from './Layout';
import { logError } from '../lib/errorHandler';

const mockSignOut = vi.fn();
const mockToggleTheme = vi.fn();
const mockNavigate = vi.fn();
let mockLocation = { pathname: '/dashboard', search: '' };
let mockTheme = 'light';
let mockUser: { name: string; email: string } | null = { name: 'Ana', email: 'ana@example.com' };

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    user: mockUser,
  }),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: mockTheme,
    toggleTheme: mockToggleTheme,
  }),
}));

vi.mock('../lib/errorHandler', () => ({
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
    mockTheme = 'light';
    mockUser = { name: 'Ana', email: 'ana@example.com' };
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });
  });

  it('renders navigation and user profile', () => {
    renderLayout();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  });

  it('toggles theme from sidebar control', () => {
    renderLayout();
    const sidebar = screen.getByRole('complementary', { name: /navegación principal/i });
    const themeButton = within(sidebar).getByRole('button', { name: /modo oscuro/i });
    fireEvent.click(themeButton);
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it('signs out from sidebar action', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('shows dark theme label in sidebar', () => {
    mockTheme = 'dark';
    renderLayout();
    const sidebar = screen.getByRole('complementary', { name: /navegación principal/i });
    expect(within(sidebar).getByRole('button', { name: /modo claro/i })).toBeInTheDocument();
  });

  it('handles sign out failure and redirects', async () => {
    Object.defineProperty(localStorage, 'sb-test-auth-token', {
      value: 'token',
      configurable: true,
      enumerable: true,
      writable: true,
    });
    mockSignOut.mockRejectedValue(new Error('fail'));

    renderLayout();

    fireEvent.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error signing out', expect.any(Error));
    });
    expect(localStorage.removeItem).toHaveBeenCalledWith('sb-test-auth-token');
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

    fireEvent.click(screen.getByText('Dashboard'));
    expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
  });

  it('closes sidebar after search submit', () => {
    const { container } = renderLayout();
    const menuButton = container.querySelector('header button');
    fireEvent.click(menuButton as Element);

    fireEvent.change(screen.getByLabelText(/búsqueda global/i), {
      target: { value: 'evento' },
    });
    fireEvent.submit(screen.getByLabelText(/búsqueda global/i).closest('form')!);

    expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
  });

  it('submits search and navigates', () => {
    renderLayout();
    fireEvent.change(screen.getByLabelText(/búsqueda global/i), {
      target: { value: 'evento' },
    });
    fireEvent.submit(screen.getByLabelText(/búsqueda global/i).closest('form')!);
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=evento');
  });

  it('ignores empty search submissions', () => {
    renderLayout();
    fireEvent.change(screen.getByLabelText(/búsqueda global/i), {
      target: { value: '   ' },
    });
    fireEvent.submit(screen.getByLabelText(/búsqueda global/i).closest('form')!);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('hydrates search input from query params on search page', async () => {
    mockLocation = { pathname: '/search', search: '?q=clientes' };
    renderLayout();
    await waitFor(() => {
      expect(screen.getByLabelText(/búsqueda global/i)).toHaveValue('clientes');
    });
  });

  // --- Overlay keyboard handler tests (covers lines 86-107) ---

  it('closes sidebar overlay when Enter key is pressed', () => {
    const { container } = renderLayout();

    // Open the sidebar
    const menuButton = container.querySelector('header button');
    fireEvent.click(menuButton as Element);

    // Verify overlay is visible
    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();

    // Press Enter on the overlay
    fireEvent.keyDown(overlay as Element, { key: 'Enter' });

    // Overlay should be removed
    expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
  });

  it('closes sidebar overlay when Space key is pressed', () => {
    const { container } = renderLayout();

    // Open the sidebar
    const menuButton = container.querySelector('header button');
    fireEvent.click(menuButton as Element);

    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();

    // Press Space on the overlay
    fireEvent.keyDown(overlay as Element, { key: ' ' });

    expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
  });

  it('does not close sidebar overlay on other key presses', () => {
    const { container } = renderLayout();

    // Open the sidebar
    const menuButton = container.querySelector('header button');
    fireEvent.click(menuButton as Element);

    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();

    // Press a different key on the overlay
    fireEvent.keyDown(overlay as Element, { key: 'Escape' });

    // Overlay should still be visible
    expect(container.querySelector('.fixed.inset-0')).toBeInTheDocument();
  });

  it('closes sidebar when X button in sidebar header is clicked', () => {
    const { container } = renderLayout();

    // Open the sidebar
    const menuButton = container.querySelector('header button');
    fireEvent.click(menuButton as Element);

    // Click the X close button inside the sidebar
    const closeButton = screen.getByRole('button', { name: /cerrar menú$/i });
    fireEvent.click(closeButton);

    // Sidebar overlay should be removed
    expect(container.querySelector('.fixed.inset-0')).not.toBeInTheDocument();
  });

  // --- User fallback tests ---

  it('shows fallback name "Usuario" when user has no name', () => {
    mockUser = { name: '', email: 'test@example.com' };
    renderLayout();
    // When name is empty string, split(' ')[0] returns '' and charAt(0) returns ''
    // firstName = '' which is falsy, but the condition checks user?.name specifically
    // Actually: user.name is '', which is falsy, so firstName = "Usuario"
    expect(screen.getByText('Usuario')).toBeInTheDocument();
  });

  it('shows "U" as avatar initial when user has no name', () => {
    mockUser = { name: '', email: 'test@example.com' };
    renderLayout();
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('does not set search value when not on search page', () => {
    mockLocation = { pathname: '/dashboard', search: '?q=ignored' };
    renderLayout();
    expect(screen.getByLabelText(/búsqueda global/i)).toHaveValue('');
  });

  it('sets search value to empty string when on search page without q param', async () => {
    mockLocation = { pathname: '/search', search: '' };
    renderLayout();
    await waitFor(() => {
      expect(screen.getByLabelText(/búsqueda global/i)).toHaveValue('');
    });
  });

  it('encodes special characters in search URL', () => {
    renderLayout();
    fireEvent.change(screen.getByLabelText(/búsqueda global/i), {
      target: { value: 'boda & fiesta' },
    });
    fireEvent.submit(screen.getByLabelText(/búsqueda global/i).closest('form')!);
    expect(mockNavigate).toHaveBeenCalledWith('/search?q=boda%20%26%20fiesta');
  });

  it('renders all navigation items', () => {
    renderLayout();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Calendario')).toBeInTheDocument();
    expect(screen.getByText('Cotización')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Productos')).toBeInTheDocument();
    expect(screen.getByText('Inventario')).toBeInTheDocument();
    expect(screen.getByText('Configuración')).toBeInTheDocument();
  });

  it('highlights active nav item based on current route', () => {
    mockLocation = { pathname: '/clients', search: '' };
    renderLayout();
    const clientLink = screen.getByText('Clientes').closest('a');
    expect(clientLink).toHaveClass('bg-primary');
  });

  it('does not highlight inactive nav items', () => {
    mockLocation = { pathname: '/dashboard', search: '' };
    renderLayout();
    const clientLink = screen.getByText('Clientes').closest('a');
    expect(clientLink).not.toHaveClass('bg-primary');
  });
});
