import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuickClientModal } from './QuickClientModal';
import { clientService } from '../../../services/clientService';
import { logError } from '../../../lib/errorHandler';
import { useAuth } from '../../../contexts/AuthContext';

vi.mock('../../../services/clientService', () => ({
  clientService: {
    create: vi.fn(),
  },
}));

vi.mock('../../../lib/errorHandler', () => ({
  logError: vi.fn(),
}));

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  plan: 'basic',
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onClientCreated: vi.fn(),
};

describe('QuickClientModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
  });

  // =============================================
  // Rendering & Open/Close behavior
  // =============================================

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <QuickClientModal {...defaultProps} isOpen={false} />
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders the modal when isOpen is true', () => {
    render(<QuickClientModal {...defaultProps} />);

    expect(screen.getByText('Nuevo Cliente Rápido')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre Completo *')).toBeInTheDocument();
    expect(screen.getByLabelText('Teléfono *')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders with correct ARIA attributes', () => {
    render(<QuickClientModal {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'quick-client-modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'quick-client-modal-description');
  });

  it('calls onClose when the X button is clicked', () => {
    render(<QuickClientModal {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Cerrar modal'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the Cancelar button is clicked', () => {
    render(<QuickClientModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancelar'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the backdrop overlay', async () => {
    const user = userEvent.setup();
    render(<QuickClientModal {...defaultProps} />);

    // Click the overlay (the div with aria-hidden="true" sibling to dialog)
    const overlay = screen.getByRole('dialog').previousSibling as HTMLElement;
    expect(overlay).toBeTruthy();
    await user.click(overlay);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  // =============================================
  // Form validation
  // =============================================

  it('shows validation errors for empty required fields', async () => {
    render(<QuickClientModal {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Guardar cliente'));

    await waitFor(() => {
      expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('El teléfono debe tener al menos 10 dígitos')).toBeInTheDocument();
    });
  });

  it('shows validation error when name is too short', async () => {
    const user = userEvent.setup();
    render(<QuickClientModal {...defaultProps} />);

    await user.type(screen.getByLabelText('Nombre Completo *'), 'A');
    await user.type(screen.getByLabelText('Teléfono *'), '1234567890');
    fireEvent.click(screen.getByLabelText('Guardar cliente'));

    await waitFor(() => {
      expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument();
    });
  });

  it('shows validation error when phone is too short', async () => {
    const user = userEvent.setup();
    render(<QuickClientModal {...defaultProps} />);

    await user.type(screen.getByLabelText('Nombre Completo *'), 'Juan Perez');
    await user.type(screen.getByLabelText('Teléfono *'), '123');
    fireEvent.click(screen.getByLabelText('Guardar cliente'));

    await waitFor(() => {
      expect(screen.getByText('El teléfono debe tener al menos 10 dígitos')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<QuickClientModal {...defaultProps} />);

    await user.type(screen.getByLabelText('Nombre Completo *'), 'Juan Perez');
    await user.type(screen.getByLabelText('Teléfono *'), '1234567890');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    fireEvent.click(screen.getByLabelText('Guardar cliente'));

    await waitFor(() => {
      expect(screen.getByText('Email inválido')).toBeInTheDocument();
    });
  });

  it('sets aria-invalid on fields with errors', async () => {
    render(<QuickClientModal {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Guardar cliente'));

    await waitFor(() => {
      expect(screen.getByLabelText('Nombre Completo *')).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByLabelText('Teléfono *')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  // =============================================
  // Successful submission
  // =============================================

  it('creates a client and calls onClientCreated and onClose on success', async () => {
    const createdClient = {
      id: 'client-new',
      user_id: 'user-1',
      name: 'Maria Lopez',
      phone: '5551234567',
      email: 'maria@example.com',
      address: null,
      city: null,
      notes: null,
      total_events: 0,
      total_spent: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    (clientService.create as any).mockResolvedValue(createdClient);

    const user = userEvent.setup();
    render(<QuickClientModal {...defaultProps} />);

    await user.type(screen.getByLabelText('Nombre Completo *'), 'Maria Lopez');
    await user.type(screen.getByLabelText('Teléfono *'), '5551234567');
    await user.type(screen.getByLabelText('Email'), 'maria@example.com');
    fireEvent.click(screen.getByLabelText('Guardar cliente'));

    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalledWith({
        name: 'Maria Lopez',
        phone: '5551234567',
        email: 'maria@example.com',
        user_id: 'user-1',
      });
    });

    await waitFor(() => {
      expect(defaultProps.onClientCreated).toHaveBeenCalledWith(createdClient);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('sends email as null when email field is empty', async () => {
    const createdClient = {
      id: 'client-new',
      user_id: 'user-1',
      name: 'Juan Test',
      phone: '5559876543',
      email: null,
      address: null,
      city: null,
      notes: null,
      total_events: 0,
      total_spent: 0,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
    (clientService.create as any).mockResolvedValue(createdClient);

    const user = userEvent.setup();
    render(<QuickClientModal {...defaultProps} />);

    await user.type(screen.getByLabelText('Nombre Completo *'), 'Juan Test');
    await user.type(screen.getByLabelText('Teléfono *'), '5559876543');
    // Leave email empty
    fireEvent.click(screen.getByLabelText('Guardar cliente'));

    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalledWith({
        name: 'Juan Test',
        phone: '5559876543',
        email: null,
        user_id: 'user-1',
      });
    });
  });

  // =============================================
  // Loading state
  // =============================================

  it('shows loading state while creating client', async () => {
    // Make create hang to keep loading state visible
    let resolveCreate: (value: any) => void;
    (clientService.create as any).mockImplementation(
      () => new Promise((resolve) => { resolveCreate = resolve; })
    );

    const user = userEvent.setup();
    render(<QuickClientModal {...defaultProps} />);

    await user.type(screen.getByLabelText('Nombre Completo *'), 'Maria Lopez');
    await user.type(screen.getByLabelText('Teléfono *'), '5551234567');
    fireEvent.click(screen.getByLabelText('Guardar cliente'));

    await waitFor(() => {
      expect(screen.getByText('Guardando...')).toBeInTheDocument();
      expect(screen.getByLabelText('Guardando cliente...')).toBeDisabled();
    });

    // Resolve to clean up
    resolveCreate!({
      id: 'client-new',
      name: 'Maria Lopez',
      phone: '5551234567',
      email: null,
    });

    await waitFor(() => {
      expect(screen.queryByText('Guardando...')).not.toBeInTheDocument();
    });
  });

  // =============================================
  // Error handling
  // =============================================

  it('shows error message when creation fails with error.message', async () => {
    (clientService.create as any).mockRejectedValue(new Error('Servidor no disponible'));

    const user = userEvent.setup();
    render(<QuickClientModal {...defaultProps} />);

    await user.type(screen.getByLabelText('Nombre Completo *'), 'Maria Lopez');
    await user.type(screen.getByLabelText('Teléfono *'), '5551234567');
    fireEvent.click(screen.getByLabelText('Guardar cliente'));

    await waitFor(() => {
      expect(screen.getByText('Servidor no disponible')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(logError).toHaveBeenCalledWith(
      'Error creating quick client',
      expect.any(Error)
    );
  });

  it('shows default error message when error has no message', async () => {
    (clientService.create as any).mockRejectedValue({});

    const user = userEvent.setup();
    render(<QuickClientModal {...defaultProps} />);

    await user.type(screen.getByLabelText('Nombre Completo *'), 'Maria Lopez');
    await user.type(screen.getByLabelText('Teléfono *'), '5551234567');
    fireEvent.click(screen.getByLabelText('Guardar cliente'));

    await waitFor(() => {
      expect(screen.getByText('Error al crear el cliente')).toBeInTheDocument();
    });
  });

  it('does not call onClientCreated when service returns null/falsy', async () => {
    (clientService.create as any).mockResolvedValue(null);

    const user = userEvent.setup();
    render(<QuickClientModal {...defaultProps} />);

    await user.type(screen.getByLabelText('Nombre Completo *'), 'Maria Lopez');
    await user.type(screen.getByLabelText('Teléfono *'), '5551234567');
    fireEvent.click(screen.getByLabelText('Guardar cliente'));

    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalled();
    });

    expect(defaultProps.onClientCreated).not.toHaveBeenCalled();
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  // =============================================
  // Edge case: no user
  // =============================================

  it('does not submit when there is no authenticated user', async () => {
    (useAuth as any).mockReturnValue({ user: null });

    const user = userEvent.setup();
    render(<QuickClientModal {...defaultProps} />);

    await user.type(screen.getByLabelText('Nombre Completo *'), 'Maria Lopez');
    await user.type(screen.getByLabelText('Teléfono *'), '5551234567');
    fireEvent.click(screen.getByLabelText('Guardar cliente'));

    await waitFor(() => {
      expect(clientService.create).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // Button labels
  // =============================================

  it('renders Guardar button with the save icon by default', () => {
    render(<QuickClientModal {...defaultProps} />);

    expect(screen.getByText('Guardar')).toBeInTheDocument();
    expect(screen.getByLabelText('Guardar cliente')).toBeInTheDocument();
  });
});
