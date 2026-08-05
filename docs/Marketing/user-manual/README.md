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
# terminal 1 — API (example against local docker DB on :5433)
cd backend
# PORT=8081 DATABASE_URL=postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable
# go run ./cmd/server

# terminal 2 — web pointed at that API
cd web
VITE_API_URL=http://localhost:8081/api npm run dev -- --port 5174

# terminal 3 — capture (demo user must exist + email verified)
cd web
MANUAL_BASE_URL=http://localhost:5174 \
PLAYWRIGHT_BACKEND_URL=http://localhost:8081 \
MANUAL_EMAIL=manual-demo@solennix.test \
MANUAL_PASSWORD='ManualDemo123!' \
npm run manual:screenshots
```

Script: `web/scripts/capture-manual-screenshots.mjs`.

Demo user (local only, not production): `manual-demo@solennix.test` — set `email_verified_at` in DB if register flow requires verification.

Rules:

- Demo / fictional names only (no real client PII)
- Prefer light mode, 1440×900, deviceScaleFactor 2
- Web journey images are PNG under `web/public/help/manual/web/`
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
