import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Settings } from './Settings';
import { logError } from '../lib/errorHandler';
import { subscriptionService } from '../services/subscriptionService';

const mockUpdateProfile = vi.fn();
let mockUser: Record<string, unknown> = {
  id: '1',
  name: 'Ana Perez',
  email: 'ana@example.com',
  plan: 'basic',
  business_name: 'Eventos Ana',
  default_deposit_percent: 40,
  default_cancellation_days: 10,
  default_refund_percent: 5,
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, updateProfile: mockUpdateProfile }),
}));

vi.mock('../hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({
    eventsThisMonth: 3,
    limit: 5,
    clientsCount: 8,
    clientLimit: 10,
    isBasicPlan: (mockUser as any).plan !== 'pro',
  }),
}));

vi.mock('../lib/errorHandler', () => ({
  logError: vi.fn(),
}));

vi.mock('../services/subscriptionService', () => ({
  subscriptionService: {
    createPortalSession: vi.fn(),
  },
}));

const renderSettings = () =>
  render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>
  );

const clickTab = (name: string) => {
  fireEvent.click(screen.getByRole('tab', { name: new RegExp(name, 'i') }));
};

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: '1',
      name: 'Ana Perez',
      email: 'ana@example.com',
      plan: 'basic',
      business_name: 'Eventos Ana',
      default_deposit_percent: 40,
      default_cancellation_days: 10,
      default_refund_percent: 5,
    };
  });

  // --- Profile tab (default) ---

  it('renders profile details', () => {
    renderSettings();
    expect(screen.getByText('Configuración')).toBeInTheDocument();
    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
  });

  it('renders all tab buttons', () => {
    renderSettings();
    expect(screen.getByRole('tab', { name: /Mi Cuenta/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Mi Negocio/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Contratos/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Suscripción/i })).toBeInTheDocument();
  });

  // --- Business tab ---

  it('shows fallback business name when missing', () => {
    mockUser = { ...mockUser, business_name: '' };
    renderSettings();
    clickTab('Mi Negocio');
    expect(screen.getByText(/No configurado/i)).toBeInTheDocument();
  });

  it('resets business name when profile updates', async () => {
    const { rerender } = render(
      <MemoryRouter><Settings /></MemoryRouter>
    );
    clickTab('Mi Negocio');

    mockUser = { ...mockUser, business_name: 'Eventos Actualizados' };
    rerender(<MemoryRouter><Settings /></MemoryRouter>);

    await waitFor(() => {
      expect(screen.getByText('Eventos Actualizados')).toBeInTheDocument();
    });
  });

  it('updates business name', async () => {
    renderSettings();
    clickTab('Mi Negocio');

    fireEvent.click(screen.getByText('Editar'));

    const input = screen.getByPlaceholderText(/Mi Evento Pro/i);
    fireEvent.change(input, { target: { value: 'Eventos Nuevo' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ business_name: 'Eventos Nuevo' });
    });
  });

  it('cancels business name edit', () => {
    renderSettings();
    clickTab('Mi Negocio');
    fireEvent.click(screen.getByText('Editar'));

    fireEvent.change(screen.getByPlaceholderText(/Mi Evento Pro/i), {
      target: { value: 'Cambio' },
    });
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByPlaceholderText(/Mi Evento Pro/i)).not.toBeInTheDocument();
  });

  it('logs error when updating business name fails', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('fail'));
    renderSettings();
    clickTab('Mi Negocio');
    fireEvent.click(screen.getByText('Editar'));
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error updating business name', expect.any(Error));
    });
  });

  // --- Brand color tests ---

  it('displays default brand color when none is set', () => {
    mockUser = { ...mockUser, brand_color: undefined };
    renderSettings();
    clickTab('Mi Negocio');
    expect(screen.getByText('#FF6B35')).toBeInTheDocument();
  });

  it('updates brand color via color picker', async () => {
    renderSettings();
    clickTab('Mi Negocio');

    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
    expect(colorInput).toBeTruthy();
    expect(colorInput.value).toBe('#ff6b35');

    await act(async () => {
      fireEvent.change(colorInput, { target: { value: '#00ff00' } });
    });

    expect(colorInput.value).toBe('#00ff00');
  });

  it('saves brand color on blur', async () => {
    renderSettings();
    clickTab('Mi Negocio');

    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
    expect(colorInput).toBeTruthy();
    fireEvent.change(colorInput, { target: { value: '#123456' } });
    fireEvent.blur(colorInput);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ brand_color: '#123456' });
    });
  });

  it('logs error when saving brand color fails', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('fail'));
    renderSettings();
    clickTab('Mi Negocio');

    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
    expect(colorInput).toBeTruthy();
    fireEvent.blur(colorInput);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error updating brand color', expect.any(Error));
    });
  });

  // --- Logo upload tests ---

  it('uploads a valid logo file', async () => {
    const base64Result = 'data:image/png;base64,abc123';
    const readAsDataURLSpy = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      Object.defineProperty(this, 'result', { value: base64Result, writable: true });
      setTimeout(() => {
        if (this.onloadend) this.onloadend(new ProgressEvent('loadend') as ProgressEvent<FileReader>);
      }, 0);
    });

    renderSettings();
    clickTab('Mi Negocio');

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['image-data'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(readAsDataURLSpy).toHaveBeenCalledWith(file);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ logo_url: base64Result });
    });

    readAsDataURLSpy.mockRestore();
  });

  it('shows alert for too-large logo file', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderSettings();
    clickTab('Mi Negocio');

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 3 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(alertSpy).toHaveBeenCalledWith('El archivo es demasiado grande (máximo 2MB).');
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('does nothing when logo upload has no file', () => {
    renderSettings();
    clickTab('Mi Negocio');

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('shows logo image when logo_url is set', () => {
    mockUser = { ...mockUser, logo_url: 'data:image/png;base64,abc' };
    renderSettings();
    clickTab('Mi Negocio');

    const img = screen.getByAltText('Logo');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc');
  });

  it('logs error when FileReader constructor throws during logo upload', async () => {
    const originalFileReader = globalThis.FileReader;
    globalThis.FileReader = class {
      constructor() {
        throw new Error('FileReader not supported');
      }
    } as any;

    renderSettings();
    clickTab('Mi Negocio');

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1024 });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error uploading logo', expect.any(Error));
    });

    globalThis.FileReader = originalFileReader;
  });

  // --- Contract settings tests ---

  it('updates contract settings', async () => {
    renderSettings();
    clickTab('Contratos');

    fireEvent.change(screen.getByDisplayValue('40'), { target: { value: '55' } });
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: '20' } });
    fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        default_deposit_percent: 55,
        default_cancellation_days: 20,
        default_refund_percent: 15,
      });
    });
  });

  it('logs error when updating contract settings fails', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('fail'));
    renderSettings();
    clickTab('Contratos');
    fireEvent.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error updating contract settings', expect.any(Error));
    });
  });

  // --- Subscription tab ---

  it('shows plan name on subscription tab', () => {
    renderSettings();
    clickTab('Suscripción');
    expect(screen.getByText('basic')).toBeInTheDocument();
    expect(screen.getByText('Plan Actual')).toBeInTheDocument();
  });

  it('shows upgrade link for basic users', () => {
    renderSettings();
    clickTab('Suscripción');
    expect(screen.getByRole('link', { name: /subir a pro/i })).toBeInTheDocument();
  });

  it('does not show upgrade link for pro users', () => {
    mockUser = { ...mockUser, plan: 'pro' };
    renderSettings();
    clickTab('Suscripción');
    expect(screen.queryByRole('link', { name: /subir a pro/i })).not.toBeInTheDocument();
  });

  it('shows basic plan description for basic users', () => {
    renderSettings();
    clickTab('Suscripción');
    expect(screen.getByText(/Potencia tu negocio con el plan Pro/)).toBeInTheDocument();
  });

  it('shows pro plan description for pro users', () => {
    mockUser = { ...mockUser, plan: 'pro' };
    renderSettings();
    clickTab('Suscripción');
    expect(screen.getByText(/Disfrutas de acceso ilimitado/)).toBeInTheDocument();
  });

  it('shows usage stats on subscription tab', () => {
    renderSettings();
    clickTab('Suscripción');
    expect(screen.getByText('Uso de este mes')).toBeInTheDocument();
    expect(screen.getByText('Eventos este mes')).toBeInTheDocument();
    expect(screen.getByText('Clientes totales')).toBeInTheDocument();
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
    expect(screen.getByText('8 / 10')).toBeInTheDocument();
  });

  // --- Manage subscription (portal) tests ---

  it('opens billing portal on manage subscription click', async () => {
    mockUser = { ...mockUser, plan: 'pro' };
    const mockCreatePortal = vi.mocked(subscriptionService.createPortalSession);
    mockCreatePortal.mockResolvedValueOnce({ url: 'https://billing.stripe.com/portal/123' });

    renderSettings();
    clickTab('Suscripción');

    const manageBtn = screen.getByRole('button', { name: /gestionar/i });
    fireEvent.click(manageBtn);

    await waitFor(() => {
      expect(mockCreatePortal).toHaveBeenCalled();
    });
  });

  it('shows portal error on manage subscription failure', async () => {
    mockUser = { ...mockUser, plan: 'pro' };
    const mockCreatePortal = vi.mocked(subscriptionService.createPortalSession);
    mockCreatePortal.mockRejectedValueOnce(new Error('no subscription'));

    renderSettings();
    clickTab('Suscripción');

    const manageBtn = screen.getByRole('button', { name: /gestionar/i });
    fireEvent.click(manageBtn);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error opening billing portal', expect.any(Error));
    });
  });

  it('shows loading state for manage subscription button', async () => {
    mockUser = { ...mockUser, plan: 'pro' };
    let resolvePortal: (value: { url: string }) => void;
    const portalPromise = new Promise<{ url: string }>((resolve) => {
      resolvePortal = resolve;
    });
    const mockCreatePortal = vi.mocked(subscriptionService.createPortalSession);
    mockCreatePortal.mockReturnValueOnce(portalPromise);

    renderSettings();
    clickTab('Suscripción');

    fireEvent.click(screen.getByRole('button', { name: /gestionar/i }));

    await waitFor(() => {
      expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });

    resolvePortal!({ url: '' });
    await waitFor(() => {
      expect(screen.queryByText('Cargando...')).not.toBeInTheDocument();
    });
  });
});
