import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Login } from './Login';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../hooks/useTheme', () => ({
  useTheme: vi.fn(),
}));

const renderLogin = () =>
  render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ checkAuth: vi.fn() });
    (useTheme as any).mockReturnValue({ theme: 'light', toggleTheme: vi.fn() });
  });

  it('renders the form', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i, { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('shows validation errors', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
  });

  it('submits credentials', async () => {
    (api.post as any).mockResolvedValue({ tokens: { access_token: 'token' } });
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i, { selector: 'input' }), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: 'input' }), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password',
      });
    });
  });

  it('handles API error response', async () => {
    (api.post as any).mockRejectedValue(new Error('Credenciales incorrectas'));
    renderLogin();

    fireEvent.change(screen.getByLabelText(/email/i, { selector: 'input' }), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i, { selector: 'input' }), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(screen.getByText(/Credenciales incorrectas/i)).toBeInTheDocument();
    });
  });

  it('toggles theme from header button', () => {
    const toggleTheme = vi.fn();
    (useTheme as any).mockReturnValue({ theme: 'light', toggleTheme });

    renderLogin();
    fireEvent.click(screen.getByLabelText('Cambiar a modo oscuro'));
    expect(toggleTheme).toHaveBeenCalled();
  });

  it('renders dark theme toggle state', () => {
    (useTheme as any).mockReturnValue({ theme: 'dark', toggleTheme: vi.fn() });

    renderLogin();
    expect(screen.getByLabelText('Cambiar a modo claro')).toBeInTheDocument();
  });
});
