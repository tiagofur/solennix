import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingChecklist } from './OnboardingChecklist';
import { logError } from '../lib/errorHandler';

// --- Mocks ---

const mockUser = { id: 'user-123', name: 'Test User', email: 'test@example.com', plan: 'basic' };
let mockAuthState: { user: typeof mockUser | null };

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

const mockGetAllClients = vi.fn();
const mockGetAllProducts = vi.fn();
const mockGetUpcoming = vi.fn();

vi.mock('../services/clientService', () => ({
  clientService: {
    getAll: (...args: any[]) => mockGetAllClients(...args),
  },
}));

vi.mock('../services/productService', () => ({
  productService: {
    getAll: (...args: any[]) => mockGetAllProducts(...args),
  },
}));

vi.mock('../services/eventService', () => ({
  eventService: {
    getUpcoming: (...args: any[]) => mockGetUpcoming(...args),
  },
}));

vi.mock('../lib/errorHandler', () => ({
  logError: vi.fn(),
}));

// --- Helpers ---

const renderComponent = () =>
  render(
    <MemoryRouter>
      <OnboardingChecklist />
    </MemoryRouter>
  );

// --- Tests ---

describe('OnboardingChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { user: mockUser };
    // Default: all services return empty arrays (nothing completed)
    mockGetAllClients.mockResolvedValue([]);
    mockGetAllProducts.mockResolvedValue([]);
    mockGetUpcoming.mockResolvedValue([]);
    // Reset localStorage mock
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  // --- Initial render / loading ---

  it('renders nothing while loading', () => {
    // Services never resolve during this test
    mockGetAllClients.mockReturnValue(new Promise(() => {}));
    mockGetAllProducts.mockReturnValue(new Promise(() => {}));
    mockGetUpcoming.mockReturnValue(new Promise(() => {}));

    const { container } = renderComponent();
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when user is null', async () => {
    mockAuthState = { user: null };
    const { container } = renderComponent();
    // Wait a tick to let useEffect run
    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
    expect(mockGetAllClients).not.toHaveBeenCalled();
  });

  // --- Visible state with no items completed ---

  it('renders the checklist when no items are completed', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Comienza a usar el sistema 🚀')).toBeInTheDocument();
    });
    expect(screen.getByText(/Completa estos 3 pasos sencillos/)).toBeInTheDocument();
  });

  it('shows 0% progress when nothing is completed', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('0% Completado')).toBeInTheDocument();
    });
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('renders all three step cards with correct titles and descriptions', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Añade tu primer cliente')).toBeInTheDocument();
    });
    expect(screen.getByText('Registra los datos básicos para poder cotizarle.')).toBeInTheDocument();
    expect(screen.getByText('Crea tu primer producto')).toBeInTheDocument();
    expect(screen.getByText('Añade servicios o productos a tu catálogo de cotización.')).toBeInTheDocument();
    expect(screen.getByText('Agenda un evento')).toBeInTheDocument();
    expect(screen.getByText('Usa a tu cliente y tus productos para crear tu primera reserva.')).toBeInTheDocument();
  });

  it('renders links to correct routes for each step', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Añade tu primer cliente')).toBeInTheDocument();
    });
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', '/clients/new');
    expect(links[1]).toHaveAttribute('href', '/products/new');
    expect(links[2]).toHaveAttribute('href', '/events/new');
  });

  it('shows "Comenzar" text for incomplete steps', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Añade tu primer cliente')).toBeInTheDocument();
    });
    const comenzarElements = screen.getAllByText('Comenzar');
    expect(comenzarElements).toHaveLength(3);
  });

  // --- Partial completion ---

  it('shows 33% progress when one item is completed', async () => {
    mockGetAllClients.mockResolvedValue([{ id: '1', name: 'Client 1' }]);

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('33% Completado')).toBeInTheDocument();
    });
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '33');
  });

  it('shows 67% progress when two items are completed', async () => {
    mockGetAllClients.mockResolvedValue([{ id: '1', name: 'Client 1' }]);
    mockGetAllProducts.mockResolvedValue([{ id: '1', name: 'Product 1' }]);

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('67% Completado')).toBeInTheDocument();
    });
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '67');
  });

  it('does not show "Comenzar" for a completed step', async () => {
    mockGetAllClients.mockResolvedValue([{ id: '1', name: 'Client 1' }]);
    mockGetAllProducts.mockResolvedValue([]);
    mockGetUpcoming.mockResolvedValue([]);

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('33% Completado')).toBeInTheDocument();
    });
    // Only 2 incomplete steps should show "Comenzar"
    const comenzarElements = screen.getAllByText('Comenzar');
    expect(comenzarElements).toHaveLength(2);
  });

  // --- All complete ---

  it('renders nothing when all items are completed and sets localStorage', async () => {
    mockGetAllClients.mockResolvedValue([{ id: '1' }]);
    mockGetAllProducts.mockResolvedValue([{ id: '1' }]);
    mockGetUpcoming.mockResolvedValue([{ id: '1' }]);

    const { container } = renderComponent();
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('hideOnboarding_user-123', 'true');
    });
    // Component should not be visible (isVisible stays false)
    expect(container.querySelector('[role="progressbar"]')).not.toBeInTheDocument();
  });

  // --- Previously dismissed ---

  it('renders nothing when previously dismissed via localStorage', async () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === 'hideOnboarding_user-123') return 'true';
      return null;
    });

    const { container } = renderComponent();
    await waitFor(() => {
      // loading should be set to false, but isVisible remains false
      expect(container.innerHTML).toBe('');
    });
    // Services should NOT be called
    expect(mockGetAllClients).not.toHaveBeenCalled();
    expect(mockGetAllProducts).not.toHaveBeenCalled();
    expect(mockGetUpcoming).not.toHaveBeenCalled();
  });

  // --- Dismiss button ---

  it('hides the checklist and sets localStorage when dismiss is clicked', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Comienza a usar el sistema 🚀')).toBeInTheDocument();
    });

    const dismissButton = screen.getByRole('button', { name: /ocultar lista de verificación/i });
    fireEvent.click(dismissButton);

    expect(localStorage.setItem).toHaveBeenCalledWith('hideOnboarding_user-123', 'true');
    // After dismiss, component should disappear
    expect(screen.queryByText('Comienza a usar el sistema 🚀')).not.toBeInTheDocument();
  });

  it('dismiss button has correct title attribute', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Comienza a usar el sistema 🚀')).toBeInTheDocument();
    });

    const dismissButton = screen.getByRole('button', { name: /ocultar lista de verificación/i });
    expect(dismissButton).toHaveAttribute('title', 'Ocultar para siempre');
  });

  // --- handleDismiss with null user ---

  it('handleDismiss does not set localStorage when user becomes null', async () => {
    // Render with a valid user so the checklist appears
    const { rerender } = render(
      <MemoryRouter>
        <OnboardingChecklist />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText('Comienza a usar el sistema 🚀')).toBeInTheDocument();
    });

    // Change mock to null user, then force re-render
    mockAuthState = { user: null };
    rerender(
      <MemoryRouter>
        <OnboardingChecklist />
      </MemoryRouter>
    );

    // The component should still be visible (isVisible is still true from previous state)
    // but handleDismiss should guard against null user
    const dismissButton = screen.queryByRole('button', { name: /ocultar lista de verificación/i });
    if (dismissButton) {
      // Clear previous calls to isolate
      (localStorage.setItem as ReturnType<typeof vi.fn>).mockClear();
      fireEvent.click(dismissButton);

      // localStorage.setItem should NOT have been called since user is null
      const dismissCalls = (localStorage.setItem as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: any[]) => call[0]?.startsWith('hideOnboarding_')
      );
      expect(dismissCalls).toHaveLength(0);
    }
  });

  // --- Error handling ---

  it('hides the checklist and logs error when services fail', async () => {
    mockGetAllClients.mockRejectedValue(new Error('Network error'));
    mockGetAllProducts.mockRejectedValue(new Error('Network error'));
    mockGetUpcoming.mockRejectedValue(new Error('Network error'));

    const { container } = renderComponent();
    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error checking onboarding status', expect.any(Error));
    });
    // Component should not be visible (isVisible was never set to true)
    expect(container.querySelector('[role="progressbar"]')).not.toBeInTheDocument();
  });

  // --- Null responses from services ---

  it('handles null responses from services gracefully', async () => {
    mockGetAllClients.mockResolvedValue(null);
    mockGetAllProducts.mockResolvedValue(null);
    mockGetUpcoming.mockResolvedValue(null);

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('0% Completado')).toBeInTheDocument();
    });
  });

  // --- Progress bar accessibility ---

  it('progress bar has correct aria-label', async () => {
    mockGetAllClients.mockResolvedValue([{ id: '1' }]);

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('33% Completado')).toBeInTheDocument();
    });
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute(
      'aria-label',
      'Progreso de configuración inicial: 33% completado'
    );
  });

  // --- Service call verification ---

  it('calls eventService.getUpcoming with limit of 1', async () => {
    renderComponent();
    await waitFor(() => {
      expect(mockGetUpcoming).toHaveBeenCalledWith(1);
    });
  });

  it('calls all three services on mount', async () => {
    renderComponent();
    await waitFor(() => {
      expect(mockGetAllClients).toHaveBeenCalledTimes(1);
      expect(mockGetAllProducts).toHaveBeenCalledTimes(1);
      expect(mockGetUpcoming).toHaveBeenCalledTimes(1);
    });
  });

  // --- Progress bar width style ---

  it('applies correct width style to progress bar', async () => {
    mockGetAllClients.mockResolvedValue([{ id: '1' }]);
    mockGetAllProducts.mockResolvedValue([{ id: '1' }]);

    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('67% Completado')).toBeInTheDocument();
    });
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle({ width: '67%' });
  });
});
