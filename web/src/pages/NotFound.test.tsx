import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotFound } from './NotFound';

describe('NotFound', () => {
  it('renders not found messaging and links', () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );
    expect(screen.getByText('Página no encontrada')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir a la página de inicio/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir al panel de control/i })).toBeInTheDocument();
  });
});
