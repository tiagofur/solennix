import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BulkActionBar } from './BulkActionBar';

describe('BulkActionBar', () => {
  it('renders nothing when count is 0', () => {
    const { container } = render(
      <BulkActionBar count={0} onClear={() => {}}>
        <button>Delete</button>
      </BulkActionBar>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the count when selection exists', () => {
    render(
      <BulkActionBar count={5} onClear={() => {}}>
        <button>Delete</button>
      </BulkActionBar>,
    );
    expect(screen.getByText(/5 seleccionados/)).toBeInTheDocument();
  });

  it('uses singular form for count of 1', () => {
    render(
      <BulkActionBar count={1} onClear={() => {}}>
        <button>Delete</button>
      </BulkActionBar>,
    );
    expect(screen.getByText(/1 seleccionado/)).toBeInTheDocument();
  });

  it('renders the provided actions', () => {
    render(
      <BulkActionBar count={3} onClear={() => {}}>
        <button>Export</button>
        <button>Delete</button>
      </BulkActionBar>,
    );
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onClear when the clear button is clicked', () => {
    const onClear = vi.fn();
    render(
      <BulkActionBar count={2} onClear={onClear}>
        <button>X</button>
      </BulkActionBar>,
    );
    fireEvent.click(screen.getByLabelText('Limpiar selección'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('is desktop-only (hidden below lg)', () => {
    const { container } = render(
      <BulkActionBar count={1} onClear={() => {}}>
        <button>X</button>
      </BulkActionBar>,
    );
    expect(container.firstChild).toHaveClass('hidden', 'lg:flex');
  });
});
