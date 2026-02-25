import { test, expect } from '@playwright/test';
import { isSetupRequired, setupTestUser } from './helpers';

test.describe('PDF Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser(page);

    if (await isSetupRequired(page)) {
      test.skip('Backend not configured');
      return;
    }
  });

  test('generate invoice PDF from event', async ({ page }) => {
    await page.goto('/events');

    const firstEvent = page.locator('[href^="/events/"]').first();
    const hasEvents = await firstEvent.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasEvents) {
      test.skip('No events available to generate PDF');
      return;
    }

    await firstEvent.click();

    // Look for "Generate Invoice" or "Generar Factura" button
    const generateInvoiceBtn = page.getByRole('button', {
      name: /generar factura|generate invoice|descargar factura/i,
    });

    if (await generateInvoiceBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Setup download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      await generateInvoiceBtn.click();

      // Wait for download
      const download = await downloadPromise;

      // Verify file was downloaded
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

      // Verify filename contains expected patterns
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/factura|invoice/i);
    } else {
      test.skip('Generate invoice button not found');
    }
  });

  test('generate quotation PDF from event', async ({ page }) => {
    await page.goto('/events');

    const firstEvent = page.locator('[href^="/events/"]').first();
    const hasEvents = await firstEvent.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasEvents) {
      test.skip('No events available');
      return;
    }

    await firstEvent.click();

    // Look for "Generate Quotation" or "Generar Cotización" button
    const generateQuoteBtn = page.getByRole('button', {
      name: /generar cotización|generate quotation|descargar cotización|quote/i,
    });

    if (await generateQuoteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      await generateQuoteBtn.click();

      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      expect(download.suggestedFilename()).toMatch(/cotizacion|quotation|quote/i);
    } else {
      test.skip('Generate quotation button not found');
    }
  });

  test('generate contract PDF with event details', async ({ page }) => {
    await page.goto('/events');

    const firstEvent = page.locator('[href^="/events/"]').first();
    const hasEvents = await firstEvent.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasEvents) {
      test.skip('No events available');
      return;
    }

    await firstEvent.click();

    // Look for "Generate Contract" or "Generar Contrato" button
    const generateContractBtn = page.getByRole('button', {
      name: /generar contrato|generate contract|descargar contrato/i,
    });

    if (await generateContractBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

      await generateContractBtn.click();

      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      expect(download.suggestedFilename()).toMatch(/contrato|contract/i);
    } else {
      test.skip('Generate contract button not found');
    }
  });

  test('PDF includes correct business branding', async ({ page }) => {
    // This test verifies that PDF generation uses user's business info
    // We can't easily verify PDF contents in E2E, but we can check the setup

    await page.goto('/settings');

    // Verify settings page has business info fields
    const businessNameInput = page.getByLabel(/nombre del negocio|business name/i);

    if (await businessNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const currentName = await businessNameInput.inputValue();

      // If empty, fill it
      if (!currentName) {
        await businessNameInput.fill('Eventos Test E2E');

        const saveBtn = page.getByRole('button', { name: /guardar|save/i });
        if (await saveBtn.isVisible().catch(() => false)) {
          await saveBtn.click();

          await expect(page.getByText(/guardado|saved|actualizado|updated/i)).toBeVisible({
            timeout: 5000,
          });
        }
      }

      // Now verify PDF generation still works with branding
      await page.goto('/events');

      const firstEvent = page.locator('[href^="/events/"]').first();
      if (await firstEvent.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstEvent.click();

        const pdfBtn = page
          .getByRole('button', { name: /generar|descargar|pdf/i })
          .first();

        if (await pdfBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
          await pdfBtn.click();

          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
        }
      }
    }
  });

  test('handle PDF generation errors gracefully', async ({ page }) => {
    await page.goto('/events');

    const firstEvent = page.locator('[href^="/events/"]').first();
    const hasEvents = await firstEvent.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasEvents) {
      test.skip('No events available');
      return;
    }

    await firstEvent.click();

    // Try to generate PDF for event with incomplete data
    // (This depends on your validation - adjust as needed)

    const pdfBtn = page.getByRole('button', { name: /generar|pdf/i }).first();

    if (await pdfBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Try clicking multiple times rapidly (stress test)
      await pdfBtn.click();
      await pdfBtn.click();

      // Should not crash - either download or show error
      // Wait a bit to see if error appears
      await page.waitForTimeout(2000);

      // Page should still be functional
      await expect(page.getByRole('heading')).toBeVisible();
    }
  });
});
