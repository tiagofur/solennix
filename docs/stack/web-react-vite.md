# Web Frontend Engineering Standard (`web-react-vite.md`)

This guide operationalizes [`ADR-0002`](../architecture/adr/ADR-0002-client-surfaces-and-mobile-matrix.md) and [`ADR-0003`](../architecture/adr/ADR-0003-contract-first-openapi.md) for all React + Vite web applications (`apps/web/`).

---

## 1. Directory Blueprint (Feature-First Architecture)

```text
apps/web/
├── src/
│   ├── app/                        # Application shell, providers, TanStack Router tree
│   ├── shared/
│   │   ├── api/                    # OpenAPI generated types (`schema.d.ts`) + typed fetch client
│   │   ├── ui/                     # Atomic design-system primitives (Button, Dialog, Input)
│   │   └── lib/                    # Pure utilities (RFC 9457 error parser, date/currency formatters)
│   └── features/
│       └── <feature>/              # Vertical slice per product capability
│           ├── api/                # TanStack Query hooks (`use<Resource>Query`, `use<Action>Mutation`)
│           ├── components/         # Feature-scoped presentational & container components
│           ├── model/              # Pure domain validation (Zod schemas, view-model transforms)
│           └── __tests__/          # Vitest + Testing Library unit/integration tests
├── index.html
├── vite.config.ts
├── tsconfig.json                   # `"strict": true`, `"noUncheckedIndexedAccess": true`
└── package.json
```

- **Cognitive Budget**: Keep every `.ts` / `.tsx` file under **~500 lines** (`docs/agent-first-methodology.md`). Split complex views into focused subcomponents and custom hooks.

---

## 2. Approved Stack & Libraries

| Concern | Standard Choice | Prohibited Anti-Pattern |
| :--- | :--- | :--- |
| **Build & Bundler** | **Vite 6+** + **React 19** + **TypeScript (`strict: true`)** | Unjustified SSR frameworks when backed by Go API |
| **Routing** | **TanStack Router** | Untyped string-concatenated route params |
| **Server State** | **TanStack Query v5** (`@tanstack/react-query`) | Fetching API data inside `useEffect` + `useState` |
| **API Client** | `openapi-typescript` + `openapi-fetch` (from `contracts/openapi.yaml`) | Hand-written duplicate DTO interfaces or raw untyped `axios` |
| **Forms & Validation** | **React Hook Form** + **Zod** | Uncontrolled ad-hoc form state for complex validation |
| **Styling** | **Tailwind CSS** + **Radix UI** (`shadcn/ui` patterns) | Global CSS class collisions or inline style sprawl |
| **Testing** | **Vitest** + **React Testing Library** + **MSW** (Mock Service Worker) | Snapshot tests that break on trivial markup changes |

---

## 3. Non-Negotiable Coding Rules

1. **Zero `useEffect` Data Fetching**:
   - All HTTP reads use TanStack Query (`useQuery` / `useSuspenseQuery`) with deterministic query keys (`['invoices', { status, page }]`).
   - All HTTP mutations use `useMutation` and invalidate the affected query keys on success.
2. **Contract-Derived Types Only**:
   - Import request/response types from `src/shared/api/schema.d.ts` (generated from `contracts/openapi.yaml`). Never manually redeclare backend DTO shapes.
   - Parse non-2xx responses through a unified **RFC 9457 `ProblemDetails`** helper so field-level validation errors (`errors[]`) map cleanly to form inputs.
3. **Container vs. Presentational Separation**:
   - Keep pure presentational components free of network hooks so they can be tested and reused across Web and Tauri surfaces effortlessly.
4. **Strict TypeScript Hygiene**:
   - `any` and `@ts-ignore` are prohibited. Use `unknown` with type narrowing or Zod validation at external boundaries.
5. **Accessibility Baseline**:
   - Every interactive control requires an accessible label/role, keyboard navigation support, and explicit loading/error/empty states.

---

## 4. Verification Commands (`V1` & `V2`)

```bash
# V1: Typecheck, linter, and focused Vitest run
npm --prefix apps/web run typecheck
npm --prefix apps/web run lint
npm --prefix apps/web test -- --run

# V2: Contract sync + production build verification
make contracts-lint
npm --prefix apps/web run build
```
