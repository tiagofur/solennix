---
name: react-vite-web
description: "React 19 + Vite + TypeScript strict web architecture, TanStack Router & TanStack Query, generated OpenAPI TypeScript client, container/presentational pattern, and Vitest + Playwright verification."
---

# Stack Context Skill: React + Vite Web Frontend

Load this skill whenever reading, implementing, or reviewing files under `web/**`, `apps/web/**`, `*.tsx`, `*.ts`, `vite.config.ts`, or `playwright.config.ts`.

**Reference Docs**: [`docs/stack/web-react-vite.md`](../../../docs/stack/web-react-vite.md), [`ADR-0002`](../../../docs/architecture/adr/ADR-0002-client-surfaces-web-desktop-mobile.md), [`ADR-0003`](../../../docs/architecture/adr/ADR-0003-contract-first-openapi.md).

---

## 1. Architecture & Screaming Feature Layout

Organize code by domain feature and separate **State/Data Orchestration (Containers)** from **Pure UI Rendering (Presentational)**:

```text
web/src/
├── app/                          # App shell, providers, TanStack Router root
├── api/
│   ├── generated/                # Auto-generated OpenAPI TypeScript types & client (DO NOT EDIT MANUALLY)
│   └── client.ts                 # Configured fetch/ky wrapper with auth & RFC 9457 ProblemDetail parser
├── features/
│   └── <feature-name>/
│       ├── api/                  # TanStack Query hooks (useQuery / useMutation) + queryKey factories
│       ├── components/           # Pure presentational components (props-in, callbacks-out, zero API calls)
│       ├── containers/           # Smart containers wiring router params + TanStack Query to components
│       └── index.ts              # Explicit public barrel for the feature
└── shared/
    ├── ui/                       # Atomic design system primitives (buttons, inputs, dialogs, error banners)
    └── lib/                      # Pure utilities and formatters
```

---

## 2. Hard Engineering Rules

1. **Zero Untyped `fetch` Calls**:
   - All HTTP requests must use the generated OpenAPI TypeScript schema/client (`openapi-typescript` + `openapi-fetch`) sourced from `contracts/openapi.yaml`.
   - Parse non-2xx responses as RFC 9457 `ProblemDetail` objects and surface field-level `errors[]` directly to forms.
2. **Strict TypeScript**:
   - `strict: true`, `noUncheckedIndexedAccess: true`, and zero `any` casts.
3. **State Separation**:
   - **Server State**: Managed exclusively by **TanStack Query** (`@tanstack/react-query`) with deterministic `queryKey` factories. Never copy server data into local `useState` or global stores.
   - **URL / Navigation State**: Managed by **TanStack Router** with validated search parameters.
   - **Ephemeral UI State**: Local `useState` / `useReducer` inside the nearest component.
4. **Accessibility & UI States**:
   - Every async view must explicitly render four states: `loading` (skeleton/spinner), `error` (accessible RFC 9457 alert with retry), `empty` (actionable empty state), and `success`.
   - Use semantic HTML and ARIA labels (`getByRole`, `getByLabelText`) so components are inherently testable.
5. **Cognitive File Budget**:
   - Keep `.tsx`/`.ts` files under ~350–500 lines (`docs/agent-first-methodology.md`). Extract hooks or subcomponents early.

---

## 3. Verification Commands (`V1` & `V2`)

```bash
# V1: Typecheck, linter, and Vitest component/hook unit tests
cd web && npm run typecheck
cd web && npm run lint
cd web && npx vitest run

# V2: End-to-end Playwright browser verification on critical user journeys
cd web && npx playwright test
```
