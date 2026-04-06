import { render, screen, waitFor } from '@tests/customRender';
import userEvent from '@testing-library/user-event';
import { Pricing } from './Pricing';

// --- Mocks ---

const mockCreateCheckoutSession = vi.fn();
const mockDebugUpgrade = vi.fn();

vi.mock('../services/subscriptionService', () => ({
  subscriptionService: {
    createCheckoutSession: (...args: unknown[]) => mockCreateCheckoutSession(...args),
    debugUpgrade: (...args: unknown[]) => mockDebugUpgrade(...args),
  },
}));

const mockCheckAuth = vi.fn();
let mockUser: { id: string; email: string; name: string; plan: string } | null = null;

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    checkAuth: mockCheckAuth,
  }),
}));

// --- Helpers ---

function renderPricing() {
  return render(<Pricing />);
}

// --- Tests ---

describe('Pricing', () => {
  beforeEach(() => {
    mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test User', plan: 'basic' };
    mockCreateCheckoutSession.mockReset();
    mockDebugUpgrade.mockReset();
    mockCheckAuth.mockReset();
    // Suppress console.error from expected error paths
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ---- Rendering ----

  describe('initial render', () => {
    it('renders the page heading and description', () => {
      renderPricing();

      expect(screen.getByText('Planes y Precios')).toBeInTheDocument();
      expect(screen.getByText('Potencia tu negocio de eventos')).toBeInTheDocument();
      expect(
        screen.getByText('Elige el plan que se adapte al tamaño y crecimiento de tus eventos.'),
      ).toBeInTheDocument();
    });

    it('renders the Basico plan card with features', () => {
      renderPricing();

      expect(screen.getByText('Básico')).toBeInTheDocument();
      expect(screen.getByText('Perfecto para empezar y organizar eventos pequeños.')).toBeInTheDocument();
      expect(screen.getByText('$0')).toBeInTheDocument();
      expect(screen.getByText('/mes')).toBeInTheDocument();

      // Free features
      expect(screen.getByText('Hasta 3 eventos por mes')).toBeInTheDocument();
      expect(screen.getByText('Hasta 50 clientes registrados')).toBeInTheDocument();
      expect(screen.getByText('Hasta 20 ítems en catálogo')).toBeInTheDocument();
      expect(screen.getByText('Gestión básica de clientes')).toBeInTheDocument();
      expect(screen.getByText('Calendario de eventos')).toBeInTheDocument();
      expect(screen.getByText('Generación de PDFs (cotizaciones, contratos y más)')).toBeInTheDocument();
    });

    it('renders the Pro plan card with features', () => {
      renderPricing();

      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(
        screen.getByText('Todas las herramientas para escalar tu negocio sin límites.'),
      ).toBeInTheDocument();
      expect(screen.getByText('$1,499')).toBeInTheDocument();
      expect(screen.getByText('MXN/año')).toBeInTheDocument();
      expect(screen.getByText('$149')).toBeInTheDocument();
      expect(screen.getByText('Recomendado')).toBeInTheDocument();

      // Pro features
      expect(screen.getByText('Eventos ilimitados')).toBeInTheDocument();
      expect(screen.getByText('Clientes y catálogo ilimitados')).toBeInTheDocument();
      expect(screen.getByText('Control de pagos e ingresos en múltiples plazos')).toBeInTheDocument();
      expect(screen.getByText('Reportes y analíticas avanzadas')).toBeInTheDocument();
      expect(screen.getByText('Soporte prioritario')).toBeInTheDocument();
      expect(screen.getByText('Todo lo anterior, y además:')).toBeInTheDocument();
    });

    it('shows the disabled "Plan Actual" button for Basico plan', () => {
      renderPricing();

      const basicButton = screen.getByRole('button', { name: /Plan Básico - Plan actual/i });
      expect(basicButton).toBeDisabled();
      expect(basicButton).toHaveTextContent('Plan Actual');
    });

    it('does not display any error on initial render', () => {
      renderPricing();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  // ---- User plan states ----

  describe('when user is on basic plan', () => {
    beforeEach(() => {
      mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test', plan: 'basic' };
    });

    it('shows the upgrade button for the Pro plan', () => {
      renderPricing();

      const upgradeButton = screen.getByRole('button', {
        name: /Suscribirse al Plan Pro/i,
      });
      expect(upgradeButton).toBeEnabled();
      expect(upgradeButton).toHaveTextContent('Comenzar ahora');
    });
  });

  describe('when user is on premium plan', () => {
    beforeEach(() => {
      mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test', plan: 'premium' };
    });

    it('shows "Tu plan actual" disabled button for Pro plan', () => {
      renderPricing();

      const currentPlanButton = screen.getByRole('button', {
        name: /Plan Pro - Tu plan actual/i,
      });
      expect(currentPlanButton).toBeDisabled();
      expect(currentPlanButton).toHaveTextContent('Tu plan actual');
    });

    it('does not show the upgrade button', () => {
      renderPricing();

      expect(
        screen.queryByRole('button', { name: /Suscribirse al Plan Pro/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when user is on pro plan', () => {
    beforeEach(() => {
      mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test', plan: 'pro' };
    });

    it('shows "Tu plan actual" disabled button for Pro plan', () => {
      renderPricing();

      const currentPlanButton = screen.getByRole('button', {
        name: /Plan Pro - Tu plan actual/i,
      });
      expect(currentPlanButton).toBeDisabled();
    });
  });

  describe('when user is null', () => {
    beforeEach(() => {
      mockUser = null;
    });

    it('shows the upgrade button (user not logged in or plan unknown)', () => {
      renderPricing();

      const upgradeButton = screen.getByRole('button', {
        name: /Suscribirse al Plan Pro/i,
      });
      expect(upgradeButton).toBeEnabled();
    });
  });

  // ---- handleUpgrade ----

  describe('handleUpgrade', () => {
    it('calls createCheckoutSession and redirects to the returned URL', async () => {
      const user = userEvent.setup();
      mockCreateCheckoutSession.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/session-123' });

      // Mock window.location.href
      const hrefSetter = vi.fn();
      const originalLocation = window.location;
      // Delete location and replace with a mock that tracks href assignment
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, href: '' },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window.location, 'href', {
        set: hrefSetter,
        get: () => '',
        configurable: true,
      });

      renderPricing();

      const upgradeButton = screen.getByRole('button', {
        name: /Suscribirse al Plan Pro/i,
      });
      await user.click(upgradeButton);

      await waitFor(() => {
        expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
      });

      expect(hrefSetter).toHaveBeenCalledWith('https://checkout.stripe.com/session-123');

      // Restore
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it('shows loading text while processing', async () => {
      const user = userEvent.setup();
      // Make the promise hang so we can observe the loading state
      let resolveCheckout: (value: { url: string }) => void;
      mockCreateCheckoutSession.mockReturnValueOnce(
        new Promise<{ url: string }>((resolve) => {
          resolveCheckout = resolve;
        }),
      );

      renderPricing();

      const upgradeButton = screen.getByRole('button', {
        name: /Suscribirse al Plan Pro/i,
      });
      await user.click(upgradeButton);

      // While loading, button text should change
      expect(screen.getByText('Procesando...')).toBeInTheDocument();

      // Resolve to clean up
      resolveCheckout!({ url: '' });
      await waitFor(() => {
        expect(screen.queryByText('Procesando...')).not.toBeInTheDocument();
      });
    });

    it('disables the upgrade button while loading', async () => {
      const user = userEvent.setup();
      let resolveCheckout: (value: { url: string }) => void;
      mockCreateCheckoutSession.mockReturnValueOnce(
        new Promise<{ url: string }>((resolve) => {
          resolveCheckout = resolve;
        }),
      );

      renderPricing();

      const upgradeButton = screen.getByRole('button', {
        name: /Suscribirse al Plan Pro/i,
      });
      await user.click(upgradeButton);

      // The button should now be disabled
      const buttons = screen.getAllByRole('button');
      const proButton = buttons.find((b) => b.textContent?.includes('Procesando...'));
      expect(proButton).toBeDisabled();

      resolveCheckout!({ url: '' });
      await waitFor(() => {
        expect(screen.queryByText('Procesando...')).not.toBeInTheDocument();
      });
    });

    it('does not redirect when URL is empty/falsy', async () => {
      const user = userEvent.setup();
      mockCreateCheckoutSession.mockResolvedValueOnce({ url: '' });

      const originalLocation = window.location;
      const hrefSetter = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { ...originalLocation, href: 'http://localhost/' },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window.location, 'href', {
        set: hrefSetter,
        get: () => 'http://localhost/',
        configurable: true,
      });

      renderPricing();

      const upgradeButton = screen.getByRole('button', {
        name: /Suscribirse al Plan Pro/i,
      });
      await user.click(upgradeButton);

      await waitFor(() => {
        expect(mockCreateCheckoutSession).toHaveBeenCalledTimes(1);
      });

      // href setter should NOT have been called since url is falsy
      expect(hrefSetter).not.toHaveBeenCalled();

      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it('shows error message when checkout session creation fails', async () => {
      const user = userEvent.setup();
      mockCreateCheckoutSession.mockRejectedValueOnce(new Error('Network error'));

      renderPricing();

      const upgradeButton = screen.getByRole('button', {
        name: /Suscribirse al Plan Pro/i,
      });
      await user.click(upgradeButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/Hubo un error al iniciar el proceso de pago/i),
      ).toBeInTheDocument();
    });

    it('clears previous error when retrying upgrade', async () => {
      const user = userEvent.setup();
      // First call fails
      mockCreateCheckoutSession.mockRejectedValueOnce(new Error('Network error'));

      renderPricing();

      const upgradeButton = screen.getByRole('button', {
        name: /Suscribirse al Plan Pro/i,
      });
      await user.click(upgradeButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Second call succeeds
      mockCreateCheckoutSession.mockResolvedValueOnce({ url: '' });
      await user.click(upgradeButton);

      // Error should be cleared during retry (setError(null) is called)
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('resets loading state after error', async () => {
      const user = userEvent.setup();
      mockCreateCheckoutSession.mockRejectedValueOnce(new Error('fail'));

      renderPricing();

      const upgradeButton = screen.getByRole('button', {
        name: /Suscribirse al Plan Pro/i,
      });
      await user.click(upgradeButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Button should be re-enabled after error
      const retryButton = screen.getByRole('button', {
        name: /Suscribirse al Plan Pro/i,
      });
      expect(retryButton).toBeEnabled();
      expect(retryButton).toHaveTextContent('Comenzar ahora');
    });
  });

  // ---- handleDebugUpgrade ----

  describe('handleDebugUpgrade (development mode)', () => {
    beforeEach(() => {
      // import.meta.env.MODE is 'test' in vitest by default, not 'development'.
      // The debug button is only rendered when import.meta.env.MODE === 'development'.
      vi.stubEnv('MODE', 'development');
    });

    it('renders the debug upgrade button in development mode for basic plan users', () => {
      renderPricing();

      const debugButton = screen.getByRole('button', {
        name: /Modo desarrollo - Actualizar a Pro sin pago/i,
      });
      expect(debugButton).toBeInTheDocument();
    });

    it('does not render the debug button for premium plan users', () => {
      mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test', plan: 'premium' };
      renderPricing();

      expect(
        screen.queryByRole('button', { name: /Modo desarrollo/i }),
      ).not.toBeInTheDocument();
    });

    it('does not render the debug button for pro plan users', () => {
      mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test', plan: 'pro' };
      renderPricing();

      expect(
        screen.queryByRole('button', { name: /Modo desarrollo/i }),
      ).not.toBeInTheDocument();
    });

    it('calls debugUpgrade and checkAuth on success, then shows alert', async () => {
      const user = userEvent.setup();
      mockDebugUpgrade.mockResolvedValueOnce({ message: 'upgraded' });
      mockCheckAuth.mockResolvedValueOnce(undefined);
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      renderPricing();

      const debugButton = screen.getByRole('button', {
        name: /Modo desarrollo - Actualizar a Pro sin pago/i,
      });
      await user.click(debugButton);

      await waitFor(() => {
        expect(mockDebugUpgrade).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockCheckAuth).toHaveBeenCalledTimes(1);
      });

      expect(alertSpy).toHaveBeenCalledWith('Plan actualizado a Premium (Modo Debug)');
      alertSpy.mockRestore();
    });

    it('shows error message when debug upgrade fails', async () => {
      const user = userEvent.setup();
      mockDebugUpgrade.mockRejectedValueOnce(new Error('debug fail'));

      renderPricing();

      const debugButton = screen.getByRole('button', {
        name: /Modo desarrollo - Actualizar a Pro sin pago/i,
      });
      await user.click(debugButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.getByText('Error al actualizar plan en modo debug.')).toBeInTheDocument();
    });

    it('disables the debug button while loading', async () => {
      const user = userEvent.setup();
      let resolveDebug: (value: { message: string }) => void;
      mockDebugUpgrade.mockReturnValueOnce(
        new Promise<{ message: string }>((resolve) => {
          resolveDebug = resolve;
        }),
      );

      renderPricing();

      const debugButton = screen.getByRole('button', {
        name: /Modo desarrollo - Actualizar a Pro sin pago/i,
      });
      await user.click(debugButton);

      // Debug button should be disabled during loading
      expect(debugButton).toBeDisabled();

      resolveDebug!({ message: 'done' });
      mockCheckAuth.mockResolvedValueOnce(undefined);
      vi.spyOn(window, 'alert').mockImplementation(() => {});

      await waitFor(() => {
        expect(debugButton).toBeEnabled();
      });
    });

    it('resets loading after debug upgrade error', async () => {
      const user = userEvent.setup();
      mockDebugUpgrade.mockRejectedValueOnce(new Error('fail'));

      renderPricing();

      const debugButton = screen.getByRole('button', {
        name: /Modo desarrollo - Actualizar a Pro sin pago/i,
      });
      await user.click(debugButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Debug button should be re-enabled
      expect(debugButton).toBeEnabled();
    });
  });

  describe('debug button visibility in non-development mode', () => {
    it('does not render the debug button in test/production mode', () => {
      // Default vitest MODE is 'test', not 'development'
      vi.stubEnv('MODE', 'test');
      renderPricing();

      expect(
        screen.queryByRole('button', { name: /Modo desarrollo/i }),
      ).not.toBeInTheDocument();
    });
  });

  // ---- Promo badge ----

  describe('promo badge', () => {
    it('displays the launch price promo badge', () => {
      renderPricing();

      expect(
        screen.getByText(/Precio de lanzamiento/),
      ).toBeInTheDocument();
    });

    it('displays the strikethrough original price', () => {
      renderPricing();

      expect(screen.getByText('$2,499')).toBeInTheDocument();
    });
  });
});
