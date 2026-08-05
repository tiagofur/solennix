/**
 * Build-time static SEO shells for public marketing routes.
 *
 * Writes dist/providers/index.html from dist/index.html with:
 * - Directory-specific title / meta / OG
 * - schema.org ItemList JSON-LD (optional live fetch of organizers)
 * - Crawlable HTML inside #root (replaced when the SPA mounts)
 *
 * Usage: node scripts/prerender-public.mjs
 * Env: VITE_API_URL or PRERENDER_API_URL (optional, for live directory cards)
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, "../dist");
const SITE = "https://solennix.com";
const PROVIDERS_PATH = "/providers";

const SERVICE_CHIPS = [
  ["catering", "Catering"],
  ["decoracion", "Decoración"],
  ["dj", "DJ"],
  ["fotografia", "Fotografía"],
  ["flores", "Flores"],
  ["mobiliario", "Mobiliario"],
  ["musica", "Música"],
  ["meseros", "Meseros"],
];

const EVENT_CHIPS = [
  ["boda", "Boda"],
  ["corporativo", "Corporativo"],
  ["xv", "XV años"],
  ["infantil", "Fiesta infantil"],
  ["social", "Evento social"],
];

export const PROVIDERS_TITLE =
  "Encontrá el proveedor perfecto para tu evento | Solennix";
export const PROVIDERS_DESCRIPTION =
  "Organizadores verificados de eventos en LATAM. Directorio de profesionales: Solennix facilita el contacto; el acuerdo es entre vos y el proveedor.";

/**
 * Escape text for HTML text nodes / attributes.
 * @param {string} value
 */
export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * @param {{ name: string, url: string, description?: string }[]} items
 */
export function buildItemListJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: PROVIDERS_TITLE,
    description: PROVIDERS_DESCRIPTION,
    url: `${SITE}${PROVIDERS_PATH}`,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "LocalBusiness",
        name: item.name,
        url: item.url.startsWith("http") ? item.url : `${SITE}${item.url}`,
        ...(item.description ? { description: item.description } : {}),
      },
    })),
  };
}

/**
 * @param {{ name: string, url: string, description?: string }[]} items
 */
export function buildProvidersSeoBody(items) {
  const serviceLinks = SERVICE_CHIPS.map(
    ([slug, label]) =>
      `<a href="${PROVIDERS_PATH}?service_category=${slug}">${escapeHtml(label)}</a>`,
  ).join(" · ");
  const eventLinks = EVENT_CHIPS.map(
    ([slug, label]) =>
      `<a href="${PROVIDERS_PATH}?event_type=${slug}">${escapeHtml(label)}</a>`,
  ).join(" · ");

  const list =
    items.length > 0
      ? `<ul>${items
          .map(
            (item) =>
              `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.name)}</a>${
                item.description
                  ? ` — ${escapeHtml(item.description)}`
                  : ""
              }</li>`,
          )
          .join("")}</ul>`
      : `<p>Explorá el directorio para encontrar proveedores de catering, decoración, música, fotografía y más.</p>`;

  return [
    `<div id="seo-prerender" data-prerender="providers">`,
    `<h1>${escapeHtml(PROVIDERS_TITLE.replace(/\s*\|\s*Solennix\s*$/, ""))}</h1>`,
    `<p>${escapeHtml(PROVIDERS_DESCRIPTION)}</p>`,
    `<nav aria-label="Servicios"><p><strong>Servicios:</strong> ${serviceLinks}</p></nav>`,
    `<nav aria-label="Tipos de evento"><p><strong>Eventos:</strong> ${eventLinks}</p></nav>`,
    `<section aria-label="Proveedores">${list}</section>`,
    `<p><a href="/">Solennix — plataforma para organizadores de eventos</a></p>`,
    `</div>`,
  ].join("\n");
}

/**
 * Inject SEO into SPA shell HTML.
 * @param {string} html
 * @param {{ name: string, url: string, description?: string }[]} items
 */
export function injectProvidersSeo(html, items) {
  const title = PROVIDERS_TITLE;
  const description = PROVIDERS_DESCRIPTION;
  const canonical = `${SITE}${PROVIDERS_PATH}`;
  const jsonLd = JSON.stringify(buildItemListJsonLd(items));
  const body = buildProvidersSeoBody(items);

  let out = html;

  out = out.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(title)}</title>`,
  );

  // description meta (name="description")
  if (/name="description"/i.test(out)) {
    out = out.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${escapeHtml(description)}" />`,
    );
  } else {
    out = out.replace(
      /<\/head>/i,
      `  <meta name="description" content="${escapeHtml(description)}" />\n  </head>`,
    );
  }

  // og:title
  if (/property="og:title"/i.test(out)) {
    out = out.replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
    );
  } else {
    out = out.replace(
      /<\/head>/i,
      `  <meta property="og:title" content="${escapeHtml(title)}" />\n  </head>`,
    );
  }

  // og:description
  if (/property="og:description"/i.test(out)) {
    out = out.replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
    );
  } else {
    out = out.replace(
      /<\/head>/i,
      `  <meta property="og:description" content="${escapeHtml(description)}" />\n  </head>`,
    );
  }

  // og:url + robots + json-ld before </head>
  const headExtras = [
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="robots" content="index, follow" />`,
    `<script type="application/ld+json" id="providers-directory-jsonld">${jsonLd}</script>`,
  ].join("\n  ");

  out = out.replace(/<\/head>/i, `  ${headExtras}\n</head>`);

  // Put crawlable content inside #root so crawlers without JS still see links.
  if (/id="root"/i.test(out)) {
    out = out.replace(
      /<div id="root"><\/div>/i,
      `<div id="root">\n${body}\n</div>`,
    );
  } else {
    out = out.replace(
      /<body([^>]*)>/i,
      `<body$1>\n${body}\n`,
    );
  }

  return out;
}

/**
 * @returns {Promise<{ name: string, url: string, description?: string }[]>}
 */
export async function fetchDirectoryItems(apiBase) {
  if (!apiBase) return [];
  const base = apiBase.replace(/\/$/, "");
  const url = `${base}/api/public/organizers?page=1&limit=20`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[prerender] organizers fetch ${res.status} — empty list`);
      return [];
    }
    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : [];
    return rows
      .filter((row) => row?.slug)
      .map((row) => ({
        name: row.business_name || row.slug,
        url: `/u/${row.slug}`,
        description: row.headline || undefined,
      }));
  } catch (err) {
    console.warn(
      `[prerender] organizers fetch failed — empty list (${err?.message || err})`,
    );
    return [];
  }
}

async function main() {
  const indexPath = path.join(DIST, "index.html");
  let html;
  try {
    html = await readFile(indexPath, "utf8");
  } catch {
    console.error(
      "[prerender] dist/index.html not found — run vite build first",
    );
    process.exit(1);
  }

  const apiBase =
    process.env.PRERENDER_API_URL ||
    process.env.VITE_API_URL ||
    "";
  const items = await fetchDirectoryItems(apiBase);
  const out = injectProvidersSeo(html, items);

  const outDir = path.join(DIST, "providers");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "index.html");
  await writeFile(outPath, out, "utf8");
  console.log(
    `[prerender] wrote ${path.relative(process.cwd(), outPath)} (${items.length} items)`,
  );
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error("[prerender] failed", err);
    process.exit(1);
  });
}
