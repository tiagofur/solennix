/**
 * Capture real Web screenshots for the public user manual.
 *
 * Prerequisites:
 * - Web dev server (MANUAL_BASE_URL, default http://localhost:5174)
 * - Backend (PLAYWRIGHT_BACKEND_URL, default http://localhost:8081)
 * - Optional login: MANUAL_EMAIL / MANUAL_PASSWORD
 *   (defaults: manual-demo@solennix.test / ManualDemo123!)
 *
 * Usage (from web/):
 *   MANUAL_BASE_URL=http://localhost:5174 \
 *   PLAYWRIGHT_BACKEND_URL=http://localhost:8081 \
 *   npm run manual:screenshots
 */

import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public/help/manual/web");
const BASE = process.env.MANUAL_BASE_URL ?? "http://localhost:5174";
const BACKEND = (
  process.env.PLAYWRIGHT_BACKEND_URL ?? "http://localhost:8081"
).replace(/\/$/, "");
const EMAIL = process.env.MANUAL_EMAIL ?? "manual-demo@solennix.test";
const PASSWORD = process.env.MANUAL_PASSWORD ?? "ManualDemo123!";

/**
 * @typedef {{ file: string, path?: string, auth?: boolean, after?: (page: import('@playwright/test').Page) => Promise<void> }} Shot
 */

/** @type {Shot[]} */
const PUBLIC_SHOTS = [
  { file: "cuenta-y-acceso-1.png", path: "/" },
  { file: "cuenta-y-acceso-2.png", path: "/register" },
];

/** @type {Shot[]} */
const AUTH_SHOTS = [
  { file: "que-es-solennix-1.png", path: "/dashboard", auth: true },
  { file: "cuenta-y-acceso-3.png", path: "/dashboard", auth: true },
  { file: "crear-cliente-1.png", path: "/clients", auth: true },
  { file: "crear-cliente-2.png", path: "/clients/new", auth: true },
  {
    file: "crear-cliente-3.png",
    path: "/clients/new",
    auth: true,
    after: async (page) => {
      await fillIfVisible(page, /nombre/i, "Sofía & Martín — Demo");
      await fillIfVisible(page, /correo|email/i, "sofia.martin@example.com");
      await fillIfVisible(page, /tel[eé]fono|phone/i, "+52 55 1234 5678");
      await page.waitForTimeout(300);
    },
  },
  { file: "crear-cliente-4.png", path: "/clients", auth: true },
  { file: "crear-producto-1.png", path: "/products", auth: true },
  { file: "crear-producto-2.png", path: "/products/new", auth: true },
  {
    file: "crear-producto-3.png",
    path: "/products/new",
    auth: true,
    after: async (page) => {
      await fillIfVisible(page, /^nombre$/i, "Paquete Decoración Premium");
      await fillIfVisible(page, /precio|price/i, "15000");
      await fillIfVisible(
        page,
        /descripci[oó]n|description/i,
        "Centro de mesa, luces y montaje",
      );
      await page.waitForTimeout(300);
    },
  },
  { file: "crear-producto-4.png", path: "/products", auth: true },
  { file: "crear-inventario-1.png", path: "/inventory", auth: true },
  { file: "crear-inventario-2.png", path: "/inventory/new", auth: true },
  {
    file: "crear-inventario-3.png",
    path: "/inventory/new",
    auth: true,
    after: async (page) => {
      await fillIfVisible(page, /nombre|ingredient/i, "Sillas Tiffany");
      await fillIfVisible(page, /stock|cantidad|actual/i, "20");
      await page.waitForTimeout(300);
    },
  },
  { file: "crear-inventario-4.png", path: "/inventory", auth: true },
  { file: "crear-evento-1.png", path: "/events", auth: true },
  { file: "crear-evento-2.png", path: "/events/new", auth: true },
  {
    file: "crear-evento-3.png",
    path: "/events/new",
    auth: true,
    after: async (page) => {
      await fillIfVisible(page, /nombre del evento|event name|^nombre$/i, "Casamiento Sofía & Martín");
      await fillIfVisible(page, /ubicaci[oó]n|location/i, "CDMX");
      await page.waitForTimeout(400);
    },
  },
  {
    file: "crear-evento-4.png",
    path: "/events",
    auth: true,
  },
  {
    file: "armar-cotizacion-1.png",
    path: "/cotizacion-rapida",
    auth: true,
  },
  {
    file: "armar-cotizacion-2.png",
    path: "/cotizacion-rapida",
    auth: true,
    after: async (page) => {
      // Prefer adding catalog product if UI exposes it
      const addBtn = page.getByRole("button", {
        name: /agregar|añadir|producto|add/i,
      }).first();
      if (await addBtn.count()) {
        await addBtn.click().catch(() => {});
        await page.waitForTimeout(400);
      }
    },
  },
  {
    file: "armar-cotizacion-3.png",
    path: "/cotizacion-rapida",
    auth: true,
  },
  {
    file: "armar-cotizacion-4.png",
    path: "/cotizacion-rapida",
    auth: true,
  },
  {
    file: "compartir-cotizacion-1.png",
    path: "/cotizacion-rapida",
    auth: true,
    after: async (page) => {
      const pdf = page.getByRole("button", { name: /pdf|exportar|descargar|generar/i }).first();
      if (await pdf.count()) {
        await pdf.scrollIntoViewIfNeeded().catch(() => {});
      }
    },
  },
  {
    file: "compartir-cotizacion-2.png",
    path: "/cotizacion-rapida",
    auth: true,
  },
  {
    file: "compartir-cotizacion-3.png",
    path: "/events",
    auth: true,
  },
];

async function backendOk() {
  try {
    const res = await fetch(`${BACKEND}/health`, {
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {RegExp} label
 * @param {string} value
 */
async function fillIfVisible(page, label, value) {
  const field = page.getByLabel(label).first();
  if (await field.count()) {
    try {
      await field.fill(value);
    } catch {
      // ignore non-fillable
    }
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel(/correo electrónico|email/i).fill(EMAIL);
  await page.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 20_000 });
  await page.waitForTimeout(800);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {Shot} shot
 */
async function captureShot(page, shot) {
  if (shot.path) {
    await page.goto(`${BASE}${shot.path}`, {
      waitUntil: "networkidle",
      timeout: 45_000,
    }).catch(async () => {
      await page.goto(`${BASE}${shot.path}`, { waitUntil: "domcontentloaded" });
    });
  }
  await page.waitForTimeout(700);
  if (shot.after) await shot.after(page);
  await page.waitForTimeout(300);
  const dest = path.join(OUT, shot.file);
  await page.screenshot({ path: dest, fullPage: false });
  console.log("✓", shot.file);
  return shot.file;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const healthy = await backendOk();
  const publicOnly =
    process.env.MANUAL_PUBLIC_ONLY === "1" || !healthy;

  if (publicOnly) {
    console.warn(
      `Backend not healthy at ${BACKEND}/health — public pages only.`,
    );
  } else {
    console.log(`Backend OK at ${BACKEND}`);
  }

  const browser = await chromium.launch();
  /** @type {string[]} */
  const captured = [];

  // Public shots in a clean context
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "es-MX",
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    for (const shot of PUBLIC_SHOTS) {
      captured.push(await captureShot(page, shot));
    }
    await ctx.close();
  }

  if (!publicOnly) {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "es-MX",
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    console.log(`Logging in as ${EMAIL}…`);
    await login(page);
    for (const shot of AUTH_SHOTS) {
      try {
        captured.push(await captureShot(page, shot));
      } catch (err) {
        console.error("✗", shot.file, err instanceof Error ? err.message : err);
      }
    }
    await ctx.close();
  } else {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "es-MX",
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/help/manual`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(OUT, "que-es-solennix-1.png"),
      fullPage: false,
    });
    console.log("✓ que-es-solennix-1.png (from /help/manual)");
    captured.push("que-es-solennix-1.png");
    await ctx.close();
  }

  await writeFile(
    path.join(OUT, "CAPTURE_LOG.txt"),
    `Captured ${new Date().toISOString()}\nBase: ${BASE}\nBackend: ${BACKEND}\npublicOnly=${publicOnly}\nFiles:\n${captured.join("\n")}\n`,
  );

  await browser.close();
  console.log(`\nDone. ${captured.length} PNGs in ${OUT}`);
  console.log(
    "Update userManual.ts image fields from .svg → .png for captured steps.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
