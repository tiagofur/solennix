# CLAUDE.md — EventosApp

This file provides context for AI assistants (Claude Code, Copilot, etc.) working on EventosApp.

## Project Overview

EventosApp is a SaaS platform for event organizers (catering, banquets, parties). It manages the full event lifecycle: clients, product catalogs with recipes, inventory, quotations with tax (IVA), payments, calendar, and PDF document generation. The project is bilingual — code is in English, UI and docs are primarily in Spanish.

## Repository Layout

```
eventosapp/
├── web/                  # React SPA (primary frontend)
├── backend/              # Go REST API
├── docs/                 # Project documentation
├── docker-compose.yml    # Full-stack deployment (backend + frontend + Postgres)
├── AGENTS.md             # AI agent guide (Spanish)
├── CONTRIBUTING.md       # Contribution guide (Spanish)
└── .github/
    ├── workflows/test.yml   # CI pipeline
    └── copilot-instructions.md
```

> **Note:** A Flutter mobile app (`flutter/`) existed previously but was removed. References to it in docs are outdated.

## Tech Stack

| Layer       | Technology                                                             |
|-------------|------------------------------------------------------------------------|
| Frontend    | React 19, TypeScript ~5.9, Vite 7, Tailwind CSS 4, React Router 7     |
| State       | Zustand (global), React Hook Form + Zod (forms)                       |
| Backend     | Go 1.25, Chi v5 router, pgx v5 (PostgreSQL driver)                    |
| Database    | PostgreSQL 15 with file-based migrations                               |
| Auth        | JWT (golang-jwt), bcrypt, stored in localStorage as `auth_token`       |
| Payments    | Stripe (web), RevenueCat (mobile webhooks)                             |
| Testing     | Vitest + Testing Library (unit), Playwright (E2E), Go `testing` (API)  |
| Styling     | Tailwind CSS, Lucide React icons, clsx + tailwind-merge                |
| PDF         | jspdf + jspdf-autotable, @react-pdf/renderer                          |
| CI          | GitHub Actions (type-check, lint, unit tests, coverage, E2E)           |
| Deploy      | Docker Compose (self-hosted), Vercel-ready (web)                       |

## Build, Lint, and Test Commands

### Web (`web/`)

```bash
cd web

# Install dependencies
npm install

# Development server (http://localhost:5173)
npm run dev

# Type-check (no emit)
npm run check

# Lint
npm run lint

# Build for production
npm run build

# Unit tests (all, single run)
npm run test:run

# Unit tests (watch mode)
npm run test

# Unit tests with coverage
npm run test:coverage

# E2E tests (Playwright)
npm run test:e2e

# Single unit test file
npx vitest run src/lib/api.test.ts

# Single E2E test file
npx playwright test tests/e2e/login.spec.ts

# Install Playwright browsers
npm run test:e2e:install
```

### Backend (`backend/`)

```bash
cd backend

# Run all tests
go test ./...

# Run a single test by name
go test ./internal/router -run TestNew

# Build / type-check all packages
go build ./...

# Start local database only (Docker)
docker-compose up -d
```

### Full Stack (Docker)

```bash
# From repo root — starts backend, frontend, and Postgres
docker-compose up --build
```

## Architecture

### Web Frontend (`web/src/`)

```
src/
├── App.tsx              # Route definitions (public + protected)
├── main.tsx             # Entry point (BrowserRouter + App)
├── components/          # Shared UI components (Layout, ProtectedRoute, etc.)
├── contexts/            # React contexts (AuthContext)
├── hooks/               # Custom hooks (useTheme, usePagination, usePlanLimits, useToast)
├── lib/                 # Core utilities
│   ├── api.ts           # HTTP client (ApiClient class) — ALL API calls go through this
│   ├── errorHandler.ts  # Centralized error logging
│   ├── finance.ts       # Financial calculations
│   ├── pdfGenerator.ts  # PDF document generation
│   └── utils.ts         # General utilities
├── pages/               # Page components organized by domain
│   ├── Clients/         # ClientList, ClientForm, ClientDetails
│   ├── Events/          # EventForm, EventSummary, components/
│   ├── Products/        # ProductList, ProductForm
│   ├── Inventory/       # InventoryList, InventoryForm
│   ├── Calendar/        # CalendarView
│   ├── Dashboard.tsx
│   ├── Settings.tsx
│   ├── Search.tsx
│   ├── Pricing.tsx
│   ├── Login.tsx, Register.tsx, ForgotPassword.tsx, Landing.tsx
│   └── NotFound.tsx
├── services/            # API service modules (one per domain)
│   ├── clientService.ts
│   ├── eventService.ts
│   ├── productService.ts
│   ├── inventoryService.ts
│   ├── paymentService.ts
│   ├── searchService.ts
│   └── subscriptionService.ts
└── types/
    └── supabase.ts      # TypeScript type definitions for all DB tables (Row/Insert/Update)
```

**Key patterns:**
- All HTTP requests go through `lib/api.ts` (singleton `ApiClient`). Never use raw `fetch` in pages/components.
- Services in `services/` wrap `api.ts` calls for each domain. Follow the existing `clientService.ts` pattern.
- Auth token is stored as `auth_token` in localStorage. On 401, `api.ts` dispatches `auth:logout` event, caught by `AuthContext`.
- Routes are split: public (`/`, `/login`, `/register`, `/forgot-password`) and authenticated (wrapped in `ProtectedRoute` + `Layout`).
- Path alias `@/*` maps to `./src/*` (configured in tsconfig.json and vite).
- Test files are co-located with source files (e.g., `Dashboard.test.tsx` next to `Dashboard.tsx`).

### Backend API (`backend/internal/`)

```
internal/
├── config/       # Environment configuration (Config struct, loads from .env / env vars)
├── database/     # PostgreSQL connection pool, migration runner
│   └── migrations/   # Numbered SQL migrations (001-013, up/down pairs)
├── handlers/     # HTTP handlers (AuthHandler, CRUDHandler, SubscriptionHandler)
├── middleware/   # CORS, JWT auth, request logging
├── models/       # Go structs for all domain entities
├── repository/   # Data access layer (one file per domain: client, event, product, inventory, payment, user)
├── router/       # Chi router setup — all API routes defined here
└── services/     # Business logic (AuthService with JWT/bcrypt)
```

**Key patterns:**
- All API routes are under `/api`. See `router/router.go` for the full route tree.
- Public routes: `/api/auth/*`, `/api/subscriptions/webhook/*`
- Protected routes require JWT via `middleware.Auth`: `/api/clients`, `/api/events`, `/api/products`, `/api/inventory`, `/api/payments`, `/api/users/me`, `/api/subscriptions/status|checkout|portal`
- Multi-tenant: all queries filter by `user_id` extracted from the JWT.
- Config requires `DATABASE_URL` and `JWT_SECRET` env vars at minimum. See `config/config.go` for all options.
- Migrations are plain SQL files in `database/migrations/` with `NNN_description.up.sql` / `.down.sql` naming.

### API Route Reference

| Method | Path                           | Handler                    | Auth |
|--------|--------------------------------|----------------------------|------|
| POST   | `/api/auth/register`           | AuthHandler.Register       | No   |
| POST   | `/api/auth/login`              | AuthHandler.Login          | No   |
| POST   | `/api/auth/refresh`            | AuthHandler.RefreshToken   | No   |
| POST   | `/api/auth/forgot-password`    | AuthHandler.ForgotPassword | No   |
| GET    | `/api/auth/me`                 | AuthHandler.Me             | Yes  |
| PUT    | `/api/users/me`                | AuthHandler.UpdateProfile  | Yes  |
| CRUD   | `/api/clients[/{id}]`          | CRUDHandler.*Client*       | Yes  |
| CRUD   | `/api/events[/{id}]`           | CRUDHandler.*Event*        | Yes  |
| GET    | `/api/events/upcoming`         | CRUDHandler.GetUpcoming    | Yes  |
| GET/PUT| `/api/events/{id}/products`    | CRUDHandler.*EventProducts*| Yes  |
| GET/PUT| `/api/events/{id}/extras`      | CRUDHandler.*EventExtras*  | Yes  |
| PUT    | `/api/events/{id}/items`       | CRUDHandler.UpdateEventItems| Yes |
| CRUD   | `/api/products[/{id}]`         | CRUDHandler.*Product*      | Yes  |
| GET/PUT| `/api/products/{id}/ingredients`| CRUDHandler.*Ingredients* | Yes  |
| CRUD   | `/api/inventory[/{id}]`        | CRUDHandler.*Inventory*    | Yes  |
| CRUD   | `/api/payments[/{id}]`         | CRUDHandler.*Payment*      | Yes  |
| GET    | `/api/subscriptions/status`    | SubHandler.GetStatus       | Yes  |
| POST   | `/api/subscriptions/checkout-session` | SubHandler.CreateCheckout | Yes |
| POST   | `/api/subscriptions/portal-session`   | SubHandler.CreatePortal   | Yes |
| POST   | `/api/subscriptions/webhook/stripe`   | SubHandler.StripeWebhook  | No* |
| POST   | `/api/subscriptions/webhook/revenuecat` | SubHandler.RevenueCat   | No* |

*Webhooks are verified by provider signature, not JWT.

### Data Model

Core entities (all scoped to a `user_id`):
- **User** — email, password, name, business branding, subscription plan (`basic`/`pro`)
- **Client** — name, phone, email, address, city, notes, aggregates (total_events, total_spent)
- **Event** — date, time range, service_type, num_people, status (`quoted`/`confirmed`/`completed`/`cancelled`), financial fields (discount, tax_rate, tax_amount, total_amount), contract terms (deposit_percent, cancellation_days, refund_percent)
- **Product** — name, category, base_price, recipe (JSONB), is_active
- **InventoryItem** — ingredient_name, current_stock, minimum_stock, unit, unit_cost, type (`ingredient`/`equipment`)
- **Payment** — event_id, amount, payment_date, payment_method, notes

Junction tables:
- **EventProduct** — links events to products with quantity, unit_price, discount
- **EventExtra** — ad-hoc line items on events (description, cost, price, exclude_utility)
- **ProductIngredient** — links products to inventory items with quantity_required
- **Subscription** — multi-provider (stripe/apple/google), tracks plan and billing period

## CI Pipeline

GitHub Actions workflow (`.github/workflows/test.yml`) runs on pushes/PRs to `main` and `develop`:

1. **test** job: `npm ci` → `npm run check` (TypeScript) → `npm run lint` → `npm run test:run` → `npm run test:coverage`
2. **e2e** job: `npm ci` → install Playwright browsers → `npm run build` → `npm run test:e2e`

## Code Conventions

### TypeScript / React
- Use TypeScript for all new code. The project uses `strict: false` in tsconfig but type your code properly.
- Use `@/*` import alias for `src/` imports (e.g., `import { api } from '@/lib/api'`).
- Component files: `PascalCase.tsx`. Utility files: `camelCase.ts`.
- Services follow the object-literal pattern (see `clientService.ts`): export a `const xxxService = { async method() { ... } }`.
- Prefer Tailwind classes over inline styles. Use `clsx`/`tailwind-merge` for conditional classes.
- Forms use React Hook Form with Zod validation.
- State management: Zustand for app-wide state, React context for auth/theme.

### Go
- Follow standard Go conventions (`gofmt`, `golint`).
- Package names: lowercase, no underscores.
- Repository pattern: each domain has its own `*_repo.go` file.
- Handlers receive dependencies via struct injection (`NewXxxHandler(repo)`).
- All errors are handled explicitly — no panics in handlers.

### API Contract (Frontend ↔ Backend)
- Frontend objects use camelCase, backend JSON uses snake_case.
- When sending nested arrays to the API (event items, product ingredients), map to snake_case keys:
  - `productId` → `product_id`, `unitPrice` → `unit_price`, `inventoryId` → `inventory_id`, etc.
- Auth token: `Authorization: Bearer <token>` header, token stored as `auth_token` in localStorage.

### Commits
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat(scope): add new feature
fix(scope): correct bug description
docs(scope): update documentation
refactor(scope): restructure code
test(scope): add/update tests
chore(scope): maintenance tasks
```

### Branching
```
main
├── feature/feature-name
├── fix/bug-name
├── docs/doc-name
└── refactor/refactor-name
```

## Testing Conventions

### Unit Tests (Vitest)
- Co-located with source: `Component.test.tsx` next to `Component.tsx`.
- Setup file: `web/tests/setup.ts` — configures MSW (Mock Service Worker), localStorage mock, matchMedia mock.
- Mock API handlers: `web/tests/mocks/handlers.ts` with MSW.
- MSW server: `web/tests/mocks/server.ts`.
- Coverage thresholds: 95% lines, 95% functions, 90% branches, 95% statements.
- Use `@testing-library/react` for component tests, `@testing-library/user-event` for interactions.

### E2E Tests (Playwright)
- Located in `web/tests/e2e/`.
- Config: `web/playwright.config.ts` — runs against `http://localhost:5173`, Chromium only.
- Web server command: `pnpm dev -- --host`.

### Backend Tests (Go)
- Standard Go test files (`*_test.go`) co-located with source.
- Integration tests: `*_integration_test.go` files.
- Run with `go test ./...` from `backend/`.

## Environment Variables

### Backend (required)
- `DATABASE_URL` — PostgreSQL connection string (required)
- `JWT_SECRET` — secret for JWT signing (required)

### Backend (optional)
- `PORT` — server port (default: `8080`)
- `ENVIRONMENT` — `development` or `production`
- `CORS_ALLOWED_ORIGINS` — comma-separated origins (default: `http://localhost:5173`)
- `JWT_EXPIRY_HOURS` — token expiry (default: `24`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` — email configuration
- `FRONTEND_URL` — for password reset links (default: `http://localhost:5173`)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_PORTAL_CONFIG_ID`
- `REVENUECAT_WEBHOOK_SECRET`

### Web
- `VITE_API_URL` — backend API base URL (default: `http://localhost:8080/api`)

## Security Notes

- Never commit `.env` files or credentials.
- All database queries are parameterized (pgx prepared statements) — no string concatenation.
- Multi-tenant isolation: every query filters by `user_id` from JWT claims.
- Passwords hashed with bcrypt.
- Webhook endpoints verify provider signatures (Stripe signing secret, RevenueCat auth header).
- CORS is configured per environment via `CORS_ALLOWED_ORIGINS`.

## Common Tasks for AI Assistants

### Adding a new web page
1. Create type definitions in `types/supabase.ts` (if new DB table).
2. Create service in `services/xxxService.ts` using `api.ts`.
3. Create page component(s) in `pages/Xxx/`.
4. Add route in `App.tsx` (inside `ProtectedRoute` group if authenticated).
5. Write co-located tests (`Xxx.test.tsx`).

### Adding a new backend endpoint
1. Add model to `models/models.go` (if new entity).
2. Add repository methods in `repository/xxx_repo.go`.
3. Add handler method to appropriate handler in `handlers/`.
4. Register route in `router/router.go`.
5. Add migration in `database/migrations/` with next sequence number.
6. Write tests (`*_test.go`).

### Adding a new database migration
1. Create `NNN_description.up.sql` and `NNN_description.down.sql` in `backend/internal/database/migrations/`.
2. Use the next sequential number (currently at 013).
3. Migrations run automatically on startup via `database/migrate.go`.

### Running the full test suite before a PR
```bash
cd web && npm run check && npm run lint && npm run test:run
cd ../backend && go test ./...
```
