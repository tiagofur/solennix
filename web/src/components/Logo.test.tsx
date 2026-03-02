import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders with default props', () => {
    render(<Logo />);
    const img = screen.getByRole('img', { name: 'EventosApp Logo' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/favicon.svg');
    expect(img).toHaveAttribute('width', '32');
    expect(img).toHaveAttribute('height', '32');
    expect(screen.getByText('EventosApp')).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    render(<Logo size={48} />);
    const img = screen.getByRole('img', { name: 'EventosApp Logo' });
    expect(img).toHaveAttribute('width', '48');
    expect(img).toHaveAttribute('height', '48');
  });

  it('hides text when showText is false', () => {
    render(<Logo showText={false} />);
    expect(screen.queryByText('EventosApp')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Logo className="my-custom-class" />);
    expect(container.firstChild).toHaveClass('my-custom-class');
    expect(container.firstChild).toHaveClass('flex');
  });
});
