# Copilot Instructions for Solennix

Este proyecto usa **`AGENTS.md`** como única fuente normative para todos los agentes (incluido Copilot). Antes de empezar, leé [`AGENTS.md`](../AGENTS.md).

Las reglas de estilo, convenciones, arquitectura, workflow y diseño viven ahí y en los archivos a los que rutea. Este archivo no duplica ese contenido — solo añade los comandos de build/test/lint y notas operativas de implementación web que Copilot necesita para sugerir fixes.

## Build, test, and lint commands

### Web (`web/`)

- Install deps: `cd web && npm install`
- Dev server: `cd web && npm run dev`
- Build: `cd web && npm run build`
- Lint: `cd web && npm run lint`
- Type-check: `cd web && npm run check`
- Unit tests (all): `cd web && npm run test:run`
- Unit test (single file): `cd web && npx vitest run src/lib/api.test.ts`
- E2E tests (all): `cd web && npm run test:e2e`
- E2E test (single file): `cd web && npx playwright test tests/e2e/login.spec.ts`

### Backend (`backend/`)

- Run tests (all): `cd backend && go test ./...`
- Run a single backend test by name: `cd backend && go test ./internal/router -run TestNew`
- Build/check packages: `cd backend && go build ./...`
- Local DB only (Docker): `cd backend && docker-compose up -d`

### iOS (`ios/`)

- Generate project: `cd ios && xcodegen generate`
- Open: `open ios/Solennix.xcodeproj`

### Android (`android/`)

- Build: `cd android && ./gradlew build`
- Test: `cd android && ./gradlew test`

## Web implementation quick-ref

Detalle operativo (no normativo; para profundizar ver `docs/agents/architecture.md` y `docs/Web/`):

- **API client:** `web/src/lib/api.ts` — `VITE_API_URL`, token `auth_token` en localStorage, emite `auth:logout` on 401.
- **Routing:** rutas públicas + autenticadas envueltas con `ProtectedRoute` + `Layout` (`web/src/App.tsx`). Públicas: `/`, `/login`, `/register`, `/forgot-password`. Autenticadas: `/dashboard`, `/search`, `/calendar`, `/clients`, `/products`, `/inventory`, `/settings`, `/pricing`.
- **Service-layer pattern:** cada dominio expone `*Service` en `web/src/services/`, todo HTTP via `web/src/lib/api.ts`.
- **API contract web→backend:** camelCase → snake_case en items anidados (ej. `productId → product_id`, `unitPrice → unit_price`, `inventoryId → inventory_id`).
- **Backend routes:** `backend/internal/router/router.go` bajo `/api` — públicas `/auth/*` + CRUD autenticado por dominio.
