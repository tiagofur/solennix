import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Settings } from './Settings';
import { logError } from '../lib/errorHandler';
import { subscriptionService } from '../services/subscriptionService';

const mockUpdateProfile = vi.fn();
const mockCheckAuth = vi.fn();
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
  useAuth: () => ({ user: mockUser, updateProfile: mockUpdateProfile, checkAuth: mockCheckAuth }),
}));

vi.mock('../lib/errorHandler', () => ({
  logError: vi.fn(),
}));

vi.mock('../services/subscriptionService', () => ({
  subscriptionService: {
    createPortalSession: vi.fn(),
    debugDowngrade: vi.fn(),
  },
}));

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

  it('renders profile details', () => {
    render(<Settings />);
    expect(screen.getByText('Configuración')).toBeInTheDocument();
    expect(screen.getByText('Ana Perez')).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByText('Básico')).toBeInTheDocument();
  });

  it('shows fallback business name when missing', () => {
    mockUser = {
      ...mockUser,
      business_name: '',
    };

    render(<Settings />);
    expect(screen.getByText(/No configurado/i)).toBeInTheDocument();
  });

  it('renders premium plan label without basic hint', () => {
    mockUser = {
      ...mockUser,
      plan: 'premium',
    };

    render(<Settings />);
    expect(screen.getByText('Pro / Premium')).toBeInTheDocument();
    expect(screen.queryByText(/plan básico/i)).not.toBeInTheDocument();
  });

  it('resets business name when profile updates', async () => {
    const { rerender } = render(<Settings />);

    mockUser = {
      ...mockUser,
      business_name: 'Eventos Actualizados',
    };

    rerender(<Settings />);

    await waitFor(() => {
      expect(screen.getByText('Eventos Actualizados')).toBeInTheDocument();
    });
  });

  it('updates business name', async () => {
    render(<Settings />);
    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    fireEvent.click(editButtons[0]);

    const input = screen.getByPlaceholderText(/Eventos Fantásticos/i);
    fireEvent.change(input, { target: { value: 'Eventos Nuevo' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ business_name: 'Eventos Nuevo' });
    });
  });

  it('cancels business name edit', () => {
    render(<Settings />);
    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    fireEvent.click(editButtons[0]);

    fireEvent.change(screen.getByPlaceholderText(/Eventos Fantásticos/i), {
      target: { value: 'Cambio' },
    });
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByPlaceholderText(/Eventos Fantásticos/i)).not.toBeInTheDocument();
  });

  it('logs error when updating business name fails', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('fail'));

    render(<Settings />);
    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    fireEvent.click(editButtons[0]);
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error updating business name', expect.any(Error));
    });
  });

  it('updates contract settings', async () => {
    render(<Settings />);
    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    fireEvent.click(editButtons[2]);

    fireEvent.change(screen.getByDisplayValue('40'), { target: { value: '55' } });
    fireEvent.change(screen.getByDisplayValue('10'), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByDisplayValue('5'), {
      target: { value: '15' },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        default_deposit_percent: 55,
        default_cancellation_days: 20,
        default_refund_percent: 15,
      });
    });
  });

  it('cancels contract settings edit', () => {
    render(<Settings />);
    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    fireEvent.click(editButtons[2]);

    fireEvent.change(screen.getByDisplayValue('40'), { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.getByText(/40%/i)).toBeInTheDocument();
  });

  it('logs error when updating contract settings fails', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('fail'));

    render(<Settings />);
    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    fireEvent.click(editButtons[2]);
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error updating contract settings', expect.any(Error));
    });
  });

  // --- Brand color tests ---

  it('saves brand color', async () => {
    render(<Settings />);
    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    // Brand color edit button is the second one (index 1)
    fireEvent.click(editButtons[1]);

    const hexInput = screen.getByLabelText(/código hexadecimal/i);
    fireEvent.change(hexInput, { target: { value: '#00FF00' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar color/i }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ brand_color: '#00FF00' });
    });
  });

  it('cancels brand color edit', () => {
    mockUser = { ...mockUser, brand_color: '#FF6B35' };
    render(<Settings />);
    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    fireEvent.click(editButtons[1]);

    const hexInput = screen.getByLabelText(/código hexadecimal/i);
    fireEvent.change(hexInput, { target: { value: '#000000' } });
    fireEvent.click(screen.getByRole('button', { name: /cancelar edición de color/i }));

    // Should revert and no longer show hex input
    expect(screen.queryByLabelText(/código hexadecimal/i)).not.toBeInTheDocument();
  });

  it('logs error when saving brand color fails', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('fail'));
    render(<Settings />);
    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    fireEvent.click(editButtons[1]);
    fireEvent.click(screen.getByRole('button', { name: /guardar color/i }));

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error updating brand color', expect.any(Error));
    });
  });

  it('updates brand color via color picker input', () => {
    render(<Settings />);
    const editButtons = screen.getAllByRole('button', { name: /editar/i });
    fireEvent.click(editButtons[1]);

    const colorPicker = screen.getByLabelText(/selector de color de marca/i);
    fireEvent.change(colorPicker, { target: { value: '#123456' } });

    const hexInput = screen.getByLabelText(/código hexadecimal/i) as HTMLInputElement;
    expect(hexInput.value).toBe('#123456');
  });

  // --- Logo upload tests ---

  it('uploads a valid logo file', async () => {
    const base64Result = 'data:image/png;base64,abc123';

    // Spy on FileReader prototype to intercept readAsDataURL
    const readAsDataURLSpy = vi.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function (this: FileReader) {
      // Simulate onloadend after readAsDataURL is called
      Object.defineProperty(this, 'result', { value: base64Result, writable: true });
      setTimeout(() => {
        if (this.onloadend) this.onloadend(new ProgressEvent('loadend') as ProgressEvent<FileReader>);
      }, 0);
    });

    render(<Settings />);
    const fileInput = screen.getByLabelText(/subir logo/i);
    const file = new File(['image-data'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 }); // 1MB

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(readAsDataURLSpy).toHaveBeenCalledWith(file);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ logo_url: base64Result });
    });

    readAsDataURLSpy.mockRestore();
  });

  it('shows alert for too-large logo file', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<Settings />);
    const fileInput = screen.getByLabelText(/subir logo/i);
    const file = new File(['x'], 'huge.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 3 * 1024 * 1024 }); // 3MB

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(alertSpy).toHaveBeenCalledWith('El archivo es demasiado grande (máximo 2MB).');
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('does nothing when logo upload has no file', () => {
    render(<Settings />);
    const fileInput = screen.getByLabelText(/subir logo/i);
    fireEvent.change(fileInput, { target: { files: [] } });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  // --- Toggle show business name tests ---

  it('toggles show business name in PDFs', async () => {
    mockUser = { ...mockUser, logo_url: 'data:image/png;base64,abc', show_business_name_in_pdf: true };
    render(<Settings />);

    const checkbox = screen.getByRole('checkbox', { name: /mostrar nombre comercial/i });
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ show_business_name_in_pdf: false });
    });
  });

  it('reverts show business name toggle on error', async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error('fail'));
    mockUser = { ...mockUser, logo_url: 'data:image/png;base64,abc', show_business_name_in_pdf: true };
    render(<Settings />);

    const checkbox = screen.getByRole('checkbox', { name: /mostrar nombre comercial/i });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error updating show business name toggle', expect.any(Error));
    });

    // Checkbox should be reverted to checked
    await waitFor(() => {
      expect(checkbox).toBeChecked();
    });
  });

  it('does not show toggle when no logo_url', () => {
    mockUser = { ...mockUser, logo_url: undefined };
    render(<Settings />);
    expect(screen.queryByRole('checkbox', { name: /mostrar nombre comercial/i })).not.toBeInTheDocument();
  });

  // --- Logo display tests ---

  it('shows logo image when logo_url is set', () => {
    mockUser = { ...mockUser, logo_url: 'data:image/png;base64,abc' };
    render(<Settings />);
    const img = screen.getByAltText('Logo de la empresa');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc');
  });

  it('shows placeholder when no logo_url', () => {
    mockUser = { ...mockUser, logo_url: undefined };
    render(<Settings />);
    expect(screen.queryByAltText('Logo de la empresa')).not.toBeInTheDocument();
  });

  // --- Manage subscription (portal) tests ---

  it('opens billing portal on manage subscription click', async () => {
    mockUser = { ...mockUser, plan: 'pro' };
    const mockCreatePortal = vi.mocked(subscriptionService.createPortalSession);
    mockCreatePortal.mockResolvedValueOnce({ url: 'https://billing.stripe.com/portal/123' });

    render(<Settings />);
    const manageBtn = screen.getByRole('button', { name: /abrir portal de gestión/i });
    fireEvent.click(manageBtn);

    await waitFor(() => {
      expect(mockCreatePortal).toHaveBeenCalled();
    });

    // After resolved, portal loading should be false (button no longer says "Abriendo portal...")
    await waitFor(() => {
      expect(screen.queryByText('Abriendo portal...')).not.toBeInTheDocument();
    });
  });

  it('shows portal error on manage subscription failure', async () => {
    mockUser = { ...mockUser, plan: 'pro' };
    const mockCreatePortal = vi.mocked(subscriptionService.createPortalSession);
    mockCreatePortal.mockRejectedValueOnce(new Error('no subscription'));

    render(<Settings />);
    const manageBtn = screen.getByRole('button', { name: /abrir portal de gestión/i });
    fireEvent.click(manageBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/No se pudo abrir el portal/);
    });
    expect(logError).toHaveBeenCalledWith('Error opening billing portal', expect.any(Error));
  });

  it('shows loading state for manage subscription button', async () => {
    mockUser = { ...mockUser, plan: 'pro' };
    let resolvePortal: (value: { url: string }) => void;
    const portalPromise = new Promise<{ url: string }>((resolve) => {
      resolvePortal = resolve;
    });
    const mockCreatePortal = vi.mocked(subscriptionService.createPortalSession);
    mockCreatePortal.mockReturnValueOnce(portalPromise);

    render(<Settings />);
    const manageBtn = screen.getByRole('button', { name: /abrir portal de gestión/i });
    fireEvent.click(manageBtn);

    await waitFor(() => {
      expect(screen.getByText('Abriendo portal...')).toBeInTheDocument();
    });

    // Resolve to clean up
    resolvePortal!({ url: '' });
    await waitFor(() => {
      expect(screen.queryByText('Abriendo portal...')).not.toBeInTheDocument();
    });
  });

  // --- Pro plan rendering ---

  it('renders pro plan section with manage subscription button', () => {
    mockUser = { ...mockUser, plan: 'pro' };
    render(<Settings />);
    expect(screen.getByText('Pro / Premium')).toBeInTheDocument();
    expect(screen.getByText(/Tienes acceso completo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir portal de gestión/i })).toBeInTheDocument();
  });

  it('shows basic plan description for basic users', () => {
    mockUser = { ...mockUser, plan: 'basic' };
    render(<Settings />);
    expect(screen.getByText(/plan básico tiene límites/)).toBeInTheDocument();
  });

  // --- Debug downgrade tests ---

  it('handles debug downgrade for pro users in development', async () => {
    // import.meta.env.MODE is 'test' by default in vitest, but the component checks for 'development'
    // We need to set the mode
    const originalMode = import.meta.env.MODE;
    import.meta.env.MODE = 'development';
    mockUser = { ...mockUser, plan: 'pro' };
    const mockDebugDowngrade = vi.mocked(subscriptionService.debugDowngrade);
    mockDebugDowngrade.mockResolvedValueOnce({ message: 'ok' });
    mockCheckAuth.mockResolvedValueOnce(undefined);

    render(<Settings />);
    const downgradeBtn = screen.getByRole('button', { name: /degradar plan a básico/i });
    fireEvent.click(downgradeBtn);

    await waitFor(() => {
      expect(mockDebugDowngrade).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalled();
    });

    import.meta.env.MODE = originalMode;
  });

  it('logs error when debug downgrade fails', async () => {
    const originalMode = import.meta.env.MODE;
    import.meta.env.MODE = 'development';
    mockUser = { ...mockUser, plan: 'pro' };
    const mockDebugDowngrade = vi.mocked(subscriptionService.debugDowngrade);
    mockDebugDowngrade.mockRejectedValueOnce(new Error('downgrade error'));

    render(<Settings />);
    const downgradeBtn = screen.getByRole('button', { name: /degradar plan a básico/i });
    fireEvent.click(downgradeBtn);

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error debug downgrade', expect.any(Error));
    });

    import.meta.env.MODE = originalMode;
  });

  it('shows "Ver planes" link for basic users in development', () => {
    const originalMode = import.meta.env.MODE;
    import.meta.env.MODE = 'development';
    mockUser = { ...mockUser, plan: 'basic' };

    render(<Settings />);
    const link = screen.getByRole('link', { name: /ver planes/i });
    expect(link).toHaveAttribute('href', '/pricing');

    import.meta.env.MODE = originalMode;
  });

  it('does not show debug buttons outside development mode', () => {
    // Default vitest MODE is 'test', not 'development'
    mockUser = { ...mockUser, plan: 'pro' };
    render(<Settings />);
    expect(screen.queryByRole('button', { name: /degradar plan/i })).not.toBeInTheDocument();
  });

  // --- Default brand color display ---

  it('displays default brand color when none is set', () => {
    mockUser = { ...mockUser, brand_color: undefined };
    render(<Settings />);
    expect(screen.getByText('#FF6B35')).toBeInTheDocument();
  });

  it('logs error when FileReader constructor throws during logo upload', async () => {
    const originalFileReader = globalThis.FileReader;
    // Make FileReader constructor throw to hit the outer catch block (lines 103-104)
    globalThis.FileReader = class {
      constructor() {
        throw new Error('FileReader not supported');
      }
    } as any;

    render(<Settings />);
    const fileInput = screen.getByLabelText(/subir logo/i);
    const file = new File(['img'], 'logo.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1024 }); // small enough

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(logError).toHaveBeenCalledWith('Error uploading logo', expect.any(Error));
    });

    globalThis.FileReader = originalFileReader;
  });
});
