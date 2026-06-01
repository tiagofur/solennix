import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { AccountDeletion } from './AccountDeletion';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    delete: vi.fn(),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: vi.fn(),
}));

const mockSignOut = vi.fn();
const mockAddToast = vi.fn();

describe('AccountDeletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({
      addToast: mockAddToast,
      toasts: [],
      removeToast: vi.fn(),
    } as any);
  });

  describe('Public View (Unauthenticated)', () => {
    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: null,
        signOut: mockSignOut,
      } as any);
    });

    it('renders static help layout with email support button', () => {
      render(
        <MemoryRouter>
          <AccountDeletion />
        </MemoryRouter>
      );

      // Verify static titles
      expect(screen.getByText('Eliminación de Cuenta')).toBeInTheDocument();
      expect(screen.getByText('Información sobre el proceso de borrado de datos en Solennix.')).toBeInTheDocument();
      
      // Verify mailto presence
      const emailBtn = screen.getByRole('link', { name: /Enviar solicitud a hola@creapolis\.dev/i });
      expect(emailBtn).toBeInTheDocument();
      expect(emailBtn).toHaveAttribute('href', expect.stringContaining('mailto:hola@creapolis.dev'));

      // Checkbox and delete button should not exist
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Confirmar y Eliminar mi Cuenta/i })).not.toBeInTheDocument();
    });
  });

  describe('Authenticated View (Logged In)', () => {
    const mockUser = {
      id: 'u-123',
      name: 'Jorge Perez',
      email: 'jorge@example.com',
    };

    beforeEach(() => {
      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        signOut: mockSignOut,
      } as any);
    });

    it('renders interactive self-service panel with checkbox', () => {
      render(
        <MemoryRouter>
          <AccountDeletion />
        </MemoryRouter>
      );

      // Verify interactive titles
      expect(screen.getByText('Portal de Auto-servicio de Eliminación')).toBeInTheDocument();
      expect(screen.getByText('Confirmá la eliminación de tu cuenta')).toBeInTheDocument();

      // Checkbox and delete button should exist
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();

      const deleteBtn = screen.getByRole('button', { name: /Confirmar y Eliminar mi Cuenta/i });
      expect(deleteBtn).toBeInTheDocument();
      expect(deleteBtn).toBeDisabled();
    });

    it('enables deletion button when checkbox is checked', () => {
      render(
        <MemoryRouter>
          <AccountDeletion />
        </MemoryRouter>
      );

      const checkbox = screen.getByRole('checkbox');
      const deleteBtn = screen.getByRole('button', { name: /Confirmar y Eliminar mi Cuenta/i });

      expect(deleteBtn).toBeDisabled();
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(deleteBtn).not.toBeDisabled();
    });

    it('handles successful self-deletion flow', async () => {
      const spySetTimeout = vi.spyOn(globalThis, 'setTimeout');
      vi.mocked(api.delete).mockResolvedValueOnce({ success: true });

      render(
        <MemoryRouter>
          <AccountDeletion />
        </MemoryRouter>
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const deleteBtn = screen.getByRole('button', { name: /Confirmar y Eliminar mi Cuenta/i });
      fireEvent.click(deleteBtn);

      expect(screen.getByText('Eliminando...')).toBeInTheDocument();
      expect(api.delete).toHaveBeenCalledWith('/users/me');

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith(
          'Tu cuenta ha sido bloqueada y programada para eliminación. Tu sesión se cerrará en breve.',
          'success'
        );
      });

      // Verify success screen is rendered
      expect(screen.getByText('¡Eliminación programada!')).toBeInTheDocument();
      expect(screen.getByText('Cerrando sesión...')).toBeInTheDocument();

      // Verify setTimeout was scheduled for 3000ms
      expect(spySetTimeout).toHaveBeenCalledWith(expect.any(Function), 3000);

      spySetTimeout.mockRestore();
    });

    it('handles api failure on self-deletion', async () => {
      vi.mocked(api.delete).mockRejectedValueOnce(new Error('Network Error deleting account'));

      render(
        <MemoryRouter>
          <AccountDeletion />
        </MemoryRouter>
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const deleteBtn = screen.getByRole('button', { name: /Confirmar y Eliminar mi Cuenta/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Network Error deleting account', 'error');
      });

      expect(screen.queryByText('¡Eliminación programada!')).not.toBeInTheDocument();
    });
  });
});
