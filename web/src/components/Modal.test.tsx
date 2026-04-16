import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@tests/customRender';
import { Modal } from './Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'Test Modal',
    children: <p>Modal content</p>,
  };

  afterEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  it('does not render when closed', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders title and children when open', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Cerrar modal'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    // The backdrop is the sibling div with aria-hidden="true" before the dialog
    const backdrop = screen.getByRole('dialog').previousElementSibling as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when dialog content is clicked', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for non-Escape keys', () => {
    const onClose = vi.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('sets body overflow to hidden when open and restores the previous value on close', () => {
    const { rerender } = render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<Modal {...defaultProps} isOpen={false} />);
    // Restores whatever overflow was present before the modal mounted (empty
    // string in this test). Previously this hard-coded `unset`, which would
    // clobber any prior scroll lock set by a parent modal or other UI.
    expect(document.body.style.overflow).toBe('');
  });

  it('preserves an existing body overflow lock when opening and closing on top of it', () => {
    document.body.style.overflow = 'hidden';
    const { rerender, unmount } = render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');

    rerender(<Modal {...defaultProps} isOpen={false} />);
    // The outer lock must survive; we should not have reset it to 'unset'.
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    document.body.style.overflow = '';
  });

  it('applies correct max-width class for each size', () => {
    const sizes = ['sm', 'md', 'lg', 'xl', '2xl'] as const;
    const expectedClasses = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
    };

    for (const size of sizes) {
      const { unmount } = render(
        <Modal {...defaultProps} maxWidth={size} />
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog.className).toContain(expectedClasses[size]);
      unmount();
    }
  });

  it('defaults to max-w-md when no maxWidth is specified', () => {
    render(<Modal {...defaultProps} maxWidth={undefined} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('max-w-md');
  });

  it('sets aria-labelledby and aria-describedby when provided', () => {
    render(
      <Modal
        {...defaultProps}
        titleId="modal-title"
        descriptionId="modal-desc"
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'modal-desc');
  });

  it('has aria-modal="true"', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('renders the title with the titleId', () => {
    render(<Modal {...defaultProps} titleId="my-title" />);
    const title = screen.getByText('Test Modal');
    expect(title).toHaveAttribute('id', 'my-title');
  });
});
