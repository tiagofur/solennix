import { test, expect } from '@playwright/test';
import { skipIfBackendUnavailable, setupTestUser, isSetupRequired } from './helpers';
import type { Page } from '@playwright/test';

/**
 * E2E coverage for the event-form date picker (parity of iOS #699 / Android #696).
 * These tests seed unavailable-date ranges through the API, then exercise the
 * react-day-picker form picker end-to-end:
 *   - REQ-1 visual parity (.rdp-unavailable strikethrough)
 *   - REQ-2 disable-select (native `disabled` on blocked days)
 *   - REQ-3 auto-skip of a blocked local-today on CREATE
 *   - REQ-7 save-guard rejects a blocked submit (ES + EN)
 *
 * All tests require a live backend and skip otherwise (see helpers).
 */

const API_BASE = process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://localhost:8080/api';

async function postJson(page: Page, path: string, body: unknown) {
  return page.evaluate(
    async ({ apiUrl, path, body }) => {
      const res = await fetch(`${apiUrl}${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`${path} -> ${res.status}`);
      return res.json();
    },
    { apiUrl: API_BASE, path, body },
  );
}

/** Create an unavailable-date range covering a single LOCAL yyyy-MM-dd day. */
async function blockDay(page: Page, iso: string) {
  await postJson(page, '/unavailable-dates', {
    start_date: iso,
    end_date: iso,
    reason: 'E2E blocked date',
  });
}

const localIso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Locate a visible (non-outside) day button by its day-of-month number. */
const dayButton = (page: Page, n: number) =>
  page
    .locator('.rdp-day_button', { hasText: String(n) })
    .filter({ hasNot: page.locator('.rdp-day_outside') })
    .first();

test.describe('Event form — blocked dates picker', () => {
  test.beforeEach(async ({ page }) => {
    await setupTestUser(page);
    await skipIfBackendUnavailable(page, 'Backend not configured — skipping event-form e2e');
  });

  test('blocked day is struck-through (.rdp-unavailable) and disable-select (REQ-1, REQ-2)', async ({
    page,
  }) => {
    test.skip(await isSetupRequired(page), 'no backend');

    const blocked = new Date();
    blocked.setDate(blocked.getDate() + 7); // a free day a week out
    const iso = localIso(blocked);
    await blockDay(page, iso);

    // Prefill the blocked date so the picker opens on its month (and is NOT
    // auto-skipped, REQ-4 explicit-prefill branch).
    await page.goto(`/events/new?date=${iso}`);
    await expect(page.getByRole('heading', { name: /nuevo evento|new event/i })).toBeVisible();

    // The shared strikethrough class is applied to the blocked day.
    await expect(page.locator('.rdp-unavailable').first()).toBeVisible();
    // The blocked day button is natively disabled (Fix 2: not just aria-disabled).
    const btn = dayButton(page, blocked.getDate());
    await expect(btn).toBeDisabled();
  });

  test('auto-skips a blocked local-today on CREATE (REQ-3)', async ({ page }) => {
    test.skip(await isSetupRequired(page), 'no backend');

    const today = new Date();
    await blockDay(page, localIso(today));

    await page.goto('/events/new');
    await expect(page.getByRole('heading', { name: /nuevo evento|new event/i })).toBeVisible();

    // Give the data-ready gate a beat to resolve + skip.
    const selected = page.locator('.rdp-selected').first();
    await expect(selected).toBeVisible({ timeout: 10_000 });
    // The selected (advanced) day must NOT be today's day-of-month.
    await expect(selected).not.toContainText(String(today.getDate()));
  });

  test('save guard rejects a blocked date on submit (REQ-7, ES)', async ({ page }) => {
    test.skip(await isSetupRequired(page), 'no backend');

    const blocked = new Date();
    blocked.setDate(blocked.getDate() + 14);
    const iso = localIso(blocked);
    await blockDay(page, iso);

    await page.goto(`/events/new?date=${iso}`);
    await expect(page.getByRole('heading', { name: /nuevo evento|new event/i })).toBeVisible();

    // Fill the required fields so the wizard lets us reach the final submit.
    await page.getByLabel(/cliente/i).first().selectOption({ index: 1 });
    await page.getByLabel(/tipo de servicio|service type/i).fill('Boda E2E');
    await page.getByLabel(/número de personas|number of people/i).fill('50');

    // Step through the wizard to the final "Guardar Evento".
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /siguiente|next/i }).first().click();
    }
    await page.getByRole('button', { name: /guardar evento|save event/i }).click();

    // The save guard surfaces the existing i18n key (REQ-7, REQ-10).
    await expect(page.getByText('La fecha seleccionada no está disponible.')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('save guard rejection localized to EN (REQ-7, REQ-10)', async ({ page }) => {
    test.skip(await isSetupRequired(page), 'no backend');

    const blocked = new Date();
    blocked.setDate(blocked.getDate() + 21);
    const iso = localIso(blocked);
    await blockDay(page, iso);

    // Force English for this run.
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('i18nextLng', 'en'));
    await page.goto(`/events/new?date=${iso}`);
    await expect(page.getByRole('heading', { name: /new event/i })).toBeVisible();

    await page.getByLabel(/cliente|client/i).first().selectOption({ index: 1 });
    await page.getByLabel(/service type/i).fill('E2E Wedding');
    await page.getByLabel(/number of people/i).fill('50');

    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: /siguiente|next/i }).first().click();
    }
    await page.getByRole('button', { name: /guardar evento|save event/i }).click();

    await expect(page.getByText('The selected date is not available.')).toBeVisible({
      timeout: 10_000,
    });
  });
});
