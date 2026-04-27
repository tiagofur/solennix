import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@tests/customRender';
import { CommandPalette } from './CommandPalette';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe('CommandPalette', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderPalette = (props = {}) =>
    render(<CommandPalette {...defaultProps} {...props} />);

  it('does not render when closed', () => {
    renderPalette({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders search input and dialog when open', () => {
    renderPalette();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar comandos')).toBeInTheDocument();
  });

  it('renders quick actions and navigation items by default', () => {
    renderPalette();
    expect(screen.getByText('Nuevo Evento')).toBeInTheDocument();
    expect(screen.getByText('Nuevo Cliente')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Calendario')).toBeInTheDocument();
  });

  it('renders grouped sections', () => {
    renderPalette();
    expect(screen.getByText('Acciones Rápidas')).toBeInTheDocument();
    expect(screen.getByText('Navegación')).toBeInTheDocument();
  });

  it('filters items based on query', () => {
    renderPalette();
    const input = screen.getByLabelText('Buscar comandos');

    fireEvent.change(input, { target: { value: 'calendario' } });

    expect(screen.getByText('Calendario')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Nuevo Evento')).not.toBeInTheDocument();
  });

  it('shows fallback search when no results match but query exists', () => {
    renderPalette();
    const input = screen.getByLabelText('Buscar comandos');

    fireEvent.change(input, { target: { value: 'zzzznoresults' } });

    // When query exists but no matches, shows fallback search instead of empty state
    expect(screen.getByText(/Buscar "zzzznoresults" en toda la app/)).toBeInTheDocument();
    expect(screen.queryByText('No se encontraron resultados')).not.toBeInTheDocument();
  });

  it('shows fallback search option when query has no matches', () => {
    renderPalette();
    const input = screen.getByLabelText('Buscar comandos');

    fireEvent.change(input, { target: { value: 'xyznoresults' } });

    expect(screen.getByText(/Buscar "xyznoresults" en toda la app/)).toBeInTheDocument();
  });

  it('navigates and closes when a quick action is clicked', () => {
    const onClose = vi.fn();
    renderPalette({ onClose });

    fireEvent.click(screen.getByText('Nuevo Evento'));

    expect(mockNavigate).toHaveBeenCalledWith('/events/new');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates and closes when a nav item is clicked', () => {
    const onClose = vi.fn();
    renderPalette({ onClose });

    fireEvent.click(screen.getByText('Dashboard'));

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click (clicking the outer dialog)', () => {
    const onClose = vi.fn();
    renderPalette({ onClose });

    // The outer div has role="dialog" and onClick={onClose}
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when inner content is clicked', () => {
    const onClose = vi.fn();
    renderPalette({ onClose });

    // The inner content div has stopPropagation
    const innerContent = screen.getByRole('dialog').firstElementChild as HTMLElement;
    fireEvent.click(innerContent);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape key globally', () => {
    const onClose = vi.fn();
    renderPalette({ onClose });

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates to fallback search on Enter when no matches', () => {
    const onClose = vi.fn();
    renderPalette({ onClose });

    const input = screen.getByLabelText('Buscar comandos');
    fireEvent.change(input, { target: { value: 'xyznoresults' } });

    // The onKeyDown handler is on the inner content div
    const innerContent = screen.getByRole('dialog').firstElementChild as HTMLElement;
    fireEvent.keyDown(innerContent, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/search?q=xyznoresults');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('navigates on Enter when a result is active', () => {
    const onClose = vi.fn();
    renderPalette({ onClose });

    // First item (Nuevo Evento) is active by default
    const innerContent = screen.getByRole('dialog').firstElementChild as HTMLElement;
    fireEvent.keyDown(innerContent, { key: 'Enter' });

    expect(mockNavigate).toHaveBeenCalledWith('/events/new');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cycles through items with ArrowDown and ArrowUp', () => {
    renderPalette();

    const innerContent = screen.getByRole('dialog').firstElementChild as HTMLElement;

    // Press ArrowDown — active moves to second item
    fireEvent.keyDown(innerContent, { key: 'ArrowDown' });

    // Press ArrowUp — active moves back to first
    fireEvent.keyDown(innerContent, { key: 'ArrowUp' });

    // No crash = success. The active index cycles correctly.
    expect(screen.getByText('Nuevo Evento')).toBeInTheDocument();
  });

  it('resets query and active index when reopened', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <CommandPalette isOpen={true} onClose={onClose} />
    );

    const input = screen.getByLabelText('Buscar comandos');
    fireEvent.change(input, { target: { value: 'test' } });

    // Close
    rerender(<CommandPalette isOpen={false} onClose={onClose} />);

    // Reopen
    rerender(<CommandPalette isOpen={true} onClose={onClose} />);

    // Query should be reset
    const newInput = screen.getByLabelText('Buscar comandos') as HTMLInputElement;
    expect(newInput.value).toBe('');
  });

  it('renders footer keyboard hints', () => {
    renderPalette();
    expect(screen.getByText(/navegar/)).toBeInTheDocument();
    expect(screen.getByText(/seleccionar/)).toBeInTheDocument();
    expect(screen.getByText(/cerrar/)).toBeInTheDocument();
  });
});
