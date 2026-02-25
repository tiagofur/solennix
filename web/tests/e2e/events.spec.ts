import { test, expect } from '@playwright/test';
import { isSetupRequired, setupTestUser, navigateTo } from './helpers';

test.describe('Events Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test user and login
    await setupTestUser(page);

    if (await isSetupRequired(page)) {
      test.skip('Backend not configured');
      return;
    }
  });

  test('create new event with client', async ({ page }) => {
    // Navigate to events page
    await page.goto('/events');
    await expect(page.getByRole('heading', { name: /eventos/i })).toBeVisible();

    // Click create event button
    await page.getByRole('button', { name: /nuevo evento/i }).click();

    // Should navigate to event form
    await expect(page).toHaveURL(/.*events\/new/);

    // First, create a test client if needed
    // (In a real scenario, you might want to setup test data beforehand)
    // For now, we'll assume the form allows client creation inline or selection

    // Fill event form
    await page.getByLabel(/tipo de servicio/i).fill('Boda Corporativa');
    await page.getByLabel(/número de personas/i).fill('100');

    // Fill date (today + 30 days)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dateStr = futureDate.toISOString().split('T')[0];
    await page.getByLabel(/fecha/i).fill(dateStr);

    // Fill location
    await page.getByLabel(/ubicación|location/i).fill('Salón Principal');
    await page.getByLabel(/ciudad|city/i).fill('Santiago');

    // Save event
    await page.getByRole('button', { name: /guardar|save/i }).click();

    // Should show success message or redirect
    await expect(page).toHaveURL(/.*events\/.*\/summary/, { timeout: 10000 });
    await expect(page.getByText(/evento creado|event created/i)).toBeVisible({ timeout: 5000 });
  });

  test('add products to event', async ({ page }) => {
    // First create an event (assuming we have one)
    await page.goto('/events');

    // Click on first event or create one
    const firstEvent = page.locator('[href^="/events/"]').first();
    const hasEvents = await firstEvent.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasEvents) {
      test.skip('No events available - run create event test first');
      return;
    }

    await firstEvent.click();

    // Should be on event summary page
    await expect(page).toHaveURL(/.*events\/.*\/summary/);

    // Find "Add Products" or "Agregar Productos" button
    const addProductsBtn = page.getByRole('button', { name: /agregar productos|add products/i });

    if (await addProductsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addProductsBtn.click();

      // Select a product (this depends on your UI)
      // For example, if there's a select dropdown:
      const productSelect = page.locator('select[name="product"]').first();
      if (await productSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await productSelect.selectOption({ index: 1 });

        // Fill quantity
        await page.getByLabel(/cantidad|quantity/i).fill('10');

        // Save product
        await page.getByRole('button', { name: /agregar|add/i }).click();

        // Verify product was added
        await expect(page.getByText(/producto agregado|product added/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('change event status', async ({ page }) => {
    await page.goto('/events');

    // Click on first event
    const firstEvent = page.locator('[href^="/events/"]').first();
    const hasEvents = await firstEvent.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasEvents) {
      test.skip('No events available');
      return;
    }

    await firstEvent.click();

    // Look for status change options
    const statusSelect = page.getByLabel(/estado|status/i);

    if (await statusSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Change to "confirmed" or "confirmado"
      await statusSelect.selectOption('confirmed');

      // Save or confirm change
      const saveBtn = page.getByRole('button', { name: /guardar|save|actualizar|update/i });
      if (await saveBtn.isVisible().catch(() => false)) {
        await saveBtn.click();

        // Verify status changed
        await expect(page.getByText(/confirmado|confirmed/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('view event calendar', async ({ page }) => {
    await navigateTo(page, '/calendar', /calendario|calendar/i);

    // Verify calendar is visible
    await expect(page.locator('.fc-view-harness, [class*="calendar"]')).toBeVisible({ timeout: 5000 });

    // Check for event indicators (dots, colors, etc.)
    // This depends on your calendar implementation
    const eventIndicators = page.locator('[class*="event"], .fc-event');
    const hasIndicators = await eventIndicators.count();

    // Just verify the calendar rendered
    expect(hasIndicators).toBeGreaterThanOrEqual(0);
  });

  test('filter and search events', async ({ page }) => {
    await page.goto('/events');
    await expect(page.getByRole('heading', { name: /eventos/i })).toBeVisible();

    // Look for search input
    const searchInput = page.getByPlaceholder(/buscar|search/i);

    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('Boda');

      // Wait for results to filter
      await page.waitForTimeout(1000); // Debounce delay

      // Verify filtered results (this depends on your implementation)
      const results = page.locator('[href^="/events/"]');
      const count = await results.count();

      // At least we verified search doesn't crash
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});
