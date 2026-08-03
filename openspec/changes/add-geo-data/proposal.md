# Proposal: Add Geo-Data (Bounding Box + Coords Capture)

> Refs: Issue [#1127](https://github.com/tiagofur/solennix/issues/1127) · PRD `docs/PRD/15_MARKETPLACE_V2.md` §4.3 · Milestone Solennix v2.0 (Sprint 15 / Fase 3)

## Intent

El directorio `/proveedores` (#1117) filtra hoy solo por `city` texto — no soporta "proveedores cercanos" ni orden por distancia. Las columnas `latitude`/`longitude` ya existen en `organizer_public_profiles` (migration 066) pero están **vacías** (reservadas, "directory-ready; unused in public JSON v1"). v2.0 F3 necesita geo-data real para habilitar discovery por cercanía (#1128).

## Scope

### In Scope
- **Geocoding server-side** via Nominatim/OSM (gratis, sin API key) al guardar el public profile (`PUT /users/me/public-profile`): si la request trae city/country (o cambió), el backend geocodifica y persiste `latitude`/`longitude`.
- **Respeto al rate limit de Nominatim** (1 req/segundo): solo geocodifica cuando la ubicación cambió (no en cada save), y con User-Agent identificable.
- **Campo `service_radius_km`** en `organizer_public_profiles` (radio de cobertura del proveedor) — default null (sin límite).
- **Endpoint `GET /api/public/organizers` extendido** (#1116): soporta query params `lat`, `lng`, `radius_km` para filtrar por **bounding box** (sin PostGIS — rectángulo computado).
- **Sorting `sort=distance`** en el endpoint de directorio (distancia euclidiana aproximada).
- **Manejo graceful de fallos**: si Nominatim no responde o rate-limita, el save del perfil **no falla** (lat/lng quedan null; el proveedor sigue apareciendo por city texto).
- Tests: geocoding (mock HTTP), bounding box query, distance sort, graceful failure.

### Out of Scope
- PostGIS `ST_Distance` → postergado si el volumen lo justifica (bounding box es suficiente para F3).
- Geocoding client-side → postergado (server-side es más simple + cacheable).
- UI web de mapa (selector de punto) → #1128 (S15 web).
- Reverse geocoding en form de solicitud → #1128.

## Approach

**Backend puro, aditivo.** Nuevo service `GeocodingService` (Nominatim client con HTTP timeout + User-Agent). Hook en `UpsertMyPublicProfile` handler: tras `mergeProfile`, si la ubicación cambió respecto al existing, geocodifica y setea coords. Nueva migración 074 añade `service_radius_km`. Query del directorio (#1116 `SearchPublicProfiles`) extendida con bounding box + distance sort.

Nominatim: `https://nominatim.openstreetmap.org/search?q={city},{country}&format=json&limit=1` con header `User-Agent: Solennix/1.0 (contact@solennix.app)`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/internal/services/geocoding_service.go` | New | Nominatim client + cache en memoria (TTL 24h por query) |
| `backend/internal/handlers/public_profile_config_handler.go` | Modified | Hook geocoding en UpsertMyPublicProfile |
| `backend/internal/database/migrations/074_add_service_radius.up.sql` | New | `service_radius_km` column |
| `backend/internal/models/models.go` | Modified | `ServiceRadiusKm *float64` |
| `backend/internal/repository/public_profile_repo.go` | Modified | Bounding box filter + distance sort en SearchPublicProfiles |
| `backend/internal/repository/public_profile_repo.go` (Upsert) | Modified | Persist latitude/longitude |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Nominatim caído o rate-limita | Medium | Graceful: lat/lng null, save no falla, cache 24h |
| Latencia del save del perfil (geocoding síncrono) | Medium | Timeout 3s en Nominatim; graceful skip si excede |
| Coords inexactas (Nominatim menos preciso que Google) | Low | Suficiente para bounding box (no GPS) |
| Bounding box lento sin índice geo | Low | Índice en `(latitude, longitude)` en migración 074 |

## Rollback Plan

- Revertir el hook de geocoding en el handler (lat/lng quedan null, directorio sigue por city).
- Migración 074 down: `DROP COLUMN service_radius_km`.
- `SearchPublicProfiles` vuelve a solo city text (ignora lat/lng params).

## Dependencies

- Issue #1127 (approved). Milestone v2.0.
- Reutiliza `organizer_public_profiles` (latitude/longitude ya existen, migration 066).

## Success Criteria

- [ ] Al guardar un perfil con city+country, el backend geocodifica y persiste lat/lng.
- [ ] `GET /api/public/organizers?lat=&lng=&radius_km=` filtra por bounding box.
- [ ] `sort=distance` ordena por cercanía.
- [ ] Fallo de Nominatim no rompe el save del perfil.
- [ ] `go test ./...` verde; migración up/down round-trip OK.
