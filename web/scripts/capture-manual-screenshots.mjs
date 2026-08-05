/**
 * Capture real Web screenshots for the public user manual.
 *
 * Prerequisites:
 * - Web dev server (or set MANUAL_BASE_URL)
 * - Backend healthy on PLAYWRIGHT_BACKEND_URL (default http://localhost:8080)
 *
 * Usage (from web/):
 *   node scripts/capture-manual-screenshots.mjs
 *
 * Writes PNG files to public/help/manual/web/ and prints which SVG
 * placeholders can be retired once content points at the new PNGs.
 */

import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/help/manual/web");
const BASE = process.env.MANUAL_BASE_URL ?? "http://localhost:5173";
const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL ?? "http://localhost:8080";

/** @type {{ file: string, path: string, auth?: boolean, setup?: (page: import('@playwright/test').Page) => Promise<void> }[]} */
const SHOTS = [
  { file: "cuenta-y-acceso-1.png", path: "/", auth: false },
  { file: "cuenta-y-acceso-2.png", path: "/register", auth: false },
  { file: "que-es-solennix-1.png", path: "/dashboard", auth: true },
  { file: "cuenta-y-acceso-3.png", path: "/dashboard", auth: true },
  { file: "crear-cliente-1.png", path: "/clients", auth: true },
  { file: "crear-cliente-2.png", path: "/clients/new", auth: true },
  { file: "crear-producto-1.png", path: "/products", auth: true },
  { file: "crear-producto-2.png", path: "/products/new", auth: true },
  { file: "crear-inventario-1.png", path: "/inventory", auth: true },
  { file: "crear-inventario-2.png", path: "/inventory/new", auth: true },
  { file: "crear-evento-1.png", path: "/events", auth: true },
  { file: "crear-evento-2.png", path: "/events/new", auth: true },
];

async function backendOk() {
  try {
    const res = await fetch(`${BACKEND}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function registerDemo(page) {
  const email = `manual-demo-${Date.now()}@solennix.test`;
  const password = "ManualDemo123!";
  await page.goto(`${BASE}/register`);
  await page.getByLabel(/correo|email/i).fill(email);
  const nameField = page.getByLabel(/nombre/i).first();
  if (await nameField.count()) await nameField.fill("Manual Demo");
  await page.getByLabel(/contraseña|password/i).first().fill(password);
  const confirm = page.getByLabel(/confirmar|confirm/i);
  if (await confirm.count()) await confirm.fill(password);
  await page.getByRole("button", { name: /crear|registr|sign up|register/i }).click();
  await page.waitForURL(/dashboard|verify|login/i, { timeout: 20_000 }).catch(() => {});
  return { email, password };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const publicOnly = process.env.MANUAL_PUBLIC_ONLY === "1" || !(await backendOk());
  if (publicOnly) {
    console.warn(
      `Backend not reachable at ${BACKEND}/health — capturing public pages only. Set MANUAL_PUBLIC_ONLY=0 and start API for full set.`,
    );
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "es-MX",
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  /** @type {string[]} */
  const captured = [];

  if (!publicOnly) {
    console.log("Registering demo user…");
    await registerDemo(page);
  }

  for (const shot of SHOTS) {
    if (shot.auth && publicOnly) {
      console.log("skip (auth)", shot.file);
      continue;
    }

    if (!shot.auth) {
      const anon = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        locale: "es-MX",
        deviceScaleFactor: 2,
      });
      const p = await anon.newPage();
      await p.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle" });
      await p.waitForTimeout(500);
      const dest = path.join(OUT, shot.file);
      await p.screenshot({ path: dest, fullPage: false });
      console.log("✓", shot.file);
      captured.push(shot.file);
      await anon.close();
      continue;
    }

    await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle" }).catch(async () => {
      await page.goto(`${BASE}${shot.path}`);
    });
    await page.waitForTimeout(600);
    const dest = path.join(OUT, shot.file);
    await page.screenshot({ path: dest, fullPage: false });
    console.log("✓", shot.file);
    captured.push(shot.file);
  }

  // Manual hub is useful as “qué es” overview when dashboard auth shot is unavailable
  if (publicOnly) {
    await page.goto(`${BASE}/help/manual`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUT, "que-es-solennix-1.png"),
      fullPage: false,
    });
    console.log("✓ que-es-solennix-1.png (from /help/manual)");
    captured.push("que-es-solennix-1.png");
  }

  await writeFile(
    path.join(OUT, "CAPTURE_LOG.txt"),
    `Captured ${new Date().toISOString()}\nBase: ${BASE}\npublicOnly=${publicOnly}\nFiles:\n${captured.join("\n")}\n`,
  );

  await browser.close();
  console.log(`\nDone. ${captured.length} PNGs in ${OUT}`);
  console.log(
    "Next: point userManual image fields from .svg placeholders to these .png files where quality is good.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
