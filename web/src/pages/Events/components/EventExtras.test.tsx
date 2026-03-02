import { render, screen, fireEvent } from '@testing-library/react';
import { EventExtras } from './EventExtras';

describe('EventExtras', () => {
  it('renders extras and handles changes', () => {
    const onAddExtra = vi.fn();
    const onRemoveExtra = vi.fn();
    const onExtraChange = vi.fn();

    render(
      <EventExtras
        extras={[
          { description: 'Transporte', cost: 50, price: 80, exclude_utility: false },
        ]}
        onAddExtra={onAddExtra}
        onRemoveExtra={onRemoveExtra}
        onExtraChange={onExtraChange}
      />
    );

    expect(screen.getByDisplayValue('Transporte')).toBeInTheDocument();
    expect(screen.getByText('$80.00')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Descripción'), { target: { value: 'Gasolina' } });
    expect(onExtraChange).toHaveBeenCalledWith(0, 'description', 'Gasolina');

    fireEvent.click(screen.getByRole('button', { name: /Eliminar extra 1/i }));
    expect(onRemoveExtra).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole('button', { name: /Agregar un extra adicional/i }));
    expect(onAddExtra).toHaveBeenCalled();
  });

  it('updates costs and toggles exclude utility', () => {
    const onAddExtra = vi.fn();
    const onRemoveExtra = vi.fn();
    const onExtraChange = vi.fn();

    render(
      <EventExtras
        extras={[
          { description: 'Transporte', cost: 50, price: 80, exclude_utility: false },
        ]}
        onAddExtra={onAddExtra}
        onRemoveExtra={onRemoveExtra}
        onExtraChange={onExtraChange}
      />
    );

    fireEvent.click(screen.getByRole('checkbox'));
    expect(onExtraChange).toHaveBeenCalledWith(0, 'exclude_utility', true);

    fireEvent.change(screen.getByDisplayValue('50'), { target: { value: '60' } });
    expect(onExtraChange).toHaveBeenCalledWith(0, 'cost', 60);

    fireEvent.change(screen.getByDisplayValue('80'), { target: { value: '90' } });
    expect(onExtraChange).toHaveBeenCalledWith(0, 'price', 90);
  });

  // ---------- BRANCH COVERAGE: exclude_utility true applies disabled + extra CSS class ----------

  it('applies disabled state and extra CSS class on price input when exclude_utility is true', () => {
    const onAddExtra = vi.fn();
    const onRemoveExtra = vi.fn();
    const onExtraChange = vi.fn();

    render(
      <EventExtras
        extras={[
          { description: 'Personal', cost: 100, price: 100, exclude_utility: true },
        ]}
        onAddExtra={onAddExtra}
        onRemoveExtra={onRemoveExtra}
        onExtraChange={onExtraChange}
      />
    );

    const priceInput = screen.getByLabelText(/Precio de cobro del extra 1/i);
    expect(priceInput).toBeDisabled();
    expect(priceInput.className).toContain('bg-surface-alt');
  });

  it('does not apply disabled state on price input when exclude_utility is false', () => {
    const onAddExtra = vi.fn();
    const onRemoveExtra = vi.fn();
    const onExtraChange = vi.fn();

    render(
      <EventExtras
        extras={[
          { description: 'Transporte', cost: 50, price: 80, exclude_utility: false },
        ]}
        onAddExtra={onAddExtra}
        onRemoveExtra={onRemoveExtra}
        onExtraChange={onExtraChange}
      />
    );

    const priceInput = screen.getByLabelText(/Precio de cobro del extra 1/i);
    expect(priceInput).not.toBeDisabled();
    expect(priceInput.className).not.toContain('bg-surface-alt');
  });

  it('renders multiple extras with mixed exclude_utility values', () => {
    const onAddExtra = vi.fn();
    const onRemoveExtra = vi.fn();
    const onExtraChange = vi.fn();

    render(
      <EventExtras
        extras={[
          { description: 'Transporte', cost: 50, price: 80, exclude_utility: false },
          { description: 'Personal', cost: 100, price: 100, exclude_utility: true },
        ]}
        onAddExtra={onAddExtra}
        onRemoveExtra={onRemoveExtra}
        onExtraChange={onExtraChange}
      />
    );

    const priceInput1 = screen.getByLabelText(/Precio de cobro del extra 1/i);
    const priceInput2 = screen.getByLabelText(/Precio de cobro del extra 2/i);

    expect(priceInput1).not.toBeDisabled();
    expect(priceInput2).toBeDisabled();
    expect(priceInput2.className).toContain('bg-surface-alt');

    // Subtotal should be 80 + 100 = 180
    expect(screen.getByText('$180.00')).toBeInTheDocument();
  });

  it('renders empty extras list with only the add button', () => {
    const onAddExtra = vi.fn();
    const onRemoveExtra = vi.fn();
    const onExtraChange = vi.fn();

    render(
      <EventExtras
        extras={[]}
        onAddExtra={onAddExtra}
        onRemoveExtra={onRemoveExtra}
        onExtraChange={onExtraChange}
      />
    );

    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar un extra adicional/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar extra/i })).not.toBeInTheDocument();
  });
});
