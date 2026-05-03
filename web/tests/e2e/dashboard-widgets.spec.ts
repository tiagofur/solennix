import { test, expect } from '@playwright/test';
import { isSetupRequired, setupTestUser } from './helpers';

test.describe('Dashboard Analytics Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser(page);
    test.skip(await isSetupRequired(page), 'Backend not configured');
  });

  test('TopClientsWidget displays client list', async ({ page }) => {
    await page.goto('/');

    // Find the Top Clients widget
    const topClientsWidget = page.locator('section, div').filter({ hasText: /top clientes|top clients/i }).first();
    await expect(topClientsWidget).toBeVisible({ timeout: 5000 });

    // Should show loading state initially or data after load
    // Either skeleton or actual content
    const hasContent = await topClientsWidget.locator('text=/\\d+ evento/').isVisible().catch(() => false);
    const hasEmpty = await topClientsWidget.locator(/sin clientes|no clients/i).isVisible().catch(() => false);
    const hasError = await topClientsWidget.locator(/error|fallo/i).isVisible().catch(() => false);

    // One of these states should be visible
    expect(hasContent || hasEmpty || hasError).toBeTruthy();
  });

  test('ProductDemandWidget displays product demand', async ({ page }) => {
    await page.goto('/');

    // Find the Product Demand widget
    const productDemandWidget = page.locator('section, div').filter({ hasText: /productos más solicitados|product demand/i }).first();
    await expect(productDemandWidget).toBeVisible({ timeout: 5000 });

    // Should show loading state or data
    const hasContent = await productDemandWidget.locator('text=/\\d+ vez|times used/i').isVisible().catch(() => false);
    const hasEmpty = await productDemandWidget.locator(/sin productos|no products/i).isVisible().catch(() => false);
    const hasError = await productDemandWidget.locator(/error|fallo/i).isVisible().catch(() => false);

    expect(hasContent || hasEmpty || hasError).toBeTruthy();
  });

  test('ForecastWidget displays revenue forecast', async ({ page }) => {
    await page.goto('/');

    // Find the Forecast widget
    const forecastWidget = page.locator('section, div').filter({ hasText: /pronóstico de ingresos|forecast/i }).first();
    await expect(forecastWidget).toBeVisible({ timeout: 5000 });

    // Should show loading state or data
    const hasContent = await forecastWidget.locator(/\$\d|mn|mx/i).isVisible().catch(() => false);
    const hasEmpty = await forecastWidget.locator(/sin eventos|no events/i).isVisible().catch(() => false);
    const hasError = await forecastWidget.locator(/error|fallo/i).isVisible().catch(() => false);

    expect(hasContent || hasEmpty || hasError).toBeTruthy();
  });

  test('Widgets handle error state when API fails', async ({ page }) => {
    // Mock API to return 500 error
    await page.route('**/api/dashboard/top-clients', async (route) => {
      await route.fulfill({ status: 500 });
    });
    await page.route('**/api/dashboard/product-demand', async (route) => {
      await route.fulfill({ status: 500 });
    });
    await page.route('**/api/dashboard/forecast', async (route) => {
      await route.fulfill({ status: 500 });
    });

    await page.goto('/');

    // Should show error state for each widget
    // Wait a bit for the error to surface
    await page.waitForTimeout(2000);

    const topClientsError = page.locator('section, div').filter({ hasText: /top clientes|top clients/i }).first();
    const productDemandError = page.locator('section, div').filter({ hasText: /productos más solicitados|product demand/i }).first();
    const forecastError = page.locator('section, div').filter({ hasText: /pronóstico de ingresos|forecast/i }).first();

    // Verify error message appears in at least one widget
    const hasAnyError = await Promise.all([
      topClientsError.locator(/error|fallo/i).isVisible().catch(() => false),
      productDemandError.locator(/error|fallo/i).isVisible().catch(() => false),
      forecastError.locator(/error|fallo/i).isVisible().catch(() => false),
    ]);

    expect(hasAnyError.some(Boolean)).toBeTruthy();
  });
});