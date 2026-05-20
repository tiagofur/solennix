import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = 'file://' + path.join(__dirname, 'youtube-assets.html');
const outDir = path.join(__dirname, 'out');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

async function render() {
  console.log('🚀 Iniciando renderizado de assets para YouTube...');
  const browser = await puppeteer.launch({
    headless: 'new'
  });
  const page = await browser.newPage();

  // Cargamos el HTML
  await page.goto(htmlPath, { waitUntil: 'networkidle0' });

  const targets = [
    { id: '#thumb-impact', name: 'thumbnail-impacto.png' },
    { id: '#thumb-tutorial', name: 'thumbnail-tutorial.png' },
    { id: '#channel-cover', name: 'channel-cover.png' }
  ];

  for (const target of targets) {
    console.log(`📸 Generando ${target.name}...`);
    const element = await page.$(target.id);
    if (element) {
      await element.screenshot({
        path: path.join(outDir, target.name),
        omitBackground: true
      });
      console.log(`   ✅ Guardado en out/${target.name}`);
    } else {
      console.error(`   ❌ Error: No se encontró el elemento ${target.id}`);
    }
  }

  await browser.close();
  console.log('\n✨ ¡Proceso completado con éxito!');
}

render().catch(err => {
  console.error('💥 Error durante el renderizado:', err);
  process.exit(1);
});
