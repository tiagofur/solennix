import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClientForm } from './ClientForm';
import { logError } from '../../lib/errorHandler';
import { clientService } from '../../services/clientService';

const mockNavigate = vi.fn();
let mockParams: { id?: string } = {};

vi.mock('../../services/clientService', () => ({
  clientService: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
}));

let mockPlanLimits = {
  canCreateClient: true,
  clientsCount: 5,
  clientLimit: 50,
  loading: false,
};

vi.mock('../../hooks/usePlanLimits', () => ({
  usePlanLimits: () => mockPlanLimits,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

const renderForm = () =>
  render(
    <MemoryRouter>
      <ClientForm />
    </MemoryRouter>
  );

describe('ClientForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = {};
    mockPlanLimits = {
      canCreateClient: true,
      clientsCount: 5,
      clientLimit: 50,
      loading: false,
    };
  });

  it('shows validation errors for required fields', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText(/El nombre debe tener al menos 2 caracteres/i)).toBeInTheDocument();
      expect(screen.getByText(/El teléfono debe tener al menos 10 dígitos/i)).toBeInTheDocument();
    });
  });

  it('creates a new client', async () => {
    (clientService.create as any).mockResolvedValue({});
    const { container } = renderForm();

    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: 'Ana Perez' },
    });
    fireEvent.change(container.querySelector('input[name="phone"]')!, {
      target: { value: '5551112222' },
    });
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'ana@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalledWith({
        name: 'Ana Perez',
        phone: '5551112222',
        email: 'ana@example.com',
        address: '',
        city: '',
        notes: '',
        user_id: 'user-1',
        photo_url: '',
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });

  it('loads and updates an existing client', async () => {
    mockParams = { id: 'client-1' };
    (clientService.getById as any).mockResolvedValue({
      id: 'client-1',
      name: 'Ana Perez',
      phone: '5551112222',
      email: 'ana@example.com',
      address: 'Calle 1',
      city: 'CDMX',
      notes: 'VIP',
    });
    (clientService.update as any).mockResolvedValue({});

    const { container } = renderForm();

    await waitFor(() => {
      expect((container.querySelector('input[name="name"]') as HTMLInputElement).value).toBe('Ana Perez');
    });

    fireEvent.change(container.querySelector('input[name="phone"]')!, {
      target: { value: '5550000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(clientService.update).toHaveBeenCalledWith('client-1', {
        name: 'Ana Perez',
        phone: '5550000000',
        email: 'ana@example.com',
        address: 'Calle 1',
        city: 'CDMX',
        notes: 'VIP',
      });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });

  it('shows error when client load fails', async () => {
    mockParams = { id: 'client-1' };
    (clientService.getById as any).mockResolvedValue(null);

    renderForm();

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar el cliente/i)).toBeInTheDocument();
    });
    expect(logError).toHaveBeenCalledWith('Error loading client', expect.any(Error));
  });

  it('shows error when save fails', async () => {
    (clientService.create as any).mockRejectedValueOnce(new Error('fail'));

    const { container } = renderForm();

    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: 'Ana Perez' },
    });
    fireEvent.change(container.querySelector('input[name="phone"]')!, {
      target: { value: '5551112222' },
    });

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText(/fail/i)).toBeInTheDocument();
    });
    expect(logError).toHaveBeenCalledWith('Error saving client', expect.any(Error));
  });

  it('normalizes empty email to null on update', async () => {
    mockParams = { id: 'client-1' };
    (clientService.getById as any).mockResolvedValue({
      id: 'client-1',
      name: 'Ana Perez',
      phone: '5551112222',
      email: '',
      address: '',
      city: '',
      notes: '',
    });
    (clientService.update as any).mockResolvedValue({});

    const { container } = renderForm();

    await waitFor(() => {
      expect((container.querySelector('input[name="name"]') as HTMLInputElement).value).toBe('Ana Perez');
    });

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(clientService.update).toHaveBeenCalledWith('client-1', {
        name: 'Ana Perez',
        phone: '5551112222',
        email: null,
        address: '',
        city: '',
        notes: '',
      });
    });
  });

  // ---------- NEW TESTS FOR COVERAGE ----------

  it('shows loading spinner when plan limits are loading', () => {
    mockPlanLimits = {
      canCreateClient: true,
      clientsCount: 0,
      clientLimit: 50,
      loading: true,
    };

    renderForm();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Cargando límites de plan...')).toBeInTheDocument();
  });

  it('shows UpgradeBanner when client limit is reached on new form', () => {
    mockPlanLimits = {
      canCreateClient: false,
      clientsCount: 50,
      clientLimit: 50,
      loading: false,
    };

    renderForm();

    expect(screen.getByText(/Límite de Clientes Alcanzado/i)).toBeInTheDocument();
    expect(screen.getByText('Regresar')).toBeInTheDocument();
  });

  it('navigates back when clicking Regresar on limit-reached view', () => {
    mockPlanLimits = {
      canCreateClient: false,
      clientsCount: 50,
      clientLimit: 50,
      loading: false,
    };

    renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Regresar a la página anterior/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('does not show UpgradeBanner when editing an existing client even if limit reached', async () => {
    mockParams = { id: 'client-1' };
    mockPlanLimits = {
      canCreateClient: false,
      clientsCount: 50,
      clientLimit: 50,
      loading: false,
    };
    (clientService.getById as any).mockResolvedValue({
      id: 'client-1',
      name: 'Ana Perez',
      phone: '5551112222',
      email: '',
      address: '',
      city: '',
      notes: '',
    });

    renderForm();

    await waitFor(() => {
      expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Límite de Clientes Alcanzado/i)).not.toBeInTheDocument();
  });

  it('renders "Nuevo Cliente" heading when creating', () => {
    renderForm();

    expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument();
  });

  it('renders "Editar Cliente" heading when editing', async () => {
    mockParams = { id: 'client-1' };
    (clientService.getById as any).mockResolvedValue({
      id: 'client-1',
      name: 'Ana Perez',
      phone: '5551112222',
      email: '',
      address: '',
      city: '',
      notes: '',
    });

    renderForm();

    await waitFor(() => {
      expect(screen.getByText('Editar Cliente')).toBeInTheDocument();
    });
  });

  it('navigates to /clients when clicking back arrow button', () => {
    renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Volver a la lista de clientes/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });

  it('navigates to /clients when clicking Cancelar button', () => {
    renderForm();

    fireEvent.click(screen.getByText('Cancelar'));
    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });

  it('renders all form fields with correct labels', () => {
    renderForm();

    expect(screen.getByLabelText(/Nombre Completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText(/Dirección/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ciudad/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notas/i)).toBeInTheDocument();
  });

  it('disables submit button while saving', async () => {
    let resolveCreate: (value: unknown) => void;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    (clientService.create as any).mockReturnValue(createPromise);

    const { container } = renderForm();

    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: 'Ana Perez' },
    });
    fireEvent.change(container.querySelector('input[name="phone"]')!, {
      target: { value: '5551112222' },
    });

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText('Guardando...')).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Guardando cliente/i });
    expect(submitBtn).toBeDisabled();

    resolveCreate!({});
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/clients');
    });
  });

  it('creates client with empty email as null', async () => {
    (clientService.create as any).mockResolvedValue({});
    const { container } = renderForm();

    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: 'Ana Perez' },
    });
    fireEvent.change(container.querySelector('input[name="phone"]')!, {
      target: { value: '5551112222' },
    });
    // Leave email empty (default)

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: null,
          photo_url: '',
        })
      );
    });
  });

  it('shows fallback error message when save fails without message', async () => {
    (clientService.create as any).mockRejectedValueOnce({});

    const { container } = renderForm();

    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: 'Ana Perez' },
    });
    fireEvent.change(container.querySelector('input[name="phone"]')!, {
      target: { value: '5551112222' },
    });

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error al guardar el cliente/i)).toBeInTheDocument();
    });
  });

  it('creates a client with all optional fields filled', async () => {
    (clientService.create as any).mockResolvedValue({});
    const { container } = renderForm();

    fireEvent.change(container.querySelector('input[name="name"]')!, {
      target: { value: 'Ana Perez' },
    });
    fireEvent.change(container.querySelector('input[name="phone"]')!, {
      target: { value: '5551112222' },
    });
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(container.querySelector('input[name="address"]')!, {
      target: { value: 'Calle Principal 123' },
    });
    fireEvent.change(container.querySelector('input[name="city"]')!, {
      target: { value: 'CDMX' },
    });
    fireEvent.change(container.querySelector('textarea[name="notes"]')!, {
      target: { value: 'Cliente VIP' },
    });

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalledWith({
        name: 'Ana Perez',
        phone: '5551112222',
        email: 'ana@example.com',
        address: 'Calle Principal 123',
        city: 'CDMX',
        notes: 'Cliente VIP',
        user_id: 'user-1',
        photo_url: '',
      });
    });
  });

  it('shows error when getById rejects with an error', async () => {
    mockParams = { id: 'client-1' };
    (clientService.getById as any).mockRejectedValueOnce(new Error('Network error'));

    renderForm();

    await waitFor(() => {
      expect(screen.getByText(/Error al cargar el cliente/i)).toBeInTheDocument();
    });
    expect(logError).toHaveBeenCalledWith('Error loading client', expect.any(Error));
  });

  it('renders email field with correct label and type', () => {
    const { container } = renderForm();

    const emailInput = container.querySelector('input[name="email"]');
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('sets aria-invalid on fields with errors', async () => {
    const { container } = renderForm();

    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => {
      expect(container.querySelector('input[name="name"]')).toHaveAttribute('aria-invalid', 'true');
      expect(container.querySelector('input[name="phone"]')).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
