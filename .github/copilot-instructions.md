# Copilot Instructions for Solennix

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

---

## Reglas Obligatorias

### 1. Paridad Cross-Platform

Solennix es multi-plataforma: **iOS · Android · Web · Backend**. Todo cambio en cualquier plataforma DEBE aplicarse a las otras tres. No esperes que el usuario lo pida.

| Área       | iOS                                     | Android                         | Web                                | Backend                                 |
| ---------- | --------------------------------------- | ------------------------------- | ---------------------------------- | --------------------------------------- |
| Modelos    | `ios/Packages/SolennixCore/.../Models/` | `android/core/model/`           | `web/src/types/`                   | `backend/internal/model/`               |
| API/Red    | `ios/Packages/SolennixNetwork/.../`     | `android/core/network/`         | `web/src/services/`                | `backend/internal/handler/`             |
| ViewModels | `.../ViewModels/`                       | `android/feature/**/viewmodel/` | `web/src/stores/`                  | —                                       |
| UI         | `.../Views/`                            | `android/feature/**/ui/`        | `web/src/pages/`, `components/`    | —                                       |
| Auth       | `AuthManager.swift`                     | `AuthInterceptor.kt`            | `AuthContext.tsx` / `authStore.ts` | `handler/auth.go`, `middleware/auth.go` |

### 2. Mantenimiento del PRD

PRD en `PRD/`. Siempre actualiza `11_CURRENT_STATUS.md` + doc de la plataforma afectada. Para features nuevas, también `02_FEATURES.md`.

### 3. Auto-Commit

Después de cada corrección o feature, commit inmediato.

**Formato:** `type(scope): description` (Conventional Commits, inglés)
**Co-autor siempre:** `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`

Types: `feat` · `fix` · `refactor` · `docs` · `test` · `chore` · `style` · `perf`
Scopes: `ios` · `android` · `web` · `backend` · `prd` · `infra`

No commitear: trabajo incompleto, secretos, archivos generados, `console.log` de debug.

---

## Architecture

- Monorepo: `web/` (React SPA) · `backend/` (Go API) · `ios/` (SwiftUI) · `android/` (Compose)
- Web API client: `web/src/lib/api.ts` (`VITE_API_URL`, token `auth_token` en localStorage, emits `auth:logout` on 401)
- Web routing: public auth routes + authenticated routes wrapped with `ProtectedRoute` + `Layout` (`web/src/App.tsx`)
- Backend routes: `backend/internal/router/router.go` bajo `/api` — public `/auth/*` + authenticated CRUD domains
- Naming: frontend camelCase · backend snake_case para nested item updates (e.g., `product_id`, `unit_price`)

## Key conventions

- Service-layer pattern: cada dominio expone `*Service` en `web/src/services/`, todo HTTP via `web/src/lib/api.ts`
- Auth token: `auth_token` en localStorage · logout via 401 + `auth:logout` en `AuthContext`
- Backend API contract en web services: `productId → product_id`, `unitPrice → unit_price`, `inventoryId → inventory_id`
- Rutas web — unauthenticated: `/`, `/login`, `/register`, `/forgot-password` · authenticated: `/dashboard`, `/search`, `/calendar`, `/clients`, `/products`, `/inventory`, `/settings`, `/pricing`
- Commits: Conventional Commits (`feat(scope): ...`, `fix(scope): ...`)

---

## Comunicación

- Oraciones de ≤6 palabras
- Sin preámbulos ("Claro, voy a...", "Por supuesto...")
- Herramientas primero, texto después
- Parar en cuanto se encontró lo buscado
- Sin confirmar lo que el tool call ya muestra
- Respuestas directas: solo la ruta, el valor, el dato
- Sin resumen al final si el diff lo demuestra
- Listas en vez de prosa
- Sin alternativas no pedidas
- Código inline si es ≤3 líneas
- Sin disculpas ni hedging — la respuesta directa
- Números: "3 archivos" no "varios"
