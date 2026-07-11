import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ContextMenu } from './ContextMenu';
import type { RowActionMenuItem } from './RowActionMenu';
import { Eye, Trash2 } from 'lucide-react';

// ContextMenu can render <Link> for href items, so wrap in a router.
const renderMenu = (props: React.ComponentProps<typeof ContextMenu>) =>
  render(
    <MemoryRouter>
      <ContextMenu {...props} />
    </MemoryRouter>,
  );

const items: RowActionMenuItem[] = [
  { label: 'Ver', icon: Eye, onClick: vi.fn() },
  { label: 'Eliminar', icon: Trash2, onClick: vi.fn(), variant: 'destructive' },
];

describe('ContextMenu', () => {
  it('renders all items at the given position', () => {
    renderMenu({ position: { x: 100, y: 200 }, items, onClose: () => {} });
    expect(screen.getByText('Ver')).toBeInTheDocument();
    expect(screen.getByText('Eliminar')).toBeInTheDocument();
  });

  it('calls onClick and onClose when an item is clicked', () => {
    const onClose = vi.fn();
    renderMenu({ position: { x: 100, y: 200 }, items, onClose });
    fireEvent.click(screen.getByText('Ver'));
    expect(items[0].onClick).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key', () => {
    const onClose = vi.fn();
    renderMenu({ position: { x: 100, y: 200 }, items, onClose });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on click outside', () => {
    const onClose = vi.fn();
    render(
      <div>
        <button>outside</button>
        <ContextMenu position={{ x: 100, y: 200 }} items={items} onClose={onClose} />
      </div>,
    );
    fireEvent.click(screen.getByText('outside'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders a separator before the destructive item', () => {
    renderMenu({ position: { x: 100, y: 200 }, items, onClose: () => {} });
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});
