import { test, expect } from '@playwright/test';
import { isSetupRequired, register } from './helpers';

test.describe('Authentication Flow', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');

    const setupRequired = await isSetupRequired(page);
    if (setupRequired) {
      await expect(page.getByText('Configuración Requerida')).toBeVisible();
    }
    test.skip(setupRequired, 'Backend not configured - skipping auth tests');

    // Verify login form elements
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /registrarse/i })).toBeVisible();
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
    await page.getByLabel('Contraseña').fill('wrongpassword');
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
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
  });
});
