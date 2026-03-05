# Copilot Instructions for Solennix

## Build, test, and lint commands

### Web (`web/`)
- Install deps: `cd web && npm install` (project uses npm; pnpm also works)
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

## High-level architecture

- Monorepo with two components:
  - `web/`: React + TypeScript SPA
  - `backend/`: Go API (Chi router + service/repository layers)
- Web targets the Go API:
  - Web API client is `web/src/lib/api.ts` (`VITE_API_URL`, token stored as `auth_token` in `localStorage`, emits `auth:logout` on 401)
- Web routing is split into public auth routes and authenticated routes wrapped with `ProtectedRoute` + `Layout` (`web/src/App.tsx`).
- Backend route surface is centralized in `backend/internal/router/router.go` under `/api`:
  - public `/auth/*` routes
  - authenticated CRUD domains (`clients`, `events`, `products`, `inventory`, `payments`)
- Data model consistency is maintained through shared naming conventions:
  - frontend uses camelCase objects
  - backend payloads often require snake_case for nested item updates (e.g., event items, product ingredients)

## Key repository conventions

- Follow existing service-layer pattern in web: each domain exposes a `*Service` in `web/src/services/` and all HTTP goes through `web/src/lib/api.ts` (avoid raw `fetch` in pages/components).
- Keep auth token key consistent as `auth_token` in web localStorage; logout flow depends on 401 handling in `api.ts` and `auth:logout` listener in `AuthContext`.
- Preserve backend API contract mapping in web services when sending nested arrays:
  - `productId -> product_id`, `unitPrice -> unit_price`, `inventoryId -> inventory_id`, etc.
- Web route structure convention:
  - unauthenticated: `/`, `/login`, `/register`, `/forgot-password`
  - authenticated app: `/dashboard`, `/search`, `/calendar`, `/clients`, `/products`, `/inventory`, `/settings`, `/pricing`
- For contributions, follow Conventional Commits format (`feat(scope): ...`, `fix(scope): ...`, etc.).
