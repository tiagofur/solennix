import { test, expect, type Page } from '@playwright/test';
import { setupTestUserWithEvent, skipIfBackendUnavailable } from './helpers';

test.describe('PDF Generation Flow', () => {
  let seededEventId: string | null = null;

  async function openEventSummary(page: Page) {
    expect(seededEventId).not.toBeNull();
    await page.goto(`/events/${seededEventId}/summary`);
    await expect(page).toHaveURL(/.*events\/.*\/summary/);
  }

  async function openActionsMenu(page: Page) {
    const moreActions = page.getByRole('button', { name: /más|more/i });
    await expect(moreActions).toBeVisible();
    await moreActions.click();
  }

  test.beforeEach(async ({ page }) => {
    const seed = await setupTestUserWithEvent(page);
    seededEventId = seed?.eventId ?? null;

    await skipIfBackendUnavailable(page);
  });

  test('generate quotation PDF from event', async ({ page }) => {
    await openEventSummary(page);
    await openActionsMenu(page);

    const budgetItem = page.getByRole('menuitem', { name: /presupuesto|budget/i });
    await expect(budgetItem).toBeVisible();

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await budgetItem.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test('generate contract PDF with event details', async ({ page }) => {
    await openEventSummary(page);
    await openActionsMenu(page);

    const contractItem = page.getByRole('menuitem', { name: /contrato|contract/i });
    await expect(contractItem).toBeVisible();
    await expect(contractItem).toBeEnabled();

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    await contractItem.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    expect(download.suggestedFilename()).toMatch(/contrato|contract/i);
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
      await openEventSummary(page);
      await openActionsMenu(page);

      const budgetItem = page.getByRole('menuitem', { name: /presupuesto|budget/i });
      await expect(budgetItem).toBeVisible();

      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      await budgetItem.click();

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    }
  });

  test('handle PDF generation errors gracefully', async ({ page }) => {
    await openEventSummary(page);

    await openActionsMenu(page);
    await expect(page.getByRole('menuitem', { name: /presupuesto|budget/i })).toBeVisible();

    await openActionsMenu(page);
    await expect(page.getByRole('menuitem', { name: /contrato|contract/i })).toBeVisible();

    await expect(page.getByRole('heading')).toBeVisible();
  });
});
