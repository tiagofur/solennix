import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Empty from './Empty';

describe('Empty', () => {
  it('renders default title and description', () => {
    render(<Empty />);
    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.getByText('No hay información para mostrar en este momento.')).toBeInTheDocument();
  });

  it('renders custom content', () => {
    render(<Empty title="Custom" description="Desc" />);
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
  });

  it('renders action when provided', () => {
    render(<Empty action={<button>Action</button>} />);
    expect(screen.getByText('Action')).toBeInTheDocument();
  });
});
