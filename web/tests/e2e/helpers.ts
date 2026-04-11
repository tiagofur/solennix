import { Page, expect, request as pwRequest } from '@playwright/test';

/**
 * Cache the backend health check per test run so we don't hammer the
 * endpoint for every test in every spec file. The cache is per-process
 * which is fine because Playwright workers are isolated processes.
 */
let backendReachableCache: boolean | null = null;

/**
 * Hits the backend's /health endpoint directly (not through the dev
 * server proxy) to determine whether the API is actually up. Used by
 * the Playwright specs to skip tests that require a live backend when
 * the developer (or CI) hasn't started one.
 *
 * The base URL is fixed to `http://localhost:8080` because that is:
 *   1. The default dev port for the Go server (see backend/cmd/server).
 *   2. What the `frontend-e2e` CI job assumes via
 *      `VITE_API_URL=http://localhost:8080/api` in its build env.
 *
 * If you run the backend on a different port locally, set
 * `PLAYWRIGHT_BACKEND_URL=http://localhost:PORT` before running the
 * tests.
 */
export async function isBackendAvailable(): Promise<boolean> {
  if (backendReachableCache !== null) {
    return backendReachableCache;
  }
  const baseUrl = process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://localhost:8080';
  try {
    const ctx = await pwRequest.newContext({ baseURL: baseUrl, timeout: 2000 });
    const res = await ctx.get('/health');
    backendReachableCache = res.ok();
    await ctx.dispose();
  } catch {
    backendReachableCache = false;
  }
  return backendReachableCache;
}

/**
 * Check if the app is properly configured (backend is running).
 * Returns true when the test should be skipped because there's no
 * backend reachable — covers both the legacy "Configuración Requerida"
 * setup screen and the more common case of the backend simply being
 * offline (no network error is shown to the user, the app just fails
 * API calls silently).
 */
export async function isSetupRequired(page: Page): Promise<boolean> {
  // First, the direct backend probe — this is the authoritative signal
  // and works whether or not the app renders a setup screen.
  const backendUp = await isBackendAvailable();
  if (!backendUp) return true;

  // Legacy fallback: some older setups show a "Configuración Requerida"
  // screen when critical env vars are missing. Keep the check so those
  // environments still skip correctly.
  const setupHeading = page.getByText('Configuración Requerida');
  try {
    await setupHeading.waitFor({ timeout: 500 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Login with email and password
 * Assumes you're on the login page
 *
 * Note on the password selector: both Login.tsx and Register.tsx render a
 * <label for="password">Contraseña</label> paired with an <input#password>
 * AND a "show password" toggle <button aria-label="Mostrar contraseña">.
 * A bare `getByLabel('Contraseña')` matches both because Playwright treats
 * aria-label as a label source. `exact: true` forces the accessible-name
 * match to be strict, which selects only the input.
 */
export async function login(page: Page, email: string, password: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
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
  // See the note in login() about `exact: true` on the password field.
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
