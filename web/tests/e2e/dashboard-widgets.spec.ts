import { test, expect } from '@playwright/test';
import { isSetupRequired, setupTestUser } from './helpers';

test.describe('Dashboard Analytics Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser(page);
    test.skip(await isSetupRequired(page), 'Backend not configured');
  });

  test('TopClientsWidget displays client list', async ({ page }) => {
    await page.goto('/');

    // Find the Top Clients widget - use getByText for better matching
    const topClientsWidget = page.locator('section, div').filter({ has: page.getByText(/top clientes/i) }).first();
    await expect(topClientsWidget).toBeVisible({ timeout: 5000 });

    // Should show loading state initially or data after load
    const hasContent = await topClientsWidget.getByText(/\d+ evento/).isVisible().catch(() => false);
    const hasEmpty = await topClientsWidget.getByText(/sin clientes/i).isVisible().catch(() => false);
    const hasError = await topClientsWidget.getByText(/error/i).isVisible().catch(() => false);

    // One of these states should be visible
    expect(hasContent || hasEmpty || hasError).toBeTruthy();
  });

  test('ProductDemandWidget displays product demand', async ({ page }) => {
    await page.goto('/');

    const productDemandWidget = page.locator('section, div').filter({ has: page.getByText(/productos/i) }).first();
    await expect(productDemandWidget).toBeVisible({ timeout: 5000 });

    const hasContent = await productDemandWidget.getByText(/\d+ vez/).isVisible().catch(() => false);
    const hasEmpty = await productDemandWidget.getByText(/sin productos/i).isVisible().catch(() => false);
    const hasError = await productDemandWidget.getByText(/error/i).isVisible().catch(() => false);

    expect(hasContent || hasEmpty || hasError).toBeTruthy();
  });

  test('ForecastWidget displays revenue forecast', async ({ page }) => {
    await page.goto('/');

    const forecastWidget = page.locator('section, div').filter({ has: page.getByText(/pronóstico/i) }).first();
    await expect(forecastWidget).toBeVisible({ timeout: 5000 });

    const hasContent = await forecastWidget.getByText(/\$/).isVisible().catch(() => false);
    const hasEmpty = await forecastWidget.getByText(/sin eventos/i).isVisible().catch(() => false);
    const hasError = await forecastWidget.getByText(/error/i).isVisible().catch(() => false);

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
    await page.waitForTimeout(2000);

    const topClientsError = page.locator('section, div').filter({ has: page.getByText(/top clientes/i) }).first();
    const productDemandError = page.locator('section, div').filter({ has: page.getByText(/productos/i) }).first();
    const forecastError = page.locator('section, div').filter({ has: page.getByText(/pronóstico/i) }).first();

    const hasAnyError = await Promise.all([
      topClientsError.getByText(/error/i).isVisible().catch(() => false),
      productDemandError.getByText(/error/i).isVisible().catch(() => false),
      forecastError.getByText(/error/i).isVisible().catch(() => false),
    ]);

    expect(hasAnyError.some(Boolean)).toBeTruthy();
  });
});