/**
 * Sync marketing store screenshots into public manual paths for iOS/Android.
 *
 * Usage (from web/):
 *   node scripts/sync-manual-mobile-assets.mjs
 */

import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");

const IOS_SRC = path.join(ROOT, "docs/Marketing/ios_screens/final/iphone");
const ANDROID_SRC = path.join(ROOT, "docs/Marketing/smartphone/final");
const IOS_OUT = path.join(ROOT, "web/public/help/manual/ios");
const ANDROID_OUT = path.join(ROOT, "web/public/help/manual/android");

/** @type {Record<string, string>} dest basename → source filename under platform src */
const IOS_MAP = {
  "que-es-solennix-1.png": "01-dashboard.png",
  "cuenta-y-acceso-1.png": "01-dashboard.png",
  "cuenta-y-acceso-2.png": "01-dashboard.png",
  "cuenta-y-acceso-3.png": "01-dashboard.png",
  "crear-cliente-1.png": "06-clientes.png",
  "crear-cliente-2.png": "06-clientes.png",
  "crear-cliente-3.png": "07-cliente-detalle.png",
  "crear-cliente-4.png": "07-cliente-detalle.png",
  "crear-producto-1.png": "08-productos.png",
  "crear-producto-2.png": "08-productos.png",
  "crear-producto-3.png": "08-productos.png",
  "crear-producto-4.png": "08-productos.png",
  "crear-inventario-1.png": "09-inventario.png",
  "crear-inventario-2.png": "09-inventario.png",
  "crear-inventario-3.png": "09-inventario.png",
  "crear-inventario-4.png": "09-inventario.png",
  "crear-evento-1.png": "03-eventos-lista.png",
  "crear-evento-2.png": "03-eventos-lista.png",
  "crear-evento-3.png": "04-evento-detalle.png",
  "crear-evento-4.png": "04-evento-detalle.png",
  "armar-cotizacion-1.png": "04-evento-detalle.png",
  "armar-cotizacion-2.png": "04-evento-detalle.png",
  "armar-cotizacion-3.png": "04-evento-detalle.png",
  "armar-cotizacion-4.png": "04-evento-detalle.png",
  "compartir-cotizacion-1.png": "05-evento-pagos.png",
  "compartir-cotizacion-2.png": "05-evento-pagos.png",
  "compartir-cotizacion-3.png": "03-eventos-lista.png",
  "registrar-pago-1.png": "05-evento-pagos.png",
  "registrar-pago-2.png": "05-evento-pagos.png",
  "registrar-pago-3.png": "05-evento-pagos.png",
};

const ANDROID_MAP = {
  "que-es-solennix-1.png": "01_dashboard.png",
  "cuenta-y-acceso-1.png": "01_dashboard.png",
  "cuenta-y-acceso-2.png": "01_dashboard.png",
  "cuenta-y-acceso-3.png": "01_dashboard.png",
  "crear-cliente-1.png": "05_clientes.png",
  "crear-cliente-2.png": "05_clientes.png",
  "crear-cliente-3.png": "05_clientes.png",
  "crear-cliente-4.png": "05_clientes.png",
  "crear-producto-1.png": "03_detalle_evento.png",
  "crear-producto-2.png": "03_detalle_evento.png",
  "crear-producto-3.png": "03_detalle_evento.png",
  "crear-producto-4.png": "03_detalle_evento.png",
  "crear-inventario-1.png": "03_detalle_evento.png",
  "crear-inventario-2.png": "03_detalle_evento.png",
  "crear-inventario-3.png": "03_detalle_evento.png",
  "crear-inventario-4.png": "03_detalle_evento.png",
  "crear-evento-1.png": "02_eventos.png",
  "crear-evento-2.png": "02_eventos.png",
  "crear-evento-3.png": "03_detalle_evento.png",
  "crear-evento-4.png": "03_detalle_evento.png",
  "armar-cotizacion-1.png": "03_detalle_evento.png",
  "armar-cotizacion-2.png": "03_detalle_evento.png",
  "armar-cotizacion-3.png": "03_detalle_evento.png",
  "armar-cotizacion-4.png": "03_detalle_evento.png",
  "compartir-cotizacion-1.png": "04_pagos.png",
  "compartir-cotizacion-2.png": "04_pagos.png",
  "compartir-cotizacion-3.png": "02_eventos.png",
  "registrar-pago-1.png": "04_pagos.png",
  "registrar-pago-2.png": "04_pagos.png",
  "registrar-pago-3.png": "04_pagos.png",
};

/**
 * @param {string} srcDir
 * @param {string} outDir
 * @param {Record<string, string>} map
 * @param {string} label
 */
async function sync(srcDir, outDir, map, label) {
  await mkdir(outDir, { recursive: true });
  let n = 0;
  for (const [dest, srcName] of Object.entries(map)) {
    await copyFile(path.join(srcDir, srcName), path.join(outDir, dest));
    n += 1;
  }
  console.log(`✓ ${label}: ${n} files → ${outDir}`);
}

await sync(IOS_SRC, IOS_OUT, IOS_MAP, "iOS");
await sync(ANDROID_SRC, ANDROID_OUT, ANDROID_MAP, "Android");
console.log("Done. Re-run after refreshing marketing finals.");
