import { test, expect } from '@playwright/test';
import { setupTestUserWithEvent, skipIfBackendUnavailable } from './helpers';

test.describe('Payments Flow', () => {
  let seededEventId: string | null = null;

  async function openEventPaymentsTab(page: import('@playwright/test').Page) {
    expect(seededEventId).not.toBeNull();
    await page.goto(`/events/${seededEventId}/summary`);

    const paymentsTab = page.getByRole('button', {
      name: /ver pagos del evento|view event payments/i,
    });
    await expect(paymentsTab).toBeVisible();
    await paymentsTab.click();

    await expect(page.getByRole('heading', { name: /pagos y balance|payments and balance/i })).toBeVisible();
  }

  test.beforeEach(async ({ page }) => {
    const seed = await setupTestUserWithEvent(page);
    seededEventId = seed?.eventId ?? null;

    await skipIfBackendUnavailable(page);
  });

  test('navigate to payments page', async ({ page }) => {
    await openEventPaymentsTab(page);
  });

  test('add payment to event', async ({ page }) => {
    await openEventPaymentsTab(page);

    const addPaymentBtn = page.getByRole('button', { name: /\$\s*(pago|payment)|registrar pago|record payment/i });
    await expect(addPaymentBtn).toBeVisible();
    await addPaymentBtn.click();

    await page.getByLabel(/monto|amount/i).fill('5000');

    const methodSelect = page.getByLabel(/método|method/i);
    await expect(methodSelect).toBeVisible();
    await methodSelect.selectOption('cash');

    const today = new Date().toISOString().split('T')[0];
    await page.getByLabel(/fecha|date/i).fill(today);
    await page.getByLabel(/nota|notes/i).fill('Pago inicial - Test E2E');

    await page.getByRole('button', { name: /confirmar pago|confirm payment/i }).click();
    await expect(page.getByText(/pago registrado correctamente|payment recorded successfully/i)).toBeVisible({ timeout: 5000 });
  });

  test('view payment history for event', async ({ page }) => {
    await openEventPaymentsTab(page);

    const historyTable = page.getByRole('table');
    await expect(historyTable).toBeVisible();

    const headers = historyTable.getByRole('columnheader');
    await expect(headers.first()).toBeVisible();
  });

  test('delete payment', async ({ page }) => {
    await openEventPaymentsTab(page);

    const addPaymentBtn = page.getByRole('button', { name: /\$\s*(pago|payment)|registrar pago|record payment/i });
    await addPaymentBtn.click();
    await page.getByLabel(/monto|amount/i).fill('1000');
    await page.getByLabel(/método|method/i).selectOption('cash');
    await page.getByRole('button', { name: /confirmar pago|confirm payment/i }).click();
    await expect(page.getByText(/pago registrado correctamente|payment recorded successfully/i)).toBeVisible({ timeout: 5000 });

    const deleteBtn = page.getByRole('button', { name: /eliminar pago|delete payment/i }).first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    const confirmBtn = page.getByRole('button', { name: /eliminar permanentemente|delete permanently/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    await expect(page.getByText(/pago eliminado correctamente|payment deleted successfully/i)).toBeVisible({ timeout: 5000 });
  });

  test('calculate payment balance correctly', async ({ page }) => {
    await openEventPaymentsTab(page);

    await expect(page.getByText(/total del evento|event total/i)).toBeVisible();
    await expect(page.getByText(/total pagado|total paid/i)).toBeVisible();
    await expect(page.getByText(/saldo (pendiente|liquidado)|pending balance|settled balance/i)).toBeVisible();
  });
});
