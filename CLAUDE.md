# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 📑 Table of Contents

**PART I — Solennix Project Context**
- [Project Overview](#project-overview)
- [Repository Layout](#repository-layout)
- [Tech Stack](#tech-stack)
- [Build, Lint, and Test Commands](#build-lint-and-test-commands)
- [Architecture](#architecture)
- [CI Pipeline](#ci-pipeline)
- [Code Conventions](#code-conventions)
- [Testing Conventions](#testing-conventions)
- [Environment Variables](#environment-variables)
- [Security Notes](#security-notes)
- [Common Tasks](#common-tasks-for-ai-assistants)

**PART II — Development Workflow**
- [Spec-Driven Development (SDD) Orchestrator](#spec-driven-development-sdd-orchestrator)

---

# PART I — Solennix Project Context

## Project Overview

Solennix is a SaaS platform for event organizers (catering, banquets, parties). It manages the full event lifecycle: clients, product catalogs with recipes, inventory, quotations with tax (IVA), payments, calendar, and PDF document generation. The project is bilingual — code is in English, UI and docs are primarily in Spanish.

## Repository Layout

```
solennix/
├── web/                  # React SPA (primary frontend)
├── mobile/               # React Native / Expo mobile app (iOS & Android)
├── backend/              # Go REST API
├── docs/                 # Project documentation
├── docker-compose.yml    # Full-stack deployment (backend + frontend + Postgres)
├── AGENTS.md             # AI agent guide (Spanish)
├── CONTRIBUTING.md       # Contribution guide (Spanish)
└── .github/
    ├── workflows/test.yml   # CI pipeline
    └── copilot-instructions.md
```

## Tech Stack

| Layer    | Technology                                                            |
| -------- | --------------------------------------------------------------------- |
| Frontend | React 19, TypeScript ~5.9, Vite 7, Tailwind CSS 4, React Router 7     |
| Mobile   | React Native 0.83, Expo SDK 55, TypeScript ~5.9                        |
| Mobile Nav | React Navigation 7 (native-stack, bottom-tabs, drawer)              |
| Mobile UI | Lucide React Native icons, Reanimated 4, Gesture Handler, Bottom Sheet |
| State    | Zustand (global), React Hook Form + Zod (forms) — shared across web & mobile |
| Backend  | Go 1.25, Chi v5 router, pgx v5 (PostgreSQL driver)                    |
| Database | PostgreSQL 15 with file-based migrations                              |
| Auth     | JWT (golang-jwt), bcrypt, stored in localStorage (web) / SecureStore (mobile) |
| Payments | Stripe (web), RevenueCat (mobile via react-native-purchases)           |
| Testing  | Vitest + Testing Library (unit), Playwright (E2E), Go `testing` (API) |
| Styling  | Tailwind CSS (web), StyleSheet + custom theme system (mobile), Lucide icons |
| PDF      | jspdf + jspdf-autotable (web), expo-print + expo-sharing (mobile)      |
| Monitoring | Sentry (mobile via @sentry/react-native)                             |
| CI       | GitHub Actions (type-check, lint, unit tests, coverage, E2E)          |
| Deploy   | Docker Compose (self-hosted), Vercel-ready (web), EAS Build (mobile)  |

## Build, Lint, and Test Commands

> **Note:** The project officially uses **npm** (as per CI pipeline). Both `package-lock.json` and `pnpm-lock.yaml` exist, but all commands below use `npm`. You can substitute `npm` with `pnpm` if preferred, but npm is the canonical choice.

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

### Mobile (`mobile/`)

```bash
cd mobile

# Install dependencies
npm install

# Start Expo dev server (opens QR code for Expo Go)
npm start

# Start on Android emulator/device
npm run android

# Start on iOS simulator/device
npm run ios

# Start for web (Expo web)
npm run web
```

> **Note:** The mobile app uses Expo managed workflow. For development builds with native modules (e.g., `react-native-purchases`), you may need `eas build` or a development client.

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

### Mobile App (`mobile/src/`)

```
src/
├── contexts/            # React contexts (AuthContext)
├── hooks/               # Custom hooks
│   ├── useTheme.tsx     # Dark/light mode with system detection
│   ├── usePagination.ts # Infinite scroll pagination
│   ├── usePlanLimits.ts # Subscription plan feature gating
│   ├── useToast.ts      # Toast notification system
│   ├── useHaptics.ts    # Haptic feedback wrapper
│   ├── useImagePicker.ts # Camera/gallery image selection
│   └── useStoreReview.ts # App Store review prompts
├── lib/                 # Core utilities
│   ├── api.ts           # HTTP client (ApiClient class) — mirrors web/src/lib/api.ts
│   ├── errorHandler.ts  # Centralized error logging (Sentry integration)
│   ├── finance.ts       # Financial calculations (shared logic with web)
│   ├── pdfGenerator.ts  # PDF generation via expo-print + expo-sharing
│   └── sentry.ts        # Sentry initialization and configuration
├── navigation/          # React Navigation setup
│   ├── RootNavigator.tsx    # Auth vs Main switch (NavigationContainer)
│   ├── AuthStack.tsx        # Login, Register, ForgotPassword, ResetPassword
│   ├── DrawerNavigator.tsx  # Side drawer (wraps MainTabs)
│   ├── MainTabs.tsx         # Bottom tab navigator (Home, Calendar, Clients, + FAB)
│   ├── HomeStack.tsx        # Dashboard, Search
│   ├── CalendarStack.tsx    # Calendar view
│   ├── ClientStack.tsx      # Client CRUD screens
│   ├── ProductStack.tsx     # Product & Inventory CRUD screens
│   ├── InventoryStack.tsx   # Inventory standalone screens
│   └── SettingsStack.tsx    # Profile, Business, Contract, Pricing, Legal screens
├── screens/             # Screen components organized by domain
│   ├── auth/            # LoginScreen, RegisterScreen, ForgotPasswordScreen, ResetPasswordScreen
│   ├── home/            # DashboardScreen, SearchScreen
│   ├── calendar/        # CalendarScreen
│   ├── clients/         # ClientListScreen, ClientFormScreen, ClientDetailScreen
│   ├── events/          # EventFormScreen, EventDetailScreen
│   ├── catalog/         # ProductListScreen, ProductFormScreen, ProductDetailScreen,
│   │                    #   InventoryListScreen, InventoryFormScreen
│   └── profile/         # SettingsScreen, EditProfileScreen, BusinessSettingsScreen,
│                        #   ContractDefaultsScreen, PricingScreen, AboutScreen,
│                        #   TermsScreen, PrivacyPolicyScreen
├── services/            # API service modules (mirrors web/src/services/)
│   ├── clientService.ts
│   ├── eventService.ts
│   ├── eventPaymentService.ts
│   ├── productService.ts
│   ├── inventoryService.ts
│   ├── paymentService.ts
│   ├── searchService.ts
│   ├── subscriptionService.ts
│   ├── revenueCatService.ts  # RevenueCat in-app purchase management
│   └── uploadService.ts      # Image upload handling
├── components/          # Shared UI components
│   ├── shared/          # Reusable components (FormInput, EmptyState, Skeleton,
│   │                    #   LoadingSpinner, ConfirmDialog, SwipeableRow, Avatar,
│   │                    #   KPICard, SegmentedControl, PhotoGallery, UpgradeBanner,
│   │                    #   AnimatedPressable, AppBottomSheet, ImagePickerSheet,
│   │                    #   ToastContainer)
│   ├── navigation/      # CustomDrawerContent, DrawerMenuButton
│   ├── ErrorBoundary.tsx
│   ├── OnboardingChecklist.tsx
│   └── PendingEventsModal.tsx
├── theme/               # Design system
│   ├── colors.ts        # Light/dark color palettes
│   ├── typography.ts    # Font sizes, weights, line heights
│   ├── spacing.ts       # Spacing scale
│   ├── shadows.ts       # Platform-specific shadow styles
│   └── index.ts         # Theme barrel export
└── types/
    ├── entities.ts      # TypeScript type definitions for domain entities
    └── navigation.ts    # Navigation param list types
```

**Key patterns:**

- The mobile app mirrors the web architecture: `lib/api.ts` singleton, `services/` per domain, `contexts/AuthContext`.
- Auth token is stored in `expo-secure-store` (not localStorage). On 401, `api.ts` dispatches `auth:logout` event, caught by `AuthContext`.
- Navigation uses React Navigation 7: RootNavigator switches between AuthStack and DrawerNavigator based on auth state.
- The theme system (`theme/`) provides light/dark palettes, typography, spacing, and shadows — used throughout via `useTheme` hook.
- Forms use React Hook Form with Zod validation (same as web).
- State management: Zustand for global state, React context for auth/theme.
- In-app purchases are managed via RevenueCat (`revenueCatService.ts`) using `react-native-purchases`.
- PDF generation uses `expo-print` to render HTML and `expo-sharing` to share the resulting PDF.
- Error monitoring via Sentry (`@sentry/react-native`), configured in `lib/sentry.ts`.
- Deep linking configured with `solennix://` scheme (for password reset flows).

### Backend API (`backend/internal/`)

```
internal/
├── config/       # Environment configuration (Config struct, loads from .env / env vars)
├── database/     # PostgreSQL connection pool, migration runner
│   └── migrations/   # Numbered SQL migrations (001-014, up/down pairs)
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

| Method  | Path                                    | Handler                      | Auth |
| ------- | --------------------------------------- | ---------------------------- | ---- |
| POST    | `/api/auth/register`                    | AuthHandler.Register         | No   |
| POST    | `/api/auth/login`                       | AuthHandler.Login            | No   |
| POST    | `/api/auth/refresh`                     | AuthHandler.RefreshToken     | No   |
| POST    | `/api/auth/forgot-password`             | AuthHandler.ForgotPassword   | No   |
| GET     | `/api/auth/me`                          | AuthHandler.Me               | Yes  |
| PUT     | `/api/users/me`                         | AuthHandler.UpdateProfile    | Yes  |
| CRUD    | `/api/clients[/{id}]`                   | CRUDHandler.*Client*         | Yes  |
| CRUD    | `/api/events[/{id}]`                    | CRUDHandler.*Event*          | Yes  |
| GET     | `/api/events/upcoming`                  | CRUDHandler.GetUpcoming      | Yes  |
| GET/PUT | `/api/events/{id}/products`             | CRUDHandler.*EventProducts*  | Yes  |
| GET/PUT | `/api/events/{id}/extras`               | CRUDHandler.*EventExtras*    | Yes  |
| PUT     | `/api/events/{id}/items`                | CRUDHandler.UpdateEventItems | Yes  |
| CRUD    | `/api/products[/{id}]`                  | CRUDHandler.*Product*        | Yes  |
| GET/PUT | `/api/products/{id}/ingredients`        | CRUDHandler.*Ingredients*    | Yes  |
| CRUD    | `/api/inventory[/{id}]`                 | CRUDHandler.*Inventory*      | Yes  |
| CRUD    | `/api/payments[/{id}]`                  | CRUDHandler.*Payment*        | Yes  |
| GET     | `/api/subscriptions/status`             | SubHandler.GetStatus         | Yes  |
| POST    | `/api/subscriptions/checkout-session`   | SubHandler.CreateCheckout    | Yes  |
| POST    | `/api/subscriptions/portal-session`     | SubHandler.CreatePortal      | Yes  |
| POST    | `/api/subscriptions/webhook/stripe`     | SubHandler.StripeWebhook     | No*  |
| POST    | `/api/subscriptions/webhook/revenuecat` | SubHandler.RevenueCat        | No*  |

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

### React Native / Mobile

- Screen files: `PascalCaseScreen.tsx` (e.g., `ClientListScreen.tsx`). Organized by domain in `screens/`.
- Component files: `PascalCase.tsx`. Shared components live in `components/shared/`.
- Services follow the same object-literal pattern as web (`const xxxService = { async method() { ... } }`).
- Use the custom theme system (`theme/`) for colors, typography, spacing, and shadows — never hardcode style values.
- Use `useTheme` hook to access `isDark` and current color palette.
- Navigation types are defined in `types/navigation.ts` — always type navigation props.
- No path aliases — use relative imports (e.g., `import { api } from '../lib/api'`).
- TypeScript is configured with `strict: true` (stricter than web).

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
- Auth token: `Authorization: Bearer <token>` header, token stored as `auth_token` in localStorage (web) or `expo-secure-store` (mobile).

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
- Web server command: `npm run dev -- --host` (playwright.config.ts may use pnpm but npm works).

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
- `RESEND_API_KEY` — Resend API key for transactional emails (password reset)
- `RESEND_FROM_EMAIL` — sender address (default: `Solennix <noreply@solennix.com>`)
- `FRONTEND_URL` — for password reset links (default: `http://localhost:5173`)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_PORTAL_CONFIG_ID`
- `REVENUECAT_WEBHOOK_SECRET`

### Web

- `VITE_API_URL` — backend API base URL (default: `http://localhost:8080/api`)

### Mobile

- API base URL is configured in `mobile/src/lib/api.ts` (defaults to `http://localhost:8080/api`; update for production builds).
- RevenueCat API keys are configured in `mobile/src/services/revenueCatService.ts`.
- Sentry DSN is configured in `mobile/src/lib/sentry.ts`.

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

### Adding a new mobile screen

1. Create type definitions in `types/entities.ts` (if new entity, or reuse existing).
2. Create service in `services/xxxService.ts` using `api.ts` (mirrors web service pattern).
3. Create screen component(s) in `screens/xxx/XxxScreen.tsx`.
4. Add screen to the appropriate navigation stack in `navigation/` (or create a new stack).
5. Add navigation param types in `types/navigation.ts`.
6. Use the theme system (`useTheme`, `colors`, `typography`, `spacing`) for styling.

### Adding a new database migration

1. Create `NNN_description.up.sql` and `NNN_description.down.sql` in `backend/internal/database/migrations/`.
2. Use the next sequential number (currently at 014).
3. Migrations run automatically on startup via `database/migrate.go`.

### Running the full test suite before a PR

```bash
cd web && npm run check && npm run lint && npm run test:run
cd ../backend && go test ./...
```

### Running the mobile app locally

```bash
cd mobile && npm install && npm start
# Scan the QR code with Expo Go (Android/iOS) or press 'a'/'i' for emulator
```

---

# PART II — Development Workflow

## Spec-Driven Development (SDD) Orchestrator

You are the ORCHESTRATOR for Spec-Driven Development. Keep the same mentor identity and apply SDD as an overlay.

### Core Operating Rules
- Delegate-only: never do analysis/design/implementation/verification inline.
- Launch sub-agents via Task for all phase work.
- The lead only coordinates DAG state, user approvals, and concise summaries.
- `/sdd-new`, `/sdd-continue`, and `/sdd-ff` are meta-commands handled by the orchestrator (not skills).

### Artifact Store Policy
- `artifact_store.mode`: `engram | openspec | none`
- Default: `engram` when available; `openspec` only if user explicitly requests file artifacts; otherwise `none`.
- In `none`, do not write project files. Return results inline and recommend enabling `engram` or `openspec`.

### Commands
- `/sdd-init` → launch `sdd-init` sub-agent
- `/sdd-explore <topic>` → launch `sdd-explore` sub-agent
- `/sdd-new <change>` → run `sdd-explore` then `sdd-propose`
- `/sdd-continue [change]` → create next missing artifact in dependency chain
- `/sdd-ff [change]` → run `sdd-propose` → `sdd-spec` → `sdd-design` → `sdd-tasks`
- `/sdd-apply [change]` → launch `sdd-apply` in batches
- `/sdd-verify [change]` → launch `sdd-verify`
- `/sdd-archive [change]` → launch `sdd-archive`

### Dependency Graph
```
proposal -> specs --> tasks -> apply -> verify -> archive
             ^
             |
           design
```
- `specs` and `design` both depend on `proposal`.
- `tasks` depends on both `specs` and `design`.

### Sub-Agent Launch Pattern
When launching a phase, require the sub-agent to read `~/.claude/skills/sdd-{phase}/SKILL.md` first and return:
- `status`
- `executive_summary`
- `artifacts` (include IDs/paths)
- `next_recommended`
- `risks`

### State & Conventions (source of truth)
Keep this file lean. Do NOT inline full persistence and naming specs here.

Use shared convention files installed under `~/.claude/skills/_shared/`:
- `engram-convention.md` for artifact naming + two-step recovery
- `persistence-contract.md` for mode behavior + state persistence/recovery
- `openspec-convention.md` for file layout when mode is `openspec`

### Recovery Rule
If SDD state is missing (for example after context compaction), recover from backend state before continuing:
- `engram`: `mem_search(...)` then `mem_get_observation(...)`
- `openspec`: read `openspec/changes/*/state.yaml`
- `none`: explain that state was not persisted

### SDD Suggestion Rule
For substantial features/refactors, suggest SDD.
For small fixes/questions, do not force SDD.
