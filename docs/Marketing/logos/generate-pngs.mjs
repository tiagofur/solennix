/**
 * Solennix Brand Asset PNG Generator
 * Converts all SVG logos to PNG at multiple sizes for every platform.
 * Usage: node generate-pngs.mjs
 */
import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PNG_DIR = join(__dirname, 'png');

// Ensure all output directories exist
const dirs = [
  'app-icons', 'favicon', 'social-media', 'dark-bg', 'light-bg',
  'transparent', 'monochrome', 'email', 'og-images', 'ads'
];
dirs.forEach(d => mkdirSync(join(PNG_DIR, d), { recursive: true }));

async function svgToPng(svgPath, outPath, width, height, opts = {}) {
  const svg = readFileSync(svgPath);
  let pipeline = sharp(svg, { density: 300 });

  if (width && height) {
    pipeline = pipeline.resize(width, height, { fit: 'contain', background: opts.bg || { r: 0, g: 0, b: 0, alpha: 0 } });
  } else if (width) {
    pipeline = pipeline.resize(width);
  }

  if (opts.flatten) {
    pipeline = pipeline.flatten({ background: opts.bg || '#1B2A4A' });
  }

  await pipeline.png().toFile(outPath);
  console.log(`  ✓ ${outPath.replace(__dirname + '/', '')}`);
}

async function main() {
  const SVG_DIR = join(__dirname, 'svg');
  // Icons are all filled variants (solid fill for legibility at small sizes)
  const iconFilled = join(SVG_DIR, 'solennix-icon-final-filled.svg');
  const iconTransparentFilled = join(SVG_DIR, 'solennix-icon-transparent-filled.svg');
  const iconWhiteFilled = join(SVG_DIR, 'solennix-icon-white-filled.svg');
  const iconDarkFilled = join(SVG_DIR, 'solennix-icon-dark-filled.svg');
  const iconFilledLight = join(SVG_DIR, 'solennix-icon-final-filled-light.svg');
  const logoH = join(SVG_DIR, 'solennix-logo-horizontal.svg');
  const logoHL = join(SVG_DIR, 'solennix-logo-horizontal-light.svg');
  const logoV = join(SVG_DIR, 'solennix-logo-vertical.svg');
  const logoVL = join(SVG_DIR, 'solennix-logo-vertical-light.svg');
  const wordmarkDark = join(SVG_DIR, 'solennix-wordmark-dark.svg');
  const wordmarkLight = join(SVG_DIR, 'solennix-wordmark-light.svg');

  // ─── APP ICONS (filled for small sizes) ───
  console.log('\n📱 App Icons (filled)');
  const appSizes = [1024, 512, 384, 256, 192, 180, 167, 152, 144, 120, 96, 87, 80, 72, 60, 58, 48, 40];
  for (const s of appSizes) {
    await svgToPng(iconFilled, join(PNG_DIR, 'app-icons', `icon-${s}x${s}.png`), s, s, { flatten: true, bg: '#1B2A4A' });
  }

  // ─── FAVICONS (filled for legibility) ───
  console.log('\n🌐 Favicons (filled)');
  for (const s of [180, 48, 32, 16]) {
    await svgToPng(iconFilled, join(PNG_DIR, 'favicon', `favicon-${s}x${s}.png`), s, s, { flatten: true, bg: '#1B2A4A' });
  }

  // ─── SOCIAL MEDIA PROFILE PICS (filled) ───
  console.log('\n📸 Social Media (filled)');
  // Profile pictures (square, with navy bg)
  for (const s of [800, 640, 400, 320, 200]) {
    await svgToPng(iconFilled, join(PNG_DIR, 'social-media', `profile-${s}x${s}.png`), s, s, { flatten: true, bg: '#1B2A4A' });
  }

  // OG Image (1200x630 - horizontal logo on navy)
  console.log('\n🔗 OG / Link Preview Images');
  await svgToPng(logoH, join(PNG_DIR, 'og-images', 'og-image-1200x630.png'), 1200, 630, { flatten: true, bg: '#1B2A4A' });
  await svgToPng(logoH, join(PNG_DIR, 'og-images', 'twitter-card-1200x675.png'), 1200, 675, { flatten: true, bg: '#1B2A4A' });

  // ─── DARK BG VARIANTS ───
  console.log('\n🌙 Dark Background');
  await svgToPng(logoH, join(PNG_DIR, 'dark-bg', 'logo-horizontal-5000w.png'), 5000, null);
  await svgToPng(logoH, join(PNG_DIR, 'dark-bg', 'logo-horizontal-2000w.png'), 2000, null);
  await svgToPng(logoH, join(PNG_DIR, 'dark-bg', 'logo-horizontal-1000w.png'), 1000, null);
  await svgToPng(logoH, join(PNG_DIR, 'dark-bg', 'logo-horizontal-500w.png'), 500, null);
  await svgToPng(logoV, join(PNG_DIR, 'dark-bg', 'logo-vertical-2000h.png'), null, 2000);
  await svgToPng(logoV, join(PNG_DIR, 'dark-bg', 'logo-vertical-1000h.png'), null, 1000);
  await svgToPng(iconFilled, join(PNG_DIR, 'dark-bg', 'icon-1024.png'), 1024, 1024);
  await svgToPng(iconFilled, join(PNG_DIR, 'dark-bg', 'icon-512.png'), 512, 512);

  // ─── LIGHT BG VARIANTS ───
  console.log('\n☀️  Light Background');
  await svgToPng(logoHL, join(PNG_DIR, 'light-bg', 'logo-horizontal-5000w.png'), 5000, null);
  await svgToPng(logoHL, join(PNG_DIR, 'light-bg', 'logo-horizontal-2000w.png'), 2000, null);
  await svgToPng(logoHL, join(PNG_DIR, 'light-bg', 'logo-horizontal-1000w.png'), 1000, null);
  await svgToPng(logoHL, join(PNG_DIR, 'light-bg', 'logo-horizontal-500w.png'), 500, null);
  await svgToPng(logoVL, join(PNG_DIR, 'light-bg', 'logo-vertical-2000h.png'), null, 2000);
  await svgToPng(logoVL, join(PNG_DIR, 'light-bg', 'logo-vertical-1000h.png'), null, 1000);
  await svgToPng(iconFilledLight, join(PNG_DIR, 'light-bg', 'icon-1024.png'), 1024, 1024, { flatten: true, bg: '#F5F0E8' });
  await svgToPng(iconFilledLight, join(PNG_DIR, 'light-bg', 'icon-512.png'), 512, 512, { flatten: true, bg: '#F5F0E8' });

  // ─── TRANSPARENT (filled for icon variants) ───
  console.log('\n🔲 Transparent Background');
  await svgToPng(iconTransparentFilled, join(PNG_DIR, 'transparent', 'icon-gold-2000.png'), 2000, 2000);
  await svgToPng(iconTransparentFilled, join(PNG_DIR, 'transparent', 'icon-gold-1000.png'), 1000, 1000);
  await svgToPng(iconTransparentFilled, join(PNG_DIR, 'transparent', 'icon-gold-512.png'), 512, 512);
  await svgToPng(iconTransparentFilled, join(PNG_DIR, 'transparent', 'icon-gold-200.png'), 200, 200);
  await svgToPng(wordmarkDark, join(PNG_DIR, 'transparent', 'wordmark-gold-2000w.png'), 2000, null);
  await svgToPng(wordmarkDark, join(PNG_DIR, 'transparent', 'wordmark-gold-1000w.png'), 1000, null);
  await svgToPng(wordmarkLight, join(PNG_DIR, 'transparent', 'wordmark-navy-2000w.png'), 2000, null);
  await svgToPng(wordmarkLight, join(PNG_DIR, 'transparent', 'wordmark-navy-1000w.png'), 1000, null);

  // ─── MONOCHROME (filled) ───
  console.log('\n⬛ Monochrome (filled)');
  await svgToPng(iconWhiteFilled, join(PNG_DIR, 'monochrome', 'icon-white-1000.png'), 1000, 1000);
  await svgToPng(iconWhiteFilled, join(PNG_DIR, 'monochrome', 'icon-white-512.png'), 512, 512);
  await svgToPng(iconWhiteFilled, join(PNG_DIR, 'monochrome', 'icon-white-200.png'), 200, 200);
  await svgToPng(iconDarkFilled, join(PNG_DIR, 'monochrome', 'icon-navy-1000.png'), 1000, 1000);
  await svgToPng(iconDarkFilled, join(PNG_DIR, 'monochrome', 'icon-navy-512.png'), 512, 512);
  await svgToPng(iconDarkFilled, join(PNG_DIR, 'monochrome', 'icon-navy-200.png'), 200, 200);
  await svgToPng(iconTransparentFilled, join(PNG_DIR, 'monochrome', 'icon-gold-1000.png'), 1000, 1000);
  await svgToPng(iconTransparentFilled, join(PNG_DIR, 'monochrome', 'icon-gold-512.png'), 512, 512);
  await svgToPng(iconTransparentFilled, join(PNG_DIR, 'monochrome', 'icon-gold-200.png'), 200, 200);

  // ─── EMAIL ───
  console.log('\n📧 Email');
  await svgToPng(logoH, join(PNG_DIR, 'email', 'signature-600w.png'), 600, null, { flatten: true, bg: '#1B2A4A' });
  await svgToPng(logoH, join(PNG_DIR, 'email', 'signature-300w.png'), 300, null, { flatten: true, bg: '#1B2A4A' });
  await svgToPng(iconFilled, join(PNG_DIR, 'email', 'signature-icon-100.png'), 100, 100, { flatten: true, bg: '#1B2A4A' });
  await svgToPng(logoHL, join(PNG_DIR, 'email', 'newsletter-header-700w.png'), 700, null);

  // ─── ADS ───
  console.log('\n📢 Advertising Banners');
  const adSizes = [
    [300, 250, 'medium-rectangle'],
    [336, 280, 'large-rectangle'],
    [728, 90, 'leaderboard'],
    [300, 600, 'half-page'],
    [970, 90, 'large-leaderboard'],
    [970, 250, 'billboard'],
    [320, 50, 'mobile-banner'],
    [320, 100, 'large-mobile-banner'],
    [250, 250, 'square'],
  ];
  for (const [w, h, name] of adSizes) {
    // Use icon for square-ish, horizontal logo for wide formats
    const src = w / h > 2 ? logoH : (w === h ? iconFilled : logoH);
    await svgToPng(src, join(PNG_DIR, 'ads', `${name}-${w}x${h}.png`), w, h, { flatten: true, bg: '#1B2A4A' });
  }

  console.log('\n✅ All PNGs generated successfully!');
  console.log(`   Total output directory: ${PNG_DIR}`);
}

main().catch(console.error);
