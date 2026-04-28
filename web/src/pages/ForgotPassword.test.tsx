import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { ForgotPassword } from './ForgotPassword';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

describe('ForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows validation error', async () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /enviar enlace|enviar instrucciones|forgot_password\.submit/i }));
    await waitFor(() => {
      expect(screen.getByText(/Email inválido/i)).toBeInTheDocument();
    });
  });

  it('shows success state after submit', async () => {
    (api.post as any).mockResolvedValue({ ok: true });
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar enlace|enviar instrucciones|forgot_password\.submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/¡Revisa tu correo|forgot_password\.success_title/i)).toBeInTheDocument();
    });
  });

  it('shows error on failure', async () => {
    (api.post as any).mockRejectedValue(new Error('Error al enviar el correo'));
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('tu@email.com'), {
      target: { value: 'ana@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /enviar enlace|enviar instrucciones|forgot_password\.submit/i }));

    await waitFor(() => {
      expect(screen.getByText('Error al enviar el correo')).toBeInTheDocument();
    });
  });
});
