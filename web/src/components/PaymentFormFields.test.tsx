import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@tests/customRender";
import { PaymentFormFields } from "./PaymentFormFields";

describe("PaymentFormFields", () => {
  it("pre-fills amount with initialAmount", () => {
    render(<PaymentFormFields initialAmount={123.45} onSubmit={vi.fn()} />);
    const amountInput = screen.getByLabelText(/Monto/i) as HTMLInputElement;
    expect(amountInput.value).toBe("123.45");
  });

  it("submits with the entered values", async () => {
    const onSubmit = vi.fn();
    render(<PaymentFormFields initialAmount={50} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/Nota/i), { target: { value: "Anticipo X" } });
    fireEvent.change(screen.getByLabelText(/Método/i), { target: { value: "transfer" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar Pago/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const arg = onSubmit.mock.calls[0][0];
    expect(arg.amount).toBe(50);
    expect(arg.payment_method).toBe("transfer");
    expect(arg.notes).toBe("Anticipo X");
    expect(arg.payment_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("shows the Saldo button when saldoAmount > 0 and fills the amount on click", async () => {
    render(<PaymentFormFields initialAmount={0} saldoAmount={250} onSubmit={vi.fn()} />);
    const saldoBtn = screen.getByRole("button", { name: /Saldo/i });
    fireEvent.click(saldoBtn);
    const amountInput = screen.getByLabelText(/Monto/i) as HTMLInputElement;
    await waitFor(() => expect(amountInput.value).toBe("250"));
  });

  it("hides the Saldo button when saldoAmount is undefined or zero", () => {
    const { rerender } = render(<PaymentFormFields initialAmount={0} onSubmit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Saldo/i })).not.toBeInTheDocument();
    rerender(<PaymentFormFields initialAmount={0} saldoAmount={0} onSubmit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Saldo/i })).not.toBeInTheDocument();
  });

  it("does not submit when amount is below the min", async () => {
    const onSubmit = vi.fn();
    render(<PaymentFormFields initialAmount={0} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Confirmar Pago/i }));
    // Give react-hook-form time to run validation
    await new Promise((r) => setTimeout(r, 50));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("uses custom submitLabel and triggers onCancel", () => {
    const onCancel = vi.fn();
    render(
      <PaymentFormFields
        initialAmount={100}
        submitLabel="Pagar y completar"
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("button", { name: /Pagar y completar/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables both buttons while submitting", () => {
    render(
      <PaymentFormFields
        initialAmount={100}
        isSubmitting
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Guardando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Cancelar/i })).toBeDisabled();
  });

  it("re-syncs amount when initialAmount prop changes", async () => {
    const { rerender } = render(<PaymentFormFields initialAmount={100} onSubmit={vi.fn()} />);
    const amountInput = screen.getByLabelText(/Monto/i) as HTMLInputElement;
    expect(amountInput.value).toBe("100");
    rerender(<PaymentFormFields initialAmount={550} onSubmit={vi.fn()} />);
    await waitFor(() => expect(amountInput.value).toBe("550"));
  });
});
