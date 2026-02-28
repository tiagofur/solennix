import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { EventFinancials } from './EventFinancials';

const FormWrapper: React.FC<{ children: React.ReactNode; defaults?: Record<string, any> }> = ({ children, defaults }) => {
  const methods = useForm({
    defaultValues: {
      discount: 10,
      requires_invoice: true,
      tax_rate: 16,
      tax_amount: 32,
      total_amount: 232,
      deposit_percent: 50,
      cancellation_days: 15,
      refund_percent: 0,
      notes: '',
      ...defaults,
    },
  });

  return <FormProvider {...methods}>{children}</FormProvider>;
};

const renderWithForm = (ui: React.ReactNode, defaults?: Record<string, any>) =>
  render(<FormWrapper defaults={defaults}>{ui}</FormWrapper>);

describe('EventFinancials', () => {
  it('renders tax and totals summary', () => {
    renderWithForm(
      <EventFinancials
        selectedProducts={[{ product_id: 'p1', quantity: 2, price: 100, discount: 0 }]}
        extras={[{ price: 20, cost: 10, exclude_utility: false }]}
        productUnitCosts={{ p1: 30 }}
      />
    );

    expect(screen.getByText('IVA (16%):')).toBeInTheDocument();
    expect(screen.getByText('$232.00')).toBeInTheDocument();
  });

  // ---------- BRANCH COVERAGE: adjustedRevenue <= 0 returns "0.0%" ----------

  it('displays 0.0% margin when adjustedRevenue is zero (all extras exclude utility)', () => {
    // When total_amount is 0 and all extras have exclude_utility: true,
    // adjustedRevenue = totalRevenue - passThroughRevenue = 0 - 0 = 0, so margin = "0.0%"
    renderWithForm(
      <EventFinancials
        selectedProducts={[]}
        extras={[{ price: 100, cost: 50, exclude_utility: true }]}
        productUnitCosts={{}}
      />,
      {
        discount: 0,
        requires_invoice: false,
        tax_rate: 16,
        tax_amount: 0,
        total_amount: 100,
      },
    );

    // adjustedRevenue = 100 (totalRevenue) - 100 (passThroughRevenue from exclude_utility extras) = 0
    // So margin should be "0.0%"
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('displays 0.0% margin when total_amount is zero with no products or extras', () => {
    renderWithForm(
      <EventFinancials
        selectedProducts={[]}
        extras={[]}
        productUnitCosts={{}}
      />,
      {
        discount: 0,
        requires_invoice: false,
        tax_rate: 16,
        tax_amount: 0,
        total_amount: 0,
      },
    );

    // adjustedRevenue = 0 - 0 = 0, so margin = "0.0%"
    expect(screen.getByText('0.0%')).toBeInTheDocument();
  });

  it('does not show discount line when discount is 0', () => {
    renderWithForm(
      <EventFinancials
        selectedProducts={[{ product_id: 'p1', quantity: 1, price: 100, discount: 0 }]}
        extras={[]}
        productUnitCosts={{ p1: 50 }}
      />,
      {
        discount: 0,
        requires_invoice: false,
        tax_rate: 16,
        tax_amount: 0,
        total_amount: 100,
      },
    );

    // The label "Descuento General (%)" is always visible, but the summary line "Descuento (0%):" should not appear
    expect(screen.queryByText(/Descuento \(\d+%\):/)).not.toBeInTheDocument();
  });

  it('does not show IVA line when requires_invoice is false', () => {
    renderWithForm(
      <EventFinancials
        selectedProducts={[{ product_id: 'p1', quantity: 1, price: 100, discount: 0 }]}
        extras={[]}
        productUnitCosts={{ p1: 50 }}
      />,
      {
        discount: 0,
        requires_invoice: false,
        tax_rate: 16,
        tax_amount: 0,
        total_amount: 100,
      },
    );

    // The checkbox label "Requiere factura (IVA 16%)" is always visible, but the summary line "IVA (16%):" should not appear
    expect(screen.queryByText(/^IVA \(\d+%\):$/)).not.toBeInTheDocument();
  });

  it('calculates margin correctly when adjustedRevenue is positive', () => {
    renderWithForm(
      <EventFinancials
        selectedProducts={[{ product_id: 'p1', quantity: 1, price: 200, discount: 0 }]}
        extras={[]}
        productUnitCosts={{ p1: 100 }}
      />,
      {
        discount: 0,
        requires_invoice: false,
        tax_rate: 16,
        tax_amount: 0,
        total_amount: 200,
      },
    );

    // totalRevenue = 200, totalCost = 100, profit = 100
    // adjustedRevenue = 200, margin = (100/200)*100 = 50.0%
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  // ---------- BRANCH COVERAGE: productUnitCosts missing key falls back to 0 ----------

  it('falls back to 0 cost when product_id is not in productUnitCosts', () => {
    renderWithForm(
      <EventFinancials
        selectedProducts={[{ product_id: 'unknown-product', quantity: 3, price: 50, discount: 0 }]}
        extras={[]}
        productUnitCosts={{}}
      />,
      {
        discount: 0,
        requires_invoice: false,
        tax_rate: 16,
        tax_amount: 0,
        total_amount: 150,
      },
    );

    // Both "Subtotal Extras" and "Costo Total" show $0.00
    const zeroElements = screen.getAllByText('$0.00');
    expect(zeroElements.length).toBeGreaterThanOrEqual(2);
    // Utilidad Neta and Total both show $150.00
    const oneHundredFifty = screen.getAllByText('$150.00');
    expect(oneHundredFifty.length).toBeGreaterThanOrEqual(1);
  });

  // ---------- BRANCH COVERAGE: tax_rate fallback || 16 ----------

  it('uses default tax_rate of 16 when not provided in form', () => {
    // By not providing tax_rate as a default, useWatch returns undefined and || 16 kicks in
    const FormWrapperMinimal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      const methods = useForm({
        defaultValues: {
          discount: 0,
          requires_invoice: true,
          tax_amount: 16,
          total_amount: 116,
          deposit_percent: 50,
          cancellation_days: 15,
          refund_percent: 0,
          notes: '',
          // tax_rate is intentionally omitted
        },
      });
      return <FormProvider {...methods}>{children}</FormProvider>;
    };

    render(
      <FormWrapperMinimal>
        <EventFinancials
          selectedProducts={[{ product_id: 'p1', quantity: 1, price: 100, discount: 0 }]}
          extras={[]}
          productUnitCosts={{ p1: 50 }}
        />
      </FormWrapperMinimal>,
    );

    // Should still show "IVA (16%)" from the fallback
    expect(screen.getByText('IVA (16%):')).toBeInTheDocument();
  });
});
