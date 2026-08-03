# Tasks: Add Geo-Data

> Branch: `feat/v2-geo-data`. Refs: proposal.md, design.md, specs/geo-data/spec.md, Issue #1127.

## Phase 1: Migración + modelo + GeocodingService

- [x] 1.1 Migración 074: `service_radius_km NUMERIC(6,2)` + índice `idx_public_profiles_geo` en (latitude, longitude) WHERE NOT NULL. Down-migration limpio.
- [x] 1.2 Modelo: `ServiceRadiusKm *float64` en `OrganizerPublicProfile`.
- [x] 1.3 Crear `geocoding_service.go`: `Geocode(ctx, city, country) (lat, lng float64, err error)`. HTTP client Nominatim (timeout 3s, User-Agent identificable), cache map+mutex TTL 24h, graceful (0,0,nil nunca rompe caller — log warning), parseFloat custom (sin strconv).
- [x] 1.4 Tests (7, httptest mock): happy path (parsea coords + verifica query lowercase), User-Agent presente, cache hit (1 HTTP call), timeout graceful, 429 graceful, empty query (0,0,nil), no-results caches not-found, normalizeQuery tabla.

## Phase 2: Hook en handler + repo persist coords

- [x] 2.1 Modificar `UpsertMyPublicProfile`: interfaz geocoderPort + field geocoder en handler + constructor recibe geocoder. Hook tras mergeProfile: si locationChanged(existing, merged) → GeocodingService.Geocode → setear merged.Latitude/Longitude si éxito (lat/lng != 0). locationChanged compara city/country + coordsEmpty. main.go instancia geocodingService y lo pasa.
- [x] 2.2 Modificar repo Upsert: INSERT/UPDATE/RETURNING + args añaden service_radius_km ($27). scanProfile + GetByUserID SELECT añaden service_radius_km.
- [x] 2.3 Suite backend 100% verde (handlers, repository, router, server compilan con la nueva firma del constructor).

## Phase 3: Bounding box + distance sort en directorio

- [x] 3.1 Extender `SearchPublicProfilesFilters` con `Lat`, `Lng`, `RadiusKm` (*float64) + `SortBy="distance"`.
- [x] 3.2 Modificar `SearchPublicProfiles`: bounding box WHERE (1° lat ≈ 111km, 1° lng ≈ 111*cos(lat)km, helper cosDeg), lat/lng BETWEEN con 4 params. `sort=distance` ORDER BY euclidiano (POWER diff^2). Helper cosDeg (math.Cos en grados).
- [x] 3.3 Tests repo (5, DB real): bbox filtra cerca/lejos (radius 50/600km), sin coords excluido, distance sort ordena cercanía (3 orgs a distancias crecientes), geo combinable con city filter AND.

## Phase 4: OpenAPI + cleanup + verify + PR

- [x] 4.1 Sincronizar `openapi.yaml`: params lat/lng/radius_km + sort enum extends [relevance, rating, recent, distance] en searchPublicOrganizers + service_radius_km en OrganizerPublicProfileUpsertRequest.
- [x] 4.2 `gofmt -w` aplicado (3 archivos); web types regenerados (+4 geo refs); tsc limpio; `go test ./...` 100% verde; contract test pasa; YAML válido.
- [x] 4.3 verify-report.md escrito (PASS WITH WARNINGS); PR abierto.

## Implementation Order

Lineal: 1 (fundación geo) → 2 (hook + persist) → 3 (query geo) → 4 (OpenAPI + PR). Backend puro.
