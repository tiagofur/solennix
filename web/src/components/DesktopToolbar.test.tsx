import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DesktopToolbar } from './DesktopToolbar';

describe('DesktopToolbar', () => {
  it('renders the section title', () => {
    render(<DesktopToolbar title="Eventos" actions={null} />);
    expect(screen.getByText('Eventos')).toBeInTheDocument();
  });

  it('renders the provided actions', () => {
    render(
      <DesktopToolbar title="Eventos" actions={<button>Nuevo evento</button>} />,
    );
    expect(screen.getByText('Nuevo evento')).toBeInTheDocument();
  });

  it('is desktop-only (hidden below lg) via the hidden class', () => {
    const { container } = render(<DesktopToolbar title="Eventos" actions={null} />);
    expect(container.firstChild).toHaveClass('hidden');
    // and becomes flex from lg up
    expect(container.firstChild).toHaveClass('lg:flex');
  });

  it('is sticky so actions remain visible while scrolling', () => {
    const { container } = render(<DesktopToolbar title="Eventos" actions={null} />);
    expect(container.firstChild).toHaveClass('sticky', 'top-0');
  });
});
