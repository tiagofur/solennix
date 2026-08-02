# Tasks: Add Organizers Search

> Branch: `feat/v2-organizers-search` (desde main). Refs: proposal.md, design.md, specs/organizers-search/spec.md, Issue #1116.

## Phase 1: Modelo + Repo

- [x] 1.1 Añadir `models.PublicOrganizerCard` (slug, business_name, headline, city, country, cover_url, logo_url, primary_event_types, average_rating, reviews_count, is_featured, response_time).
- [x] 1.2 Añadir `SearchPublicProfilesFilters` struct (City, Country, EventType, Query, SortBy, Order, Limit, Offset) en `repository/public_profile_repo.go`.
- [x] 1.3 Implementar `SearchPublicProfiles(ctx, filters) ([]PublicOrganizerCard, int, error)`: criterio publicabilidad en SQL con EXISTS (D3) + LEFT JOIN event_reviews con plan-gating CASE WHEN (D4) + ranking plan-aware (D5) + filtros ILIKE/ANY (D6) + LIMIT/OFFSET + total count.
- [x] 1.4 Tests repo DB real (8): empty DB, publicability excluye incompleto, filtro city, filtro event_type, ranking Business primero, Free oculta rating, paginación sin solapamiento, page fuera de rango.

## Phase 2: Handler + Router

- [ ] 2.1 Añadir `SearchOrganizers` handler en `public_profile_handler.go`: parsea query params (city/country/event_type/q/sort/order/page/limit) con `parsePaginationParams`, mapea a `SearchPublicProfilesFilters`, llama al repo, devuelve `writePaginatedJSON`.
- [ ] 2.2 Wiring en `router.go`: `r.Get("/", publicProfileHandler.SearchOrganizers)` en grupo `/public/organizers` (raíz, ANTES de `/{slug}` para evitar conflicto de rutas).
- [ ] 2.3 Tests handler (httptest + mock repo): parseo de params, mapeo filters, happy path paginado, repo error → 500.

## Phase 3: OpenAPI + Cleanup

- [ ] 3.1 Añadir schemas `PublicOrganizerCard`, `PaginatedOrganizersResponse` + path `GET /api/public/organizers` en `backend/docs/openapi.yaml`.
- [ ] 3.2 Regenerar `web/src/types/api.ts` (npm run openapi:types); verificar `tsc --noEmit` limpio.
- [ ] 3.3 `gofmt -w` + `go vet ./...` limpio; `go test ./...` 100% verde; contract test pasa.
- [ ] 3.4 verify-report.md + abrir PR linkeando #1116.

## Implementation Order

Lineal: 1 → 2 → 3. Sin migración (usa tablas existentes), así que Phase 1 es solo Go (modelo + repo + tests). Phase 2 expone HTTP. Phase 3 documenta y limpia.
