# Tasks: Add /proveedores Directory Page

> Branch: `feat/v2-proveedores-directory`. Refs: proposal.md, design.md, specs/proveedores-directory/spec.md, Issue #1117.

## Phase 1: Service + tipos

- [x] 1.1 Crear `web/src/services/organizersDirectoryService.ts`: tipos `DirectoryFilters` + `DirectorySearchResult` + `DirectorySearchError` + `search(filters, signal)` con fetch directo a `GET /api/public/organizers` sin auth, buildQueryString (omite blanks), normaliza data array.
- [x] 1.2 Tests service (7, MSW): happy path, mapeo de query params, omite blanks, normaliza data faltante, error 500 con status, error 429, AbortSignal.

## Phase 2: Componentes presentacionales

- [ ] 2.1 Crear `web/src/pages/Proveedores/OrganizerCard.tsx`: cover (lazy + fallback), business_name, headline, ubicación, rating condicional (`4.8 ★ (23)` o nada si null), primary_event_types chips, badge "Destacado" si is_featured, link a `/u/:slug`.
- [ ] 2.2 Crear `web/src/i18n/locales/{es,en}/directory.json` + registrar namespace en i18n config.
- [ ] 2.3 Tests OrganizerCard: datos completos, Free sin rating, featured con badge, sin cover (fallback).

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
