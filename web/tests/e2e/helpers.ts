import { Page, expect } from '@playwright/test';

/**
 * Check if the app is properly configured (backend is running)
 * Returns true if setup is required, false if app is ready
 */
export async function isSetupRequired(page: Page): Promise<boolean> {
  const setupHeading = page.getByText('Configuración Requerida');
  try {
    await setupHeading.waitFor({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Login with email and password
 * Assumes you're on the login page
 */
export async function login(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  // Wait for navigation to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
}

/**
 * Register a new user (for test setup)
 */
export async function register(page: Page, email: string, password: string, name: string) {
  await page.goto('/register');

  if (await isSetupRequired(page)) {
    return false; // Skip if backend not configured
  }

  await page.getByLabel('Nombre').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByLabel('Confirmar Contraseña').fill(password);
  await page.getByRole('button', { name: /crear cuenta/i }).click();

  // Wait for dashboard or error
  try {
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    return true;
  } catch {
    // User might already exist - try logging in
    await page.goto('/login');
    await login(page, email, password);
    return true;
  }
}

/**
 * Setup test user - register or login
 */
export async function setupTestUser(page: Page) {
  const testEmail = `test-${Date.now()}@playwright.test`;
  const testPassword = 'TestPassword123!';
  const testName = 'Playwright Test User';

  await register(page, testEmail, testPassword, testName);

  return { email: testEmail, password: testPassword, name: testName };
}

/**
 * Navigate to a page and ensure it loaded
 */
export async function navigateTo(page: Page, path: string, expectedHeading: string | RegExp) {
  await page.goto(path);
  await expect(page.getByRole('heading', { name: expectedHeading })).toBeVisible();
}
