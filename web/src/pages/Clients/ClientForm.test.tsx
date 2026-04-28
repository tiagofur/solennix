import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { ClientForm } from './ClientForm';
import { clientService } from '../../services/clientService';

const mockNavigate = vi.fn();
let mockParams: { id?: string } = {};

vi.mock('../../services/clientService', () => ({
  clientService: {
    getById: vi.fn(),
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    uploadPhoto: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../../lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback || 'Error'),
}));

vi.mock('../../hooks/useToast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
    removeToast: vi.fn(),
    toasts: [],
  }),
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
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
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
    (clientService.getById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it('shows validation errors for required fields', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(screen.getByText(/El nombre debe tener al menos 2 caracteres/i)).toBeInTheDocument();
      expect(screen.getByText(/El teléfono debe tener al menos 10 dígitos/i)).toBeInTheDocument();
    });
  });

  it('creates a new client', async () => {
    (clientService.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'new-1' });
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

    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(clientService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ana Perez',
          phone: '5551112222',
          email: 'ana@example.com',
          photo_url: null,
        }),
      );
    });
  });

  it('loads and updates an existing client', async () => {
    mockParams = { id: 'client-1' };
    (clientService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'client-1',
      name: 'Ana Perez',
      phone: '5551112222',
      email: 'ana@example.com',
      address: 'Calle 1',
      city: 'CDMX',
      notes: 'VIP',
    });
    (clientService.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const { container } = renderForm();

    await waitFor(() => {
      expect((container.querySelector('input[name="name"]') as HTMLInputElement).value).toBe('Ana Perez');
    });

    fireEvent.change(container.querySelector('input[name="phone"]')!, {
      target: { value: '5550000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(clientService.update).toHaveBeenCalledWith(
        'client-1',
        expect.objectContaining({
          name: 'Ana Perez',
          phone: '5550000000',
          photo_url: null,
        }),
      );
    });
  });

  it('normalizes empty email to null on update', async () => {
    mockParams = { id: 'client-1' };
    (clientService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'client-1',
      name: 'Ana Perez',
      phone: '5551112222',
      email: '',
      address: '',
      city: '',
      notes: '',
    });
    (clientService.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const { container } = renderForm();

    await waitFor(() => {
      expect((container.querySelector('input[name="name"]') as HTMLInputElement).value).toBe('Ana Perez');
    });

    fireEvent.click(screen.getByRole('button', { name: /Guardar|action\.save/i }));

    await waitFor(() => {
      expect(clientService.update).toHaveBeenCalledWith(
        'client-1',
        expect.objectContaining({ email: null }),
      );
    });
  });

  it('shows loading spinner when plan limits are loading', () => {
    mockPlanLimits = { ...mockPlanLimits, loading: true };
    renderForm();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows UpgradeBanner when client limit is reached on new form', () => {
    mockPlanLimits = { canCreateClient: false, clientsCount: 50, clientLimit: 50, loading: false };
    renderForm();
    expect(screen.getByText(/Límite de Clientes Alcanzado/i)).toBeInTheDocument();
  });

  it('navigates back when clicking Regresar on limit-reached view', () => {
    mockPlanLimits = { canCreateClient: false, clientsCount: 50, clientLimit: 50, loading: false };
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /Regresar a la página anterior|Volver|action\.back/i }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('does not show UpgradeBanner when editing an existing client even if limit reached', async () => {
    mockParams = { id: 'client-1' };
    mockPlanLimits = { canCreateClient: false, clientsCount: 50, clientLimit: 50, loading: false };
    (clientService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
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
    expect(screen.getByRole('heading', { name: 'Nuevo Cliente' })).toBeInTheDocument();
  });

  it('renders "Editar Cliente" heading when editing', async () => {
    mockParams = { id: 'client-1' };
    (clientService.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
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
      expect(screen.getByRole('heading', { name: 'Editar Cliente' })).toBeInTheDocument();
    });
  });

  it('navigates to /clients when clicking back arrow button', () => {
    const { container } = renderForm();
    fireEvent.click(container.querySelector('h1')!.previousElementSibling as Element);
    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });

  it('navigates to /clients when clicking Cancelar button', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: /Cancelar|action\.cancel/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/clients');
  });
});
