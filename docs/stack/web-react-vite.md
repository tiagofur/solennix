---
verified: 2026-11-10
---

# Web Frontend Engineering Standard (`web-react-vite.md`)

This guide operationalizes [`ADR-0002`](../architecture/adr/ADR-0002-client-surfaces-and-mobile-matrix.md) and [`ADR-0003`](../architecture/adr/ADR-0003-contract-first-openapi.md) for the Solennix web app (`web/`).

---

## 1. Directory Blueprint (Actual Layout)

```text
web/
├── src/
│   ├── App.tsx                     # Route tree (react-router-dom v7) — public, protected, portals
│   ├── components/                 # Reusable presentational components (design-system level)
│   ├── contexts/                   # AuthContext, ThemeContext (cross-cutting state)
│   ├── hooks/                      # Custom hooks: usePlanLimits, useToast (zustand), usePwaInstall, ...
│   ├── lib/                        # api.ts fetch client, formatters, pure utilities
│   ├── pages/                      # Page components, grouped by domain (Events/, Assistant/, PublicProfile/, ...)
│   ├── services/                   # One *Service file per API domain (all HTTP via lib/api.ts)
│   ├── types/                      # api.ts — GENERATED from contracts/openapi.yaml (do not hand-edit)
│   ├── i18n/                       # i18next config + locales/{es,en}/*.json
│   └── content/                    # Static content (help center, manual)
├── tests/                          # Playwright E2E specs
├── vite.config.ts
├── tsconfig.json                   # strict TypeScript
└── package.json
```

- **Cognitive Budget**: Keep every `.ts` / `.tsx` file under **~500 lines** (`docs/agent-first-methodology.md`). Split complex views into focused subcomponents and custom hooks.
- **Service-Layer Rule**: Components never call `fetch` directly — every HTTP call goes through a `*Service` in `src/services/`, which uses `src/lib/api.ts` (base URL `VITE_API_URL`, bearer token `auth_token`, emits `auth:logout` on 401).

---

## 2. Approved Stack & Libraries

| Concern | Standard Choice | Prohibited Anti-Pattern |
| :--- | :--- | :--- |
| **Build & Bundler** | **Vite** + **React 19** + **TypeScript (`strict: true`)** | Unjustified SSR frameworks when backed by Go API |
| **Routing** | **`react-router-dom` v7** (data router, `App.tsx`) | Untyped string-concatenated route params; TanStack Router (superseded — see ADR-0002 §2.5) |
| **Server State** | **TanStack Query v5** (`@tanstack/react-query`) | Fetching API data inside `useEffect` + `useState` |
| **API Types** | `openapi-typescript` generated from **`contracts/openapi.yaml`** (`npm run openapi:types` → `src/types/api.ts`) | Hand-written duplicate DTO interfaces |
| **Forms & Validation** | **React Hook Form** + **Zod** | Uncontrolled ad-hoc form state for complex validation |
| **Client State** | Contexts for cross-cutting concerns; **Zustand** for small UI stores (currently only the toast store) | New global state libraries without an ADR |
| **Styling** | **Tailwind CSS v4** (`@tailwindcss/postcss`) | Global CSS class collisions or inline style sprawl |
| **i18n** | **i18next** with `es` / `en` locale files in `src/i18n/locales/` | Hardcoded user-visible strings |
| **Testing** | **Vitest** + **React Testing Library** + **MSW** (unit) · **Playwright** (E2E, `web/tests/`) | Snapshot tests that break on trivial markup changes |

---

## 3. Non-Negotiable Coding Rules

1. **Zero `useEffect` Data Fetching**:
   - All HTTP reads use TanStack Query (`useQuery`) with deterministic query keys (`['events', { status, page }]`).
   - All HTTP mutations use `useMutation` and invalidate the affected query keys on success.
2. **Contract-Derived Types Only**:
   - Import request/response types from `src/types/api.ts` (generated from `contracts/openapi.yaml`). Never manually redeclare backend DTO shapes.
   - Parse non-2xx responses through a unified **RFC 9457 `ProblemDetails`** helper so field-level validation errors map cleanly to form inputs.
3. **Portal Structure**: The route tree has three zones — public (`/`, `/u/:slug`, `/form/:token`, ...), protected organizer app (`/dashboard`, `/events`, `/clients`, `/staff`, ...), and portals (`/team/*` staff portal, `/assistant/*` secretary portal). New role-scoped screens belong in their portal zone.
4. **Strict TypeScript Hygiene**:
   - `any` and `@ts-ignore` are prohibited. Use `unknown` with type narrowing or Zod validation at external boundaries.
5. **Accessibility Baseline**:
   - Every interactive control requires an accessible label/role, keyboard navigation support, and explicit loading/error/empty states.

---

## 4. Verification Commands (`V1` & `V2`)

```bash
# V1: Typegen + typecheck, linter, and focused Vitest run
npm --prefix web run check
npm --prefix web run lint
npm --prefix web run test:run

# V2: Contract sync + production build verification
make contracts-lint
npm --prefix web run build
```
