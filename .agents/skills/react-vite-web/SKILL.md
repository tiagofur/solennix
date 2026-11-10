---
name: react-vite-web
description: "React 19 + Vite + TypeScript strict web architecture (react-router-dom v7, TanStack Query, services layer), generated OpenAPI types from contracts/openapi.yaml, and Vitest + Playwright verification."
---

# Stack Context Skill: React + Vite Web Frontend

Load this skill whenever reading, implementing, or reviewing files under `web/**`, `*.tsx`, `*.ts`, `vite.config.ts`, or `playwright.config.ts`.

**Reference Docs**: [`docs/stack/web-react-vite.md`](../../../docs/stack/web-react-vite.md), [`ADR-0002`](../../../docs/architecture/adr/ADR-0002-client-surfaces-and-mobile-matrix.md), [`ADR-0003`](../../../docs/architecture/adr/ADR-0003-contract-first-openapi.md).

---

## 1. Actual Layout (Solennix `web/`)

```text
web/src/
├── App.tsx                # Route tree (react-router-dom v7): public · protected · /team/* · /assistant
├── components/            # Reusable presentational components (design-system level)
├── contexts/              # AuthContext, ThemeContext (cross-cutting state)
├── hooks/                 # usePlanLimits, useToast (zustand), usePwaInstall, ...
├── lib/                   # api.ts fetch client (auth_token, 401 → auth:logout), formatters
├── pages/                 # Page components grouped by domain (Events/, Assistant/, Staff/, ...)
├── services/              # One *Service per API domain — ALL HTTP goes through here
├── types/                 # api.ts GENERATED from contracts/openapi.yaml (do not hand-edit)
└── i18n/                  # i18next + locales/{es,en}/*.json — no hardcoded user-visible strings
```

---

## 2. Hard Engineering Rules

1. **Service-Layer Discipline**:
   - Components never call `fetch` directly — every request goes through a `*Service` in `src/services/` built on `src/lib/api.ts`.
   - Parse non-2xx responses as RFC 9457 `ProblemDetail` and surface field-level `errors[]` to forms.
2. **Contract-Derived Types Only**:
   - Import request/response types from `src/types/api.ts` (regenerate with `npm run openapi:types`). Never hand-declare backend DTO shapes.
3. **Strict TypeScript**: `strict: true`, zero `any` casts; Zod validation at external boundaries.
4. **State Separation**:
   - **Server State**: TanStack Query v5 with deterministic query keys; never copy server data into global stores.
   - **Cross-cutting State**: Contexts (`AuthContext`, `ThemeContext`); **Zustand** only for small UI stores (currently the toast store).
   - **Ephemeral UI State**: local `useState` / `useReducer` in the nearest component.
5. **Forms**: React Hook Form + Zod for complex forms.
6. **Accessibility & UI States**: every async view renders `loading` / `error` (RFC 9457 alert) / `empty` / `success` explicitly.
7. **Cognitive File Budget**: keep `.tsx`/`.ts` files under ~350–500 lines (`docs/agent-first-methodology.md`).

---

## 3. Verification Commands (`V1` & `V2`)

```bash
# V1: Typegen + typecheck, linter, and Vitest component/hook unit tests
npm --prefix web run check
npm --prefix web run lint
npm --prefix web run test:run

# V2: End-to-end Playwright verification on critical user journeys
npm --prefix web run test:e2e
```
