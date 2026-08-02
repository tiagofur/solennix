# Tasks: Add /proveedores Directory Page

> Branch: `feat/v2-proveedores-directory`. Refs: proposal.md, design.md, specs/proveedores-directory/spec.md, Issue #1117.

## Phase 1: Service + tipos

- [x] 1.1 Crear `web/src/services/organizersDirectoryService.ts`: tipos `DirectoryFilters` + `DirectorySearchResult` + `DirectorySearchError` + `search(filters, signal)` con fetch directo a `GET /api/public/organizers` sin auth, buildQueryString (omite blanks), normaliza data array.
- [x] 1.2 Tests service (7, MSW): happy path, mapeo de query params, omite blanks, normaliza data faltante, error 500 con status, error 429, AbortSignal.

## Phase 2: Componentes presentacionales

- [x] 2.1 Crear `web/src/pages/Proveedores/OrganizerCard.tsx`: cover (lazy load + fallback gradient con iniciales), business_name, headline, ubicación (city/country), rating condicional (4.8 + count o nada si null — Free gating D7), primary_event_types chips (max 3), badge "Destacado" si is_featured, link a /u/:slug.
- [x] 2.2 Strings i18n añadidos al namespace `public` existente (sección `directory`, ES+EN) — reutiliza namespace en vez de crear `directory.json` (cohesión con /u/:slug). 8 tipos de evento + search/empty/card labels.
- [x] 2.3 Tests OrganizerCard (8): datos completos, link /u/:slug, Free sin rating (null), featured badge condicional, sin cover (fallback — no img rota), sin ubicación, max 3 chips, slug como nombre fallback.

## Phase 3: Hook + Página

- [ ] 3.1 Crear `web/src/pages/Proveedores/useDirectoryFilters.ts`: lee/escribe URLSearchParams (city, event_type, q, page), debounce 300ms en inputs texto, setters.
- [ ] 3.2 Crear `web/src/pages/Proveedores/ProveedoresPage.tsx`: hero + buscador inline (ciudad + select tipo + q) + grid responsive (1/2/3 cols) + Pagination + SkeletonCard (carga) + Empty con CTA (0 resultados). Usa React Query con keepPreviousData.
- [ ] 3.3 Tests useDirectoryFilters: sync URL↔state, debounce.
- [ ] 3.4 Tests ProveedoresPage: render inicial, buscador filtra, empty + CTA resetea, paginación cambia URL, skeletons visibles en carga.

## Phase 4: Routing + cleanup + verify

- [ ] 4.1 Añadir `<Route path="/proveedores" element={<ProveedoresPage/>} />` en `web/src/App.tsx` (sección pública, sin AuthGuard).
- [ ] 4.2 `tsc --noEmit` limpio; ESLint pasa; `vitest run` verde.
- [ ] 4.3 verify-report.md + abrir PR linkeando #1117.

## Implementation Order

Lineal: 1 (service) → 2 (componentes) → 3 (hook+página) → 4 (routing+verify). Cada phase habilita la siguiente. Frontend, sin migración, sin backend.
