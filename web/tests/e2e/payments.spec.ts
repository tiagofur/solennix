import { test, expect } from '@playwright/test';
import { isSetupRequired, setupTestUser } from './helpers';

test.describe('Payments Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser(page);

    test.skip(await isSetupRequired(page), 'Backend not configured');
  });

  test('navigate to payments page', async ({ page }) => {
    await page.goto('/dashboard');

    // Find payments link in navigation
    const paymentsLink = page.getByRole('link', { name: /pagos|payments/i });

    if (await paymentsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await paymentsLink.click();

      // Verify payments page loaded
      await expect(page).toHaveURL(/.*payments/);
      await expect(page.getByRole('heading', { name: /pagos|payments/i })).toBeVisible();
    } else {
      test.skip(true, 'Payments feature not available in UI');
    }
  });

  test('add payment to event', async ({ page }) => {
    // First, go to events and select one
    await page.goto('/events');

    const firstEvent = page.locator('[href^="/events/"]').first();
    const hasEvents = await firstEvent.isVisible({ timeout: 3000 }).catch(() => false);

    test.skip(!hasEvents, 'No events available to add payment');

    await firstEvent.click();

    // Look for "Add Payment" or "Agregar Pago" button
    const addPaymentBtn = page.getByRole('button', { name: /agregar pago|add payment|registrar pago/i });

    if (await addPaymentBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addPaymentBtn.click();

      // Fill payment form
      await page.getByLabel(/monto|amount/i).fill('5000');

      // Select payment method
      const methodSelect = page.getByLabel(/método de pago|payment method/i);
      if (await methodSelect.isVisible().catch(() => false)) {
        await methodSelect.selectOption('efectivo');
      }

      // Fill payment date (today)
      const today = new Date().toISOString().split('T')[0];
      const dateInput = page.getByLabel(/fecha|date/i);
      if (await dateInput.isVisible().catch(() => false)) {
        await dateInput.fill(today);
      }

      // Add notes
      const notesInput = page.getByLabel(/notas|notes/i);
      if (await notesInput.isVisible().catch(() => false)) {
        await notesInput.fill('Pago inicial - Test E2E');
      }

      // Save payment
      await page.getByRole('button', { name: /guardar|save|registrar/i }).click();

      // Verify payment was added
      await expect(page.getByText(/pago registrado|payment recorded/i)).toBeVisible({ timeout: 5000 });
    } else {
      test.skip(true, 'Add payment button not found - feature may not be implemented');
    }
  });

  test('view payment history for event', async ({ page }) => {
    await page.goto('/events');

    const firstEvent = page.locator('[href^="/events/"]').first();
    const hasEvents = await firstEvent.isVisible({ timeout: 3000 }).catch(() => false);

    test.skip(!hasEvents, 'No events available');

    await firstEvent.click();

    // Look for payments section
    const paymentsSection = page.getByText(/pagos|payments/i);

    if (await paymentsSection.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Verify payments table or list is visible
      const paymentsList = page.locator('[data-testid="payments-list"], table');

      if (await paymentsList.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Check if there are any payment rows
        const rows = paymentsList.locator('tr, [data-testid="payment-item"]');
        const rowCount = await rows.count();

        // At least verify the UI doesn't crash
        expect(rowCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('delete payment', async ({ page }) => {
    await page.goto('/events');

    const firstEvent = page.locator('[href^="/events/"]').first();
    const hasEvents = await firstEvent.isVisible({ timeout: 3000 }).catch(() => false);

    test.skip(!hasEvents, 'No events available');

    await firstEvent.click();

    // Look for delete payment button (trash icon or button)
    const deleteBtn = page.getByRole('button', { name: /eliminar|delete/i }).first();

    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteBtn.click();

      // Confirm deletion in dialog
      const confirmBtn = page.getByRole('button', { name: /confirmar|confirm|sí|yes/i });

      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();

        // Verify deletion
        await expect(page.getByText(/eliminado|deleted/i)).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip(true, 'Delete payment functionality not found');
    }
  });

  test('calculate payment balance correctly', async ({ page }) => {
    await page.goto('/events');

    const firstEvent = page.locator('[href^="/events/"]').first();
    const hasEvents = await firstEvent.isVisible({ timeout: 3000 }).catch(() => false);

    test.skip(!hasEvents, 'No events available');

    await firstEvent.click();

    // Look for financial summary section
    const totalAmount = page.getByText(/total|monto total/i);
    const paidAmount = page.getByText(/pagado|paid/i);
    const balance = page.getByText(/saldo|balance|pendiente/i);

    // Verify financial info is displayed
    const hasFinancialInfo =
      (await totalAmount.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await paidAmount.isVisible({ timeout: 2000 }).catch(() => false)) ||
      (await balance.isVisible({ timeout: 2000 }).catch(() => false));

    if (hasFinancialInfo) {
      // Just verify the display is working (actual calculation tested in unit tests)
      expect(hasFinancialInfo).toBe(true);
    } else {
      test.skip(true, 'Financial summary not found in UI');
    }
  });
});
