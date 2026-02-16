import { test, expect } from '@playwright/test';

test('login page loads or shows setup required', async ({ page }) => {
  await page.goto('/login');

  // Check if setup required is shown (when no env vars)
  const isSetupRequired = await page.getByText('Configuración Requerida').isVisible();
  
  if (isSetupRequired) {
    await expect(page.getByText('Configuración Requerida')).toBeVisible();
    await expect(page.getByText('Pasos para configurar')).toBeVisible();
    return;
  }

  // Otherwise expect login form
  await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Contraseña')).toBeVisible();
});
