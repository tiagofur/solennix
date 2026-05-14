import { test, expect, type Page } from '@playwright/test';
import { setupTestUser, skipIfBackendUnavailable } from './helpers';

test.describe('Subscription Upgrade Flow', () => {
  async function openPricing(page: Page) {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: /planes y precios|plans and pricing/i })).toBeVisible();
  }

  test.beforeEach(async ({ page }) => {
    await setupTestUser(page);

    await skipIfBackendUnavailable(page);
  });

  test('view pricing page from dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    const upgradeLink = page.getByRole('link', { name: /ver planes pro|view pro plans/i });
    if (await upgradeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await upgradeLink.click();
      await expect(page).toHaveURL(/.*pricing/);
      await expect(page.getByRole('heading', { name: /planes y precios|plans and pricing/i })).toBeVisible();
      return;
    }

    await openPricing(page);
  });

  test('display plan features comparison', async ({ page }) => {
    await openPricing(page);

    await expect(page.getByText(/básico|basic/i)).toBeVisible();
    await expect(page.getByText(/^pro$/i)).toBeVisible();
    await expect(page.getByText(/^business$/i)).toBeVisible();
    await expect(page.getByText(/eventos ilimitados|unlimited events/i)).toBeVisible();
    await expect(page.getByText(/portal del cliente con tu marca|client portal with your brand/i)).toBeVisible();
  });

  test('show plan limits for current user', async ({ page }) => {
    await page.goto('/settings?tab=subscription');
    await expect(page.getByRole('heading', { name: /suscripción y facturación|subscription and billing/i })).toBeVisible();
    await expect(page.getByText(/eventos este mes|events this month/i)).toBeVisible();
    await expect(page.getByText(/clientes registrados|registered clients/i)).toBeVisible();
  });

  test('initiate upgrade to Pro plan', async ({ page }) => {
    await page.route('**/api/subscriptions/checkout-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'http://localhost:5173/pricing?checkout=simulated',
        }),
      });
    });

    await openPricing(page);
    const upgradeBtn = page.getByRole('button', { name: /suscribirse al plan pro|subscribe to pro plan/i });
    await expect(upgradeBtn).toBeVisible();
    await upgradeBtn.click();

    await expect(page).toHaveURL(/.*checkout=simulated/);
  });

  test('show upgrade prompt when reaching plan limits', async ({ page }) => {
    await page.goto('/settings?tab=subscription');
    const upgradeBtn = page.getByRole('button', {
      name: /mejorar a pro para límites ilimitados|upgrade to pro for unlimited limits/i,
    });

    await expect(upgradeBtn).toBeVisible();
    await upgradeBtn.click();
    await expect(page).toHaveURL(/.*pricing/);
  });

  test('manage billing through customer portal', async ({ page }) => {
    await page.route('**/api/subscriptions/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          plan: 'pro',
          has_stripe_account: true,
          subscription: {
            provider: 'stripe',
            status: 'active',
            cancel_instructions: 'You can manage billing from portal',
          },
        }),
      });
    });
    await page.route('**/api/subscriptions/portal-session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'http://localhost:5173/settings?tab=subscription&portal=simulated',
        }),
      });
    });

    await page.goto('/settings?tab=subscription');
    const manageBtn = page.getByRole('button', { name: /gestionar suscripción|manage subscription/i });
    await expect(manageBtn).toBeVisible();
    await manageBtn.click();

    await expect(page).toHaveURL(/.*portal=simulated/);
  });

  test('display Pro features correctly after upgrade', async ({ page }) => {
    await openPricing(page);

    const debugBtn = page.getByRole('button', {
      name: /modo desarrollo - actualizar a pro sin pago|\[dev\] upgrade/i,
    });
    await expect(debugBtn).toBeVisible();

    const dialogPromise = page.waitForEvent('dialog');
    await debugBtn.click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toMatch(/plan actualizado a pro|plan updated to pro/i);
    await dialog.accept();

    await expect(page.getByRole('button', { name: /plan pro - tu plan actual|pro plan - your current plan/i })).toBeVisible();
  });

  test('handle downgrade scenario', async ({ page }) => {
    await openPricing(page);
    await expect(page.getByRole('button', { name: /plan básico - plan actual|basic plan - current plan/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /suscribirse al plan pro|subscribe to pro plan/i })).toBeVisible();
  });

  test('show error when checkout session fails', async ({ page }) => {
    await page.route('**/api/subscriptions/checkout-session', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Stripe not configured' }),
      });
    });

    await openPricing(page);
    const upgradeBtn = page.getByRole('button', { name: /suscribirse al plan pro|subscribe to pro plan/i });
    await upgradeBtn.click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/hubo un error al iniciar el proceso de pago|error starting the checkout process/i)).toBeVisible();
  });
});
