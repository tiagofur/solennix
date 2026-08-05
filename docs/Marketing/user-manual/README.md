# User manual assets

Public manual lives on the web app: `/help/manual`.

## Asset layout

| Path | Purpose |
| :--- | :--- |
| `web/public/help/manual/web/` | Web screenshots (Playwright capture) |
| `web/public/help/manual/ios/` | iOS screenshots (marketing → later simulator) |
| `web/public/help/manual/android/` | Android screenshots (marketing → later emulator) |
| `web/src/content/userManual.ts` | Journey copy + image basenames |

## Capture Web screenshots

```bash
# terminal 1 — API (example against local docker DB on :5433)
cd backend
# PORT=8081 DATABASE_URL=postgres://solennix_user:solennix_password@localhost:5433/solennix?sslmode=disable
# go run ./cmd/server

# terminal 2 — web pointed at that API (use a free port; avoid 5173 if another app owns it)
cd web
VITE_API_URL=http://localhost:8081/api npm run dev -- --port 5175

# terminal 3 — capture (demo user must exist + email verified)
cd web
MANUAL_BASE_URL=http://localhost:5175 \
PLAYWRIGHT_BACKEND_URL=http://localhost:8081 \
MANUAL_EMAIL=manual-demo@solennix.test \
MANUAL_PASSWORD='ManualDemo123!' \
npm run manual:screenshots
```

Script: `web/scripts/capture-manual-screenshots.mjs`.

Demo user (local only): `manual-demo@solennix.test` — set `email_verified_at` in DB if required.

## Sync mobile marketing assets

```bash
cd web && npm run manual:sync-mobile
```

Maps:

- iOS: `docs/Marketing/ios_screens/final/iphone/`
- Android: `docs/Marketing/smartphone/final/`

## Rules

- Demo / fictional names only (no real client PII)
- Prefer light mode, 1440×900, deviceScaleFactor 2 for Web
- Mobile packs are interim store shots until per-step simulator/emulator captures exist

## Content

### Journey A — first quote
1. Qué es Solennix  
2. Cuenta y acceso  
3. Crear cliente  
4. Crear producto  
5. Crear inventario  
6. Crear evento  
7. Armar cotización  
8. Compartir cotización  

### Journey B — day to day
9. Registrar un pago (Web real screenshots; mobile marketing)
10. Portal del cliente (Web real; mobile pending)

For re-capturing Web payments, pass an event with `total_amount > 0`:

```bash
MANUAL_EVENT_ID=<uuid> MANUAL_BASE_URL=http://localhost:5175 \
PLAYWRIGHT_BACKEND_URL=http://localhost:8081 npm run manual:screenshots
```  
