import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@tests/customRender';
import { MemoryRouter } from 'react-router-dom';
import { BottomTabBar } from './BottomTabBar';

const mockLocation = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useLocation: () => mockLocation(),
  };
});

const renderBottomTabBar = () =>
  render(
    <MemoryRouter>
      <BottomTabBar />
    </MemoryRouter>
  );

describe('BottomTabBar', () => {
  it('uses smartphone-only responsive classes in the bottom navigation', () => {
    mockLocation.mockReturnValue({ pathname: '/dashboard' });

    renderBottomTabBar();
    const nav = screen.getByRole('navigation', { name: /navegación principal/i });

    expect(nav.className).toContain('md:hidden');
    expect(nav.className).not.toContain('lg:hidden');
  });

  it('uses smartphone-only responsive classes in the more drawer overlay', () => {
    mockLocation.mockReturnValue({ pathname: '/dashboard' });

    const { container } = renderBottomTabBar();
    fireEvent.click(screen.getByRole('button', { name: /más opciones|action\.more_options/i }));

    const overlay = container.querySelector('.fixed.inset-0');
    expect(overlay).toBeInTheDocument();
    expect(overlay?.className).toContain('md:hidden');
    expect(overlay?.className).not.toContain('lg:hidden');
  });
});
