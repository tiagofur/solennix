import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@tests/customRender';
import userEvent from '@testing-library/user-event';
import { act } from '@tests/customRender';
import { ToastContainer } from './ToastContainer';
import { useToast } from '../hooks/useToast';

describe('ToastContainer', () => {
  beforeEach(() => {
    // Clear all toasts before each test
    act(() => {
      const state = useToast.getState();
      state.toasts.forEach((t) => state.removeToast(t.id));
    });
  });

  it('renders nothing when there are no toasts', () => {
    render(<ToastContainer />);
    // The container div is always rendered but with no toast children
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders a success toast with role="status"', () => {
    act(() => {
      useToast.getState().addToast('Operación exitosa', 'success');
    });

    render(<ToastContainer />);
    const toast = screen.getByRole('status');
    expect(toast).toBeInTheDocument();
    expect(screen.getByText('Operación exitosa')).toBeInTheDocument();
  });

  it('renders an error toast with role="alert"', () => {
    act(() => {
      useToast.getState().addToast('Algo salió mal', 'error');
    });

    render(<ToastContainer />);
    const toast = screen.getByRole('alert');
    expect(toast).toBeInTheDocument();
    expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
  });

  it('renders an info toast with role="status"', () => {
    act(() => {
      useToast.getState().addToast('Información', 'info');
    });

    render(<ToastContainer />);
    const toast = screen.getByRole('status');
    expect(toast).toBeInTheDocument();
    expect(screen.getByText('Información')).toBeInTheDocument();
  });

  it('renders multiple toasts simultaneously', () => {
    act(() => {
      useToast.getState().addToast('Éxito', 'success');
      useToast.getState().addToast('Error ocurrido', 'error');
      useToast.getState().addToast('Info adicional', 'info');
    });

    render(<ToastContainer />);
    expect(screen.getByText('Éxito')).toBeInTheDocument();
    expect(screen.getByText('Error ocurrido')).toBeInTheDocument();
    expect(screen.getByText('Info adicional')).toBeInTheDocument();
  });

  it('renders close button with correct aria-label for each toast', () => {
    act(() => {
      useToast.getState().addToast('Toast cerrable', 'success');
    });

    render(<ToastContainer />);
    const closeButton = screen.getByLabelText('Cerrar notificación');
    expect(closeButton).toBeInTheDocument();
  });

  it('removes toast when close button is clicked', async () => {
    const user = userEvent.setup();

    act(() => {
      useToast.getState().addToast('Toast a cerrar', 'success');
    });

    const { rerender } = render(<ToastContainer />);
    expect(screen.getByText('Toast a cerrar')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Cerrar notificación'));

    rerender(<ToastContainer />);
    expect(screen.queryByText('Toast a cerrar')).not.toBeInTheDocument();
  });

  it('only removes the clicked toast, keeping others', async () => {
    const user = userEvent.setup();

    act(() => {
      useToast.getState().addToast('Mantener', 'success');
      useToast.getState().addToast('Eliminar', 'error');
    });

    const { rerender } = render(<ToastContainer />);
    const closeButtons = screen.getAllByLabelText('Cerrar notificación');

    // Click close on the second toast (error toast)
    await user.click(closeButtons[1]);

    rerender(<ToastContainer />);
    expect(screen.getByText('Mantener')).toBeInTheDocument();
    expect(screen.queryByText('Eliminar')).not.toBeInTheDocument();
  });

  it('applies correct style classes for success toast', () => {
    act(() => {
      useToast.getState().addToast('Success toast', 'success');
    });

    render(<ToastContainer />);
    const toast = screen.getByRole('status');
    expect(toast.className).toContain('bg-success/10');
    expect(toast.className).toContain('border-success/30');
  });

  it('applies correct style classes for error toast', () => {
    act(() => {
      useToast.getState().addToast('Error toast', 'error');
    });

    render(<ToastContainer />);
    const toast = screen.getByRole('alert');
    expect(toast.className).toContain('bg-error/10');
    expect(toast.className).toContain('border-error/30');
  });

  it('applies correct style classes for info toast', () => {
    act(() => {
      useToast.getState().addToast('Info toast', 'info');
    });

    render(<ToastContainer />);
    const toast = screen.getByRole('status');
    expect(toast.className).toContain('bg-info/10');
    expect(toast.className).toContain('border-info/30');
  });

  it('has aria-live="polite" on the container', () => {
    render(<ToastContainer />);
    const container = document.querySelector('[aria-live="polite"]');
    expect(container).toBeInTheDocument();
  });

  it('has aria-atomic="false" on the container', () => {
    render(<ToastContainer />);
    const container = document.querySelector('[aria-atomic="false"]');
    expect(container).toBeInTheDocument();
  });

  it('renders sr-only "Cerrar" text inside close button', () => {
    act(() => {
      useToast.getState().addToast('Test toast', 'success');
    });

    render(<ToastContainer />);
    expect(screen.getByText('Cerrar')).toBeInTheDocument();
  });
});
