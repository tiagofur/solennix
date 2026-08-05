import assert from "node:assert/strict";
import {
  buildItemListJsonLd,
  buildProvidersSeoBody,
  escapeHtml,
  injectProvidersSeo,
  PROVIDERS_DESCRIPTION,
  PROVIDERS_TITLE,
} from "./prerender-public.mjs";

const shell = `<!doctype html>
<html lang="es">
  <head>
    <meta name="description" content="Generic SPA" />
    <meta property="og:title" content="Solennix" />
    <meta property="og:description" content="Generic" />
    <title>Solennix — Cada detalle importa</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

// escapeHtml
assert.equal(escapeHtml(`a<"b">c&`), "a&lt;&quot;b&quot;&gt;c&amp;");

// JSON-LD
const ld = buildItemListJsonLd([
  { name: "Alice", url: "/u/alice", description: "Catering" },
]);
assert.equal(ld["@type"], "ItemList");
assert.equal(ld.numberOfItems, 1);
assert.equal(ld.itemListElement[0].item.name, "Alice");
assert.match(ld.itemListElement[0].item.url, /\/u\/alice$/);

// Body has crawlable links
const body = buildProvidersSeoBody([
  { name: "Alice Catering", url: "/u/alice-catering" },
]);
assert.match(body, /seo-prerender/);
assert.match(body, /service_category=catering/);
assert.match(body, /event_type=boda/);
assert.match(body, /href="\/u\/alice-catering"/);
assert.doesNotMatch(body.toLowerCase(), /marketplace/);
assert.doesNotMatch(body.toLowerCase(), /garantiz/);

// Full inject
const html = injectProvidersSeo(shell, [
  { name: "Alice Catering", url: "/u/alice-catering" },
]);
assert.match(html, new RegExp(`<title>${PROVIDERS_TITLE.replace(/[|]/g, "\\$&")}</title>`));
assert.match(html, new RegExp(PROVIDERS_DESCRIPTION.slice(0, 40)));
assert.match(html, /application\/ld\+json/);
assert.match(html, /rel="canonical"/);
assert.match(html, /id="root"[\s\S]*seo-prerender/);
assert.match(html, /Alice Catering/);
assert.match(html, /src="\/src\/main\.tsx"/); // SPA entry preserved

console.log("prerender-public.test.mjs: ok");
