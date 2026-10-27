import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import playwright from '../../../../../web/node_modules/playwright/index.js';

const { chromium } = playwright;

const here = dirname(fileURLToPath(import.meta.url));
const marketing = resolve(here, '../../..');
const output = resolve(here, '../out');

const formats = {
  portrait: { width: 1080, height: 1350, label: 'Instagram / Facebook 4:5' },
  vertical: { width: 1080, height: 1920, label: 'Reels / Stories / TikTok / Shorts 9:16' },
  square: { width: 1080, height: 1080, label: 'Instagram / Facebook / LinkedIn 1:1' },
  pinterest: { width: 1000, height: 1500, label: 'Pinterest 2:3' },
  landscape: { width: 1280, height: 720, label: 'YouTube / LinkedIn 16:9' },
};

const concepts = [
  {
    slug: '01-platform',
    eyebrow: 'GESTIÓN PARA PROFESIONALES DE EVENTOS',
    headline: 'Tu talento crea.\nSolennix organiza.',
    body: 'Eventos, clientes, cotizaciones, pagos e inventario en un solo lugar.',
    screen: 'ios_screens/final/iphone/01-dashboard.png',
    formats: ['portrait', 'vertical', 'square', 'pinterest', 'landscape'],
    accent: '#C4A265',
  },
  {
    slug: '02-seven-places',
    eyebrow: 'MENOS CAOS. MÁS CONTROL.',
    headline: 'Tu evento no debería vivir en 7 lugares.',
    body: 'Centraliza la operación sin cambiar tu forma de crear.',
    screen: 'ios_screens/final/iphone/03-eventos-lista.png',
    formats: ['portrait', 'vertical', 'square'],
    accent: '#D8BC82',
  },
  {
    slug: '03-one-version',
    eyebrow: 'TODO EL EQUIPO, ALINEADO',
    headline: 'Un evento.\nUna sola versión.',
    body: 'Consulta la información que importa desde web, iPhone y Android.',
    screen: 'ios_screens/final/iphone/04-evento-detalle.png',
    formats: ['portrait', 'vertical', 'square'],
    accent: '#C4A265',
  },
  {
    slug: '04-first-event',
    eyebrow: 'EMPIEZA SIN COMPLICARTE',
    headline: 'No migres todo.\nEmpieza con un evento.',
    body: 'Prueba tu flujo real y decide con experiencia, no con promesas.',
    screen: 'ios_screens/final/iphone/09-inventario.png',
    formats: ['portrait', 'vertical', 'square', 'pinterest'],
    accent: '#E0C991',
  },
  {
    slug: '05-payments',
    eyebrow: 'TU OPERACIÓN, BAJO CONTROL',
    headline: 'Cotiza. Organiza.\nControla tus pagos.',
    body: 'Registra cobros externos y detecta pendientes antes de que se vuelvan urgentes.',
    screen: 'ios_screens/final/iphone/05-evento-pagos.png',
    formats: ['portrait', 'vertical', 'square'],
    accent: '#C4A265',
  },
];

function mime(path) {
  return extname(path) === '.svg' ? 'image/svg+xml' : 'image/png';
}

async function dataUrl(path) {
  const bytes = await readFile(path);
  return `data:${mime(path)};base64,${bytes.toString('base64')}`;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('\n', '<br>');
}

function layoutClass(format) {
  if (format === 'landscape') return 'landscape';
  if (format === 'square') return 'square';
  return 'tall';
}

function pageHtml({ concept, format, logo, screen }) {
  const { width, height } = formats[format];
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  html, body { width: ${width}px; height: ${height}px; margin: 0; overflow: hidden; }
  body { font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .canvas {
    position: relative; width: 100%; height: 100%; overflow: hidden;
    background:
      radial-gradient(circle at 82% 18%, rgba(196,162,101,.24), transparent 27%),
      radial-gradient(circle at 18% 88%, rgba(255,255,255,.08), transparent 32%),
      linear-gradient(145deg, #101B31 0%, #1B2A4A 57%, #263A61 100%);
    color: #fff;
  }
  .grain { position: absolute; inset: 0; opacity: .22; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.13'/%3E%3C/svg%3E"); }
  .frame { position: absolute; inset: 44px; border: 1px solid rgba(255,255,255,.14); border-radius: 36px; }
  .brand { position: absolute; top: 72px; left: 78px; width: 250px; height: auto; z-index: 3; }
  .copy { position: absolute; left: 78px; top: 255px; width: 67%; z-index: 3; }
  .eyebrow { color: ${concept.accent}; font-size: 23px; font-weight: 800; letter-spacing: 2.1px; margin-bottom: 28px; }
  h1 { font-family: Georgia, "Times New Roman", serif; margin: 0; font-size: 78px; line-height: .98; letter-spacing: -2.5px; font-weight: 700; text-wrap: balance; }
  .body { margin-top: 34px; max-width: 670px; color: rgba(255,255,255,.82); font-size: 30px; line-height: 1.32; font-weight: 450; }
  .cta { position: absolute; left: 78px; bottom: 70px; z-index: 5; display: inline-flex; align-items: center; gap: 18px; background: #F5F0E8; color: #1B2A4A; padding: 23px 31px; border-radius: 999px; font-size: 25px; font-weight: 800; box-shadow: 0 20px 50px rgba(4,10,24,.25); }
  .cta::after { content: '→'; color: #A47E3B; font-size: 32px; line-height: 1; }
  .note { position: absolute; right: 76px; bottom: 79px; z-index: 5; color: rgba(255,255,255,.65); font-size: 18px; font-weight: 600; }
  .phone { position: absolute; right: -55px; bottom: -235px; width: 540px; height: 1175px; padding: 17px; border-radius: 72px; background: #0B0E14; box-shadow: -30px 35px 100px rgba(0,0,0,.42); transform: rotate(4deg); z-index: 2; }
  .phone img { width: 100%; height: 100%; object-fit: cover; border-radius: 56px; }
  .gold-line { position: absolute; right: 370px; bottom: 475px; width: 190px; height: 2px; background: linear-gradient(90deg, transparent, ${concept.accent}); transform: rotate(-18deg); opacity: .65; }

  .square .brand { top: 62px; left: 70px; width: 230px; }
  .square .copy { top: 210px; left: 70px; width: 68%; }
  .square h1 { font-size: 68px; }
  .square .body { font-size: 27px; max-width: 610px; margin-top: 25px; }
  .square .eyebrow { font-size: 20px; margin-bottom: 22px; }
  .square .phone { width: 410px; height: 890px; right: -70px; bottom: -315px; border-radius: 55px; padding: 13px; }
  .square .phone img { border-radius: 43px; }
  .square .cta { bottom: 55px; left: 70px; padding: 19px 27px; font-size: 22px; }
  .square .note { bottom: 64px; font-size: 16px; }

  .tall .copy { top: 270px; width: 74%; }
  .tall .phone { right: -40px; bottom: -165px; width: 565px; height: 1228px; }
  .tall .cta { bottom: 76px; }
  .tall .note { bottom: 86px; }

  .landscape .frame { inset: 30px; border-radius: 28px; }
  .landscape .brand { top: 55px; left: 64px; width: 220px; }
  .landscape .copy { left: 64px; top: 176px; width: 61%; }
  .landscape .eyebrow { font-size: 17px; margin-bottom: 18px; }
  .landscape h1 { font-size: 61px; line-height: 1; }
  .landscape .body { margin-top: 20px; font-size: 22px; max-width: 620px; }
  .landscape .cta { left: 64px; bottom: 46px; font-size: 19px; padding: 16px 23px; }
  .landscape .note { right: 52px; bottom: 52px; font-size: 14px; }
  .landscape .phone { width: 355px; height: 770px; right: 62px; bottom: -155px; border-radius: 48px; padding: 11px; transform: rotate(4deg); }
  .landscape .phone img { border-radius: 37px; }
  .landscape .gold-line { display: none; }
</style>
</head>
<body>
  <main class="canvas ${layoutClass(format)}">
    <div class="grain"></div><div class="frame"></div>
    <img class="brand" src="${logo}" alt="Solennix">
    <section class="copy">
      <div class="eyebrow">${escapeHtml(concept.eyebrow)}</div>
      <h1>${escapeHtml(concept.headline)}</h1>
      <div class="body">${escapeHtml(concept.body)}</div>
    </section>
    <div class="gold-line"></div>
    <div class="phone"><img src="${screen}" alt="Captura real de Solennix"></div>
    <div class="cta">Crea tu primer evento gratis</div>
    <div class="note">solennix.com</div>
  </main>
</body>
</html>`;
}

await mkdir(output, { recursive: true });
const logo = await dataUrl(join(marketing, 'logos/svg/solennix-logo-horizontal-light.svg'));
const manifest = [];
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
    ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});

try {
  for (const concept of concepts) {
    const screen = await dataUrl(join(marketing, concept.screen));
    for (const format of concept.formats) {
      const spec = formats[format];
      const name = `${concept.slug}-${format}-${spec.width}x${spec.height}.png`;
      const page = await browser.newPage({ viewport: { width: spec.width, height: spec.height }, deviceScaleFactor: 1 });
      await page.setContent(pageHtml({ concept, format, logo, screen }), { waitUntil: 'load' });
      await page.screenshot({ path: join(output, name), type: 'png' });
      await page.close();
      manifest.push({
        file: name,
        format: spec.label,
        dimensions: `${spec.width}x${spec.height}`,
        alt: `${concept.headline.replaceAll('\n', ' ')} Captura de la aplicación Solennix.`,
      });
    }
  }
} finally {
  await browser.close();
}

const rows = ['file,format,dimensions,alt', ...manifest.map((item) =>
  [item.file, item.format, item.dimensions, item.alt]
    .map((value) => `"${value.replaceAll('"', '""')}"`)
    .join(','))];
await writeFile(join(output, 'manifest.csv'), `${rows.join('\n')}\n`);
console.log(`Rendered ${manifest.length} campaign assets in ${output}`);
