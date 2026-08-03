# Tasks: Add Geo-Data

> Branch: `feat/v2-geo-data`. Refs: proposal.md, design.md, specs/geo-data/spec.md, Issue #1127.

## Phase 1: Migración + modelo + GeocodingService

- [x] 1.1 Migración 074: `service_radius_km NUMERIC(6,2)` + índice `idx_public_profiles_geo` en (latitude, longitude) WHERE NOT NULL. Down-migration limpio.
- [x] 1.2 Modelo: `ServiceRadiusKm *float64` en `OrganizerPublicProfile`.
- [x] 1.3 Crear `geocoding_service.go`: `Geocode(ctx, city, country) (lat, lng float64, err error)`. HTTP client Nominatim (timeout 3s, User-Agent identificable), cache map+mutex TTL 24h, graceful (0,0,nil nunca rompe caller — log warning), parseFloat custom (sin strconv).
- [x] 1.4 Tests (7, httptest mock): happy path (parsea coords + verifica query lowercase), User-Agent presente, cache hit (1 HTTP call), timeout graceful, 429 graceful, empty query (0,0,nil), no-results caches not-found, normalizeQuery tabla.

## Phase 2: Hook en handler + repo persist coords

- [ ] 2.1 Modificar `UpsertMyPublicProfile`: tras `mergeProfile`, si `merged.City/Country` cambió respecto a `existing` Y `existing.Latitude` es nil, llamar `GeocodingService.Geocode`. Setear `merged.Latitude/Longitude` si éxito. Inyectar GeocodingService como dep del handler.
- [ ] 2.2 Modificar `PublicProfileRepo.Upsert`: persistir latitude/longitude/service_radius_km (campos ya en modelo pero el upsert los omite en v1).
- [ ] 2.3 Tests handler: save con city nueva → geocodifica (mock svc), save sin cambios → no llama svc, timeout svc → save continúa sin error.

## Phase 3: Bounding box + distance sort en directorio

- [ ] 3.1 Extender `SearchPublicProfilesFilters` con `Lat`, `Lng`, `RadiusKm`. Si lat/lng presentes, aplicar bounding box WHERE. Añadir `sort=distance` (ORDER BY euclidiano).
- [ ] 3.2 Modificar `SearchPublicProfiles`: construir bounding box en Go (1° lat ≈ 111km), WHERE latitude/longitude BETWEEN, ORDER BY distance si sort=distance.
- [ ] 3.3 Tests repo: bounding box filtra (seed coords dentro/fuera), distance sort ordena correcto, sin coords excluido de geo filter, combinable con city filter.

## Phase 4: OpenAPI + cleanup + verify + PR

- [ ] 4.1 Sincronizar `openapi.yaml`: params lat/lng/radius_km + sort=distance en searchPublicOrganizers + service_radius_km en upsert schema.
- [ ] 4.2 `gofmt` + `go vet`; `go test ./...` verde.
- [ ] 4.3 verify-report.md + abrir PR linkeando #1127.

## Implementation Order

Lineal: 1 (fundación geo) → 2 (hook + persist) → 3 (query geo) → 4 (OpenAPI + PR). Backend puro.
