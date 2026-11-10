# Design: Add Geo-Data (Bounding Box + Coords Capture)

> Refs: proposal.md · specs/geo-data/spec.md · Issue [#1127](https://github.com/tiagofur/solennix/issues/1127) · PRD §4.3

## Architecture

Patrón canónico: Service (GeocodingService, Nominatim client + cache) → hook en Handler (UpsertMyPublicProfile) → Repo (persist + bounding box query).

```
PUT /users/me/public-profile
    ↓
PublicProfileConfigHandler.UpsertMyPublicProfile
    ↓ (tras mergeProfile, si city/country cambió)
GeocodingService.Geocode(ctx, city, country) → (lat, lng, error)
    ↓ HTTP GET Nominatim (timeout 3s, User-Agent, cache 24h)
    ↓ graceful: error → lat/lng nil, save continúa
merged.Latitude/Longitude = coords
    ↓
profileRepo.Upsert(merged)

GET /api/public/organizers?lat=&lng=&radius_km=&sort=distance
    ↓
SearchPublicProfiles (extendido)
    ↓ bounding box WHERE + ORDER BY distance
```

## Decisions

### D1 — Server-side geocoding (no client-side)

**Decisión:** el backend llama a Nominatim al recibir el upsert del perfil.

**Razón:** server-side permite cache (varios organizadores en misma ciudad reusan), control del User-Agent (política OSM), y el proveedor no necesita JS de mapa en su config. Client-side requeriría exponer la query a Nominatim desde el browser + manejar rate limit del lado del cliente.

### D2 — Nominatim con timeout 3s + graceful skip

**Decisión:** `http.Client{Timeout: 3*time.Second}`. Si Nominatim no responde, error, o rate-limita (429), el geocoding se saltea (lat/lng quedan null) y el save del perfil **no falla**.

**Razón:** el save del perfil es la acción principal del proveedor; no puede fallar por un servicio externo gratuito. lat/lng null degrada graceful: el organizador aparece por city texto pero no en geo-search.

### D3 — Cache en memoria (TTL 24h)

**Decisión:** `sync.Map` con entradas `{query → (lat,lng, expiresAt)}`, TTL 24h. Limpieza lazy (al leer, si expiró se re-fetch).

**Razón:** respeta el rate limit de Nominatim (1 req/s): dos organizadores en "Mexico City" → 1 request. 24h es suficiente (las coords de una ciudad no cambian).

### D4 — Bounding box sin PostGIS (rectángulo)

**Decisión:** computar el bounding box en Go a partir de lat/lng/radius_km y filtrar con `WHERE latitude BETWEEN minLat AND maxLat AND longitude BETWEEN minLng AND maxLng`.

**Razón:** PostGIS es heavyweight (extensión + queries complejas) para volúmenes bajos de F3. Bounding box con índice en `(latitude, longitude)` es suficiente y ~10x más simple. Si escala mal en S16, se migra a PostGIS.

### D5 — Distance sort euclidiano aproximado

**Decisión:** `ORDER BY ((latitude - ?)^2 + (longitude - ?)^2)` (euclidiano, sin haversine).

**Razón:** para ranking de cercanía, euclidiano es suficiente (la curvatura terrestre no cambia el orden a escalas de ciudad). Haversine es más preciso pero más caro en SQL. PostGIS `ST_Distance` (preciso) postergado.

### D6 — service_radius_km nullable

**Decisión:** `service_radius_km NUMERIC(6,2)` nullable (null = sin límite).

**Razón:** algunos organizadores viajan a cualquier ciudad; otros son locales. Null = aparece en todas las búsquedas geo. Un valor = aparece solo dentro del radio.

### D7 — Solo re-geocodifica si cambió city/country

**Decisión:** comparar el city/country del existing con el del request. Si son iguales (o el request no los trae), reusar lat/lng existente.

**Razón:** evita llamar a Nominatim en cada save (rate limit). El proveedor guarda otros campos (headline, bio) frecuentemente; re-geocodificar sería desperdicio.

## Data Model

```sql
-- Migración 074
ALTER TABLE organizer_public_profiles
    ADD COLUMN IF NOT EXISTS service_radius_km NUMERIC(6, 2);
CREATE INDEX IF NOT EXISTS idx_public_profiles_geo
    ON organizer_public_profiles (latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
```

(latitude/longitude ya existen desde migration 066.)

## Components

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `GeocodingService` | `backend/internal/services/geocoding_service.go` | Nominatim client + cache + graceful |
| `UpsertMyPublicProfile` hook | `backend/internal/handlers/public_profile_config_handler.go` | Llama GeocodingService si cambió ubicación |
| Migración 074 | `backend/internal/database/migrations/074_*` | service_radius_km + índice geo |
| `SearchPublicProfiles` extendido | `backend/internal/repository/public_profile_repo.go` | Bounding box + distance sort |
| `models.OrganizerPublicProfile` | `backend/internal/models/models.go` | `ServiceRadiusKm *float64` |

## Testing Strategy

- **GeocodingService:** mock HTTP (Nominatim response, timeout, 429, cache hit).
- **Repo:** bounding box filtra correcto, distance sort ordena, sin coords excluido.
- **Handler integration:** save con ubicación nueva geocodifica, save sin cambios no llama, timeout graceful.
- Cobertura target: 85%.

## Out of Scope (recíproco)

- PostGIS ST_Distance → futuro si escala.
- UI web de mapa → #1128.
- Reverse geocoding → #1128.
- Client-side geocoding → descartado.
