import { describe, it, expect } from 'vitest';
import { render, screen } from '@tests/customRender';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders with default props', () => {
    render(<Logo />);
    const img = screen.getByRole('img', { name: 'Solennix Logo' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/icon-navy.svg');
    expect(img).toHaveAttribute('width', '32');
    expect(img).toHaveAttribute('height', '32');
    expect(screen.getByText('Solennix')).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    render(<Logo size={48} />);
    const img = screen.getByRole('img', { name: 'Solennix Logo' });
    expect(img).toHaveAttribute('width', '48');
    expect(img).toHaveAttribute('height', '48');
  });

  it('hides text when showText is false', () => {
    render(<Logo showText={false} />);
    expect(screen.queryByText('Solennix')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Logo className="my-custom-class" />);
    expect(container.firstChild).toHaveClass('my-custom-class');
    expect(container.firstChild).toHaveClass('flex');
  });
});
