import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { ResetPassword } from './ResetPassword';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

function renderWithToken(token?: string) {
  const initialEntries = token
    ? [`/reset-password?token=${token}`]
    : ['/reset-password'];
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ResetPassword />
    </MemoryRouter>
  );
}

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── No token state (invalid link) ──────────────────────────────────

  describe('when no token is present', () => {
    it('renders the invalid link message', () => {
      renderWithToken();
      expect(screen.getByText('Enlace inválido')).toBeInTheDocument();
      expect(
        screen.getByText(
          'El enlace para restablecer la contraseña no es válido o ha expirado.'
        )
      ).toBeInTheDocument();
    });

    it('shows a link to request a new reset link', () => {
      renderWithToken();
      const link = screen.getByRole('link', { name: /solicitar un nuevo enlace/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/forgot-password');
    });

    it('does not render the form', () => {
      renderWithToken();
      expect(screen.queryByLabelText(/nueva contraseña/i)).not.toBeInTheDocument();
    });
  });

  // ── Form rendering with token ──────────────────────────────────────

  describe('when token is present', () => {
    it('renders the password form', () => {
      renderWithToken('valid-token');
      expect(screen.getByRole('heading', { name: /restablecer contraseña/i })).toBeInTheDocument();
      expect(screen.getByText('Ingresa tu nueva contraseña')).toBeInTheDocument();
      expect(screen.getByLabelText('Nueva contraseña')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      ).toBeInTheDocument();
    });

    it('renders the back to login link', () => {
      renderWithToken('valid-token');
      const link = screen.getByRole('link', {
        name: /volver al inicio de sesión/i,
      });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/login');
    });

    it('renders password inputs with correct placeholders', () => {
      renderWithToken('valid-token');
      expect(screen.getByPlaceholderText('Mínimo 8 caracteres')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Repite tu contraseña')).toBeInTheDocument();
    });

    it('renders password inputs as type password', () => {
      renderWithToken('valid-token');
      expect(screen.getByLabelText('Nueva contraseña')).toHaveAttribute(
        'type',
        'password'
      );
      expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute(
        'type',
        'password'
      );
    });
  });

  // ── Validation ─────────────────────────────────────────────────────

  describe('validation', () => {
    it('shows error when password is too short', async () => {
      renderWithToken('valid-token');
      fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
        target: { value: 'abc' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'abc' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      );

      await waitFor(() => {
        expect(
          screen.getByText('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número')
        ).toBeInTheDocument();
      });
      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows error when passwords do not match', async () => {
      renderWithToken('valid-token');
      fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
        target: { value: 'Password1' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'Different1' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      );

      await waitFor(() => {
        expect(
          screen.getByText('Las contraseñas no coinciden')
        ).toBeInTheDocument();
      });
      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows error when both fields are empty', async () => {
      renderWithToken('valid-token');
      fireEvent.click(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      );

      await waitFor(() => {
        expect(
          screen.getByText('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número')
        ).toBeInTheDocument();
      });
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  // ── Successful submission ──────────────────────────────────────────

  describe('successful password reset', () => {
    it('calls the API with token and new password', async () => {
      (api.post as any).mockResolvedValue({ ok: true });
      renderWithToken('my-reset-token');

      fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      );

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
          token: 'my-reset-token',
          new_password: 'NewPass123',
        });
      });
    });

    it('shows success message after successful reset', async () => {
      (api.post as any).mockResolvedValue({ ok: true });
      renderWithToken('my-reset-token');

      fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      );

      await waitFor(() => {
        expect(
          screen.getByText('¡Contraseña actualizada!')
        ).toBeInTheDocument();
      });
      expect(
        screen.getByText(
          'Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión.'
        )
      ).toBeInTheDocument();
    });

    it('shows link to login after success', async () => {
      (api.post as any).mockResolvedValue({ ok: true });
      renderWithToken('my-reset-token');

      fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      );

      await waitFor(() => {
        expect(screen.getByText('¡Contraseña actualizada!')).toBeInTheDocument();
      });

      const loginLink = screen.getByRole('link', {
        name: /ir al inicio de sesión/i,
      });
      expect(loginLink).toHaveAttribute('href', '/login');
    });
  });

  // ── API error handling ─────────────────────────────────────────────

  describe('API error handling', () => {
    it('shows error message from Error instance', async () => {
      (api.post as any).mockRejectedValue(
        new Error('Token expirado o inválido')
      );
      renderWithToken('expired-token');

      fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      );

      await waitFor(() => {
        expect(
          screen.getByText('Token expirado o inválido')
        ).toBeInTheDocument();
      });
    });

    it('shows generic error when error is not an Error instance', async () => {
      (api.post as any).mockRejectedValue('some string error');
      renderWithToken('bad-token');

      fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      );

      await waitFor(() => {
        expect(
          screen.getByText('Error al restablecer la contraseña')
        ).toBeInTheDocument();
      });
    });

    it('clears previous error on new submission attempt', async () => {
      (api.post as any)
        .mockRejectedValueOnce(new Error('Error del servidor'))
        .mockResolvedValueOnce({ ok: true });
      renderWithToken('valid-token');

      const passwordInput = screen.getByLabelText('Nueva contraseña');
      const confirmInput = screen.getByLabelText('Confirmar contraseña');
      const submitButton = screen.getByRole('button', {
        name: /restablecer contraseña/i,
      });

      // First attempt - fails
      fireEvent.change(passwordInput, { target: { value: 'NewPass123' } });
      fireEvent.change(confirmInput, { target: { value: 'NewPass123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Error del servidor')).toBeInTheDocument();
      });

      // Second attempt - succeeds, error should be cleared
      fireEvent.change(passwordInput, { target: { value: 'NewPass456' } });
      fireEvent.change(confirmInput, { target: { value: 'NewPass456' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('¡Contraseña actualizada!')
        ).toBeInTheDocument();
      });
      expect(screen.queryByText('Error del servidor')).not.toBeInTheDocument();
    });

    it('displays the error in an alert role element', async () => {
      (api.post as any).mockRejectedValue(new Error('Error de red'));
      renderWithToken('valid-token');

      fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      );

      await waitFor(() => {
        const alerts = screen.getAllByRole('alert');
        const errorAlert = alerts.find((el) =>
          el.textContent?.includes('Error de red')
        );
        expect(errorAlert).toBeDefined();
      });
    });
  });

  // ── Submit button states ───────────────────────────────────────────

  describe('submit button behavior', () => {
    it('shows loading state while submitting', async () => {
      let resolvePost: (value: any) => void;
      (api.post as any).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePost = resolve;
          })
      );
      renderWithToken('valid-token');

      fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      );

      await waitFor(() => {
        expect(screen.getByText('Restableciendo...')).toBeInTheDocument();
      });
      expect(
        screen.getByRole('button', { name: /restableciendo/i })
      ).toBeDisabled();

      // Resolve and complete
      resolvePost!({ ok: true });
      await waitFor(() => {
        expect(
          screen.getByText('¡Contraseña actualizada!')
        ).toBeInTheDocument();
      });
    });
  });

  // ── Accessibility ──────────────────────────────────────────────────

  describe('accessibility', () => {
    it('marks password fields as aria-required', () => {
      renderWithToken('valid-token');
      expect(screen.getByLabelText('Nueva contraseña')).toHaveAttribute(
        'aria-required',
        'true'
      );
      expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute(
        'aria-required',
        'true'
      );
    });

    it('sets aria-invalid on password field when error is present', async () => {
      renderWithToken('valid-token');
      fireEvent.click(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Nueva contraseña')).toHaveAttribute(
          'aria-invalid',
          'true'
        );
      });
    });

    it('sets aria-invalid on confirmPassword field when mismatch', async () => {
      renderWithToken('valid-token');
      fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
        target: { value: 'Password1' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'Different1' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute(
          'aria-invalid',
          'true'
        );
      });
    });

    it('success view has a status role with polite aria-live', async () => {
      (api.post as any).mockResolvedValue({ ok: true });
      renderWithToken('valid-token');

      fireEvent.change(screen.getByLabelText('Nueva contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
        target: { value: 'NewPass123' },
      });
      fireEvent.click(
        screen.getByRole('button', { name: /restablecer contraseña/i })
      );

      await waitFor(() => {
        const status = screen.getByRole('status');
        expect(status).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});
