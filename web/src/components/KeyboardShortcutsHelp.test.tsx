import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@tests/customRender';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';

describe('KeyboardShortcutsHelp', () => {
  const shortcuts = [
    { key: 'g d', label: 'G D', description: 'Ir al Dashboard' },
    { key: 'n', label: 'N', description: 'Crear nuevo (contextual)' },
    { key: '?', label: '?', description: 'Mostrar atajos de teclado' },
  ];

  it('does not render when closed', () => {
    render(
      <KeyboardShortcutsHelp
        open={false}
        onClose={vi.fn()}
        shortcuts={shortcuts}
      />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders modal sections and shortcut rows when open', () => {
    render(
      <KeyboardShortcutsHelp
        open={true}
        onClose={vi.fn()}
        shortcuts={shortcuts}
        currentSection="events"
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Ir al Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Crear nuevo (contextual)')).toBeInTheDocument();
    // jsdom defaults to an empty string platform — non-Mac → Ctrl K (#886)
    expect(screen.getByText('CtrlK')).toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('shows ⌘K on Mac platform', () => {
    const originalPlatform = navigator.platform;
    Object.defineProperty(navigator, 'platform', { value: 'MacIntel', configurable: true });

    render(
      <KeyboardShortcutsHelp
        open={true}
        onClose={vi.fn()}
        shortcuts={shortcuts}
      />,
    );

    expect(screen.getByText('⌘K')).toBeInTheDocument();
    Object.defineProperty(navigator, 'platform', { value: originalPlatform, configurable: true });
  });

  it('shows CtrlK on Windows platform', () => {
    const originalPlatform = navigator.platform;
    Object.defineProperty(navigator, 'platform', { value: 'Win32', configurable: true });

    render(
      <KeyboardShortcutsHelp
        open={true}
        onClose={vi.fn()}
        shortcuts={shortcuts}
      />,
    );

    expect(screen.getByText('CtrlK')).toBeInTheDocument();
    Object.defineProperty(navigator, 'platform', { value: originalPlatform, configurable: true });
  });

  it('falls back to raw section key when label mapping does not exist', () => {
    render(
      <KeyboardShortcutsHelp
        open={true}
        onClose={vi.fn()}
        shortcuts={shortcuts}
        currentSection="clients"
      />,
    );

    expect(screen.getByText('clients')).toBeInTheDocument();
  });

  it('calls onClose on overlay and close button click', () => {
    const onClose = vi.fn();
    const { container } = render(
      <KeyboardShortcutsHelp
        open={true}
        onClose={onClose}
        shortcuts={shortcuts}
      />,
    );

    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay!);
    expect(onClose).toHaveBeenCalledTimes(1);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});