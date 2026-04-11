import { test, expect } from '@playwright/test';
import { isSetupRequired, register } from './helpers';

test.describe('Authentication Flow', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');

    // The login page itself is 100% static (no API calls) so it renders
    // regardless of backend availability. Don't skip this test — verify
    // the form is there even when the backend is offline.

    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    // exact:true excludes the "Mostrar contraseña" toggle button that
    // shares the same substring on its aria-label.
    await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
    // Login page links to Register via "Regístrate gratis"
    await expect(page.getByRole('link', { name: /regístrate/i })).toBeVisible();
  });

  test('register new user successfully', async ({ page }) => {
    const testEmail = `test-${Date.now()}@playwright.test`;
    const testPassword = 'TestPass123!';
    const testName = 'Playwright User';

    const success = await register(page, testEmail, testPassword, testName);

    test.skip(!success, 'Backend not configured');

    // Should redirect to dashboard after registration
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login');

    test.skip(await isSetupRequired(page), 'Backend not configured');

    await page.getByLabel('Email').fill('invalid@example.com');
    await page.getByLabel('Contraseña', { exact: true }).fill('wrongpassword');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    // Should show error message (toast or inline error)
    // Note: Adjust selector based on your actual error display
    await expect(page.locator('text=/incorrect|invalid|error/i')).toBeVisible({ timeout: 5000 });
  });

  test('logout successfully', async ({ page }) => {
    // First register a user
    const testEmail = `test-${Date.now()}@playwright.test`;
    const success = await register(page, testEmail, 'TestPass123!', 'Test User');

    test.skip(!success, 'Backend not configured');

    // Should be on dashboard
    await expect(page).toHaveURL(/.*dashboard/);

    // Find and click logout button (adjust selector as needed)
    const logoutButton = page.getByRole('button', { name: /salir|logout|cerrar sesión/i });
    await logoutButton.click();

    // Should redirect to login page
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('protected routes redirect to login when not authenticated', async ({ page }) => {
    // Navigate somewhere in the app origin first — `localStorage` is
    // scoped to an origin and cannot be accessed on about:blank.
    await page.goto('/login');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
  });
});
