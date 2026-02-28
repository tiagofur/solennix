import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Register } from './Register';
import { api } from '../lib/api';

const mockCheckAuth = vi.fn();
const mockNavigate = vi.fn();
const mockThemeState = { theme: 'light' as string, toggleTheme: vi.fn() };

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ checkAuth: mockCheckAuth }),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => mockThemeState,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /crear cuenta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^nombre$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
  });

  it('shows validation errors', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));
    await waitFor(() => {
      expect(screen.getByText(/El nombre debe tener al menos 2 caracteres/i)).toBeInTheDocument();
      expect(screen.getByText(/Email inválido/i)).toBeInTheDocument();
    });
  });

  it('submits registration and navigates', async () => {
    (api.post as any).mockResolvedValue({ tokens: { access_token: 'token' } });
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: 'Ana Perez' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), {
      target: { value: 'password' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        name: 'Ana Perez',
        email: 'ana@example.com',
        password: 'password',
      });
    });
    expect(window.localStorage.setItem).toHaveBeenCalledWith('auth_token', 'token');
    expect(mockCheckAuth).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('shows error on failed registration', async () => {
    (api.post as any).mockRejectedValue(new Error('Fallo'));
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: 'Ana Perez' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), {
      target: { value: 'password' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText('Fallo')).toBeInTheDocument();
    });
  });

  it('shows fallback error message when err.message is empty', async () => {
    (api.post as any).mockRejectedValue({ message: '' });
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: 'Ana Perez' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), {
      target: { value: 'password' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText('Error al registrarse')).toBeInTheDocument();
    });
  });

  it('shows confirmPassword validation error when passwords do not match', async () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: 'Ana Perez' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), {
      target: { value: 'password' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    });

    const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
    expect(confirmInput).toHaveAttribute('aria-invalid', 'true');
    expect(confirmInput).toHaveAttribute('aria-describedby', 'confirmPassword-error');
  });

  it('shows loading state on submit button during registration', async () => {
    let resolvePost: (value: any) => void;
    (api.post as any).mockImplementation(
      () => new Promise((resolve) => { resolvePost = resolve; })
    );

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/^nombre$/i), {
      target: { value: 'Ana Perez' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^contraseña$/i), {
      target: { value: 'password' },
    });
    fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }));

    await waitFor(() => {
      expect(screen.getByText('Registrando...')).toBeInTheDocument();
    });
    const submitBtn = screen.getByRole('button', { name: /registrando/i });
    expect(submitBtn).toBeDisabled();

    resolvePost!({ tokens: { access_token: 'token' } });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });
});

describe('Register (dark theme)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThemeState.theme = 'dark';
  });

  afterEach(() => {
    mockThemeState.theme = 'light';
  });

  it('renders sun icon in dark mode', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /cambiar a modo claro/i })).toBeInTheDocument();
  });
});
