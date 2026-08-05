# User manual assets

Public manual lives on the web app: `/help/manual`.

## Asset layout

| Path | Purpose |
| :--- | :--- |
| `web/public/help/manual/web/` | Web screenshots (SVG placeholders → real PNG via capture script) |
| `web/public/help/manual/ios/` | iOS screenshots (phase 2) |
| `web/public/help/manual/android/` | Android screenshots (phase 3) |
| `web/src/content/userManual.ts` | Journey copy + image basenames |

## Capture Web screenshots

```bash
# terminal 1 — API
cd backend && # start server on :8080

# terminal 2 — web
cd web && npm run dev

# terminal 3 — capture
cd web && npm run manual:screenshots
```

Script: `web/scripts/capture-manual-screenshots.mjs`.

Rules:

- Demo / fictional names only (no real client PII)
- Prefer light mode, 1440×900, deviceScaleFactor 2
- After capture, switch article `image` fields from `.svg` to `.png` for shots that look good
- Keep iOS/Android empty until platform phase; UI shows “screenshot coming soon”

## Content order (first journey)

1. Qué es Solennix  
2. Cuenta y acceso  
3. Crear cliente  
4. Crear producto  
5. Crear inventario  
6. Crear evento  
7. Armar cotización  
8. Compartir cotización  
