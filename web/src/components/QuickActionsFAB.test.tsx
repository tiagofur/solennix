import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { QuickActionsFAB } from './QuickActionsFAB';

const mockLocation = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockLocation(),
  };
});

const renderFAB = () =>
  render(
    <MemoryRouter>
      <QuickActionsFAB />
    </MemoryRouter>
  );

describe('QuickActionsFAB', () => {
  it('uses smartphone-only responsive classes', () => {
    mockLocation.mockReturnValue({ pathname: '/dashboard' });

    const { container } = renderFAB();
    const fabContainer = container.querySelector('.fixed.bottom-24.right-5');

    expect(fabContainer).toBeInTheDocument();
    expect(fabContainer?.className).toContain('md:hidden');
    expect(fabContainer?.className).not.toContain('lg:hidden');
  });

  it('renders backdrop with smartphone-only responsive classes when open', () => {
    mockLocation.mockReturnValue({ pathname: '/dashboard' });

    const { container } = renderFAB();
    fireEvent.click(screen.getByRole('button', { name: /acciones rápidas/i }));

    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).toBeInTheDocument();
    expect(backdrop?.className).toContain('md:hidden');
    expect(backdrop?.className).not.toContain('lg:hidden');
  });

  it('hides itself on excluded routes', () => {
    mockLocation.mockReturnValue({ pathname: '/events/new' });

    const { container } = renderFAB();
    expect(container.firstChild).toBeNull();
  });
});