import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { RowActionMenu } from './RowActionMenu';

describe('RowActionMenu a11y', () => {
  const items = [
    { label: 'Editar', icon: Pencil, onClick: vi.fn() },
    { label: 'Eliminar', icon: Trash2, onClick: vi.fn(), variant: 'destructive' as const },
  ];

  it('supports Escape and arrow key navigation when open', () => {
    render(
      <MemoryRouter>
        <RowActionMenu items={items} />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: /acciones/i });
    fireEvent.click(trigger);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    const menuitems = screen.getAllByRole('menuitem');
    expect(menuitems.length).toBe(2);

    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('dismisses on Tab and restores focus to the trigger', () => {
    render(
      <MemoryRouter>
        <RowActionMenu items={items} />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: /acciones/i });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });
});
