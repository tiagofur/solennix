import { render, screen, fireEvent } from '@tests/customRender';
import { FormProvider, useForm } from 'react-hook-form';
import { EventProducts } from './EventProducts';

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const methods = useForm({
    defaultValues: { num_people: 50 },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

const renderWithForm = (ui: React.ReactNode) => render(<FormWrapper>{ui}</FormWrapper>);

describe('EventProducts', () => {
  it('renders subtotal and handles actions', () => {
    const onAddProduct = vi.fn();
    const onRemoveProduct = vi.fn();
    const onProductChange = vi.fn();

    renderWithForm(
      <EventProducts
        products={[
          { id: 'p1', name: 'Churros' } as any,
          { id: 'p2', name: 'Tacos' } as any,
        ]}
        selectedProducts={[
          { product_id: 'p1', quantity: 2, price: 100, discount: 10 },
        ]}
        productUnitCosts={{ p1: 25 }}
        onAddProduct={onAddProduct}
        onRemoveProduct={onRemoveProduct}
        onProductChange={onProductChange}
      />
    );

    expect(screen.getByText('$180.00')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Agregar un producto adicional/i }));
    expect(onAddProduct).toHaveBeenCalled();

    const productSelect = screen.getByRole('combobox');
    fireEvent.change(productSelect, { target: { value: 'p2' } });
    expect(onProductChange).toHaveBeenCalledWith(0, 'product_id', 'p2');

    fireEvent.click(screen.getByRole('button', { name: /Igualar cantidad a número de personas/i }));
    expect(onProductChange).toHaveBeenCalledWith(0, 'quantity', 50);

    fireEvent.click(screen.getByRole('button', { name: /Eliminar producto 1/i }));
    // Hay dos botones con label de borrar: el del card y el del dialog.
    const confirmButtons = screen.getAllByRole('button', { name: /Eliminar|action\.delete/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    expect(onRemoveProduct).toHaveBeenCalledWith(0);
  });

  it('handles discount and total edits', () => {
    const onAddProduct = vi.fn();
    const onRemoveProduct = vi.fn();
    const onProductChange = vi.fn();

    renderWithForm(
      <EventProducts
        products={[{ id: 'p1', name: 'Churros' } as any]}
        selectedProducts={[
          { product_id: 'p1', quantity: 2, price: 100, discount: 0 },
        ]}
        productUnitCosts={{}}
        onAddProduct={onAddProduct}
        onRemoveProduct={onRemoveProduct}
        onProductChange={onProductChange}
      />
    );

    const discountInput = screen.getAllByDisplayValue('0')[0];
    fireEvent.change(discountInput, { target: { value: '15' } });
    expect(onProductChange).toHaveBeenCalledWith(0, 'discount', 15);

    const totalInput = screen.getByDisplayValue('200.00');
    fireEvent.change(totalInput, { target: { value: '150' } });
    expect(onProductChange).toHaveBeenCalledWith(0, 'discount', 25);

    fireEvent.change(totalInput, { target: { value: '999' } });
    expect(onProductChange).toHaveBeenCalledTimes(2);
  });
});
