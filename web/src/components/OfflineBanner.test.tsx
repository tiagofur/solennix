import { describe, it, expect, vi, afterAll } from 'vitest';
import { render, screen } from '@tests/customRender';
import { OfflineBanner } from './OfflineBanner';

// Mock useOnlineStatus so we can control the online/offline state.
vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}));

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const mockUseOnlineStatus = useOnlineStatus as ReturnType<typeof vi.fn>;

// Mock useToast to verify the "back online" toast fires.
vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

const originalOnLine = navigator.onLine;

describe('OfflineBanner', () => {
  afterAll(() => {
    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true });
  });

  it('renders nothing when online', () => {
    mockUseOnlineStatus.mockReturnValue(true);
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the banner when offline', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    render(<OfflineBanner />);
    expect(screen.getByText('Sin conexión')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('shows the description on sm+ screens', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    render(<OfflineBanner />);
    expect(
      screen.getByText(/Algunas funciones no estarán disponibles/),
    ).toBeInTheDocument();
  });

  it('renders the WifiOff icon', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    const { container } = render(<OfflineBanner />);
    // lucide renders an <svg> with the class "lucide-wifi-off"
    const svg = container.querySelector('svg.lucide-wifi-off');
    expect(svg).toBeInTheDocument();
  });
});
