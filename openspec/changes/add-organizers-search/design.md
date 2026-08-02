# Design: Add Organizers Search

> Refs: proposal.md · specs/organizers-search/spec.md · Issue [#1116](https://github.com/tiagofur/solennix/issues/1116) · PRD `docs/PRD/15_MARKETPLACE_V2.md` §4.3-§4.4

## Architecture

Patrón canónico del repo: Handler → Repository (sin service — no hay lógica de negocio compleja, solo query + filtros). Endpoint público dentro del grupo `/api/public/organizers` existente.

```
GET /api/public/organizers?city=&event_type=&q=&sort=&page=&limit=
        ↓
PublicProfileHandler.SearchOrganizers
        ↓
PublicProfileRepo.SearchPublicProfiles(ctx, filters)
        ↓
PostgreSQL: CTE publicabilidad + filtros + ranking + paginación
        ↓
[]PublicOrganizerCard + total
```

## Decisions

### D1 — Sin service layer (repo directo)

**Decisión:** el handler llama directo al repo. No hay `SearchService`.

**Razón:** la búsqueda es lectura pura sin reglas de negocio (no hay estados, no hay validaciones complejas). Añadir un service sería ceremony sin valor. Si en el futuro se añade matching/pay-per-lead (S15/v3.0), se introduce service entonces.

### D2 — Proyección `PublicOrganizerCard` (NO el perfil completo)

**Decisión:** nuevo modelo `PublicOrganizerCard` con solo: `slug, business_name, headline, location(city,country), cover_url, logo_url, primary_event_types, rating, reviews_count, is_featured, response_time`.

**Razón:** el `PublicOrganizerProfile` (ficha) tiene services[]/reviews/portfolio/faq/packages — cargar eso para 20 cards por búsqueda = N+1 queries y payload enorme. La card es deliberadamente liviana. El detalle vive en `/{slug}`.

### D3 — Criterio de publicabilidad en SQL (no en Go)

**Decisión:** los 4 requisitos de publicabilidad (PRD §4.4) se aplican en la query SQL con `WHERE` + `EXISTS` subquery, no en Go post-fetch.

**Razón:** filtrar en Go significaría cargar TODOS los perfiles y descartar — no escala. En SQL con EXISTS sobre `products` (con `show_on_public_profile=true`) el filtro corre en la DB.

**Criterio SQL:**
```sql
WHERE opp.is_enabled = true
  AND u.deleted_at IS NULL
  AND u.account_status = 'active'
  AND u.public_slug IS NOT NULL AND u.public_slug <> ''
  AND (u.cover_url IS NOT NULL OR u.logo_url IS NOT NULL)
  AND (opp.headline IS NOT NULL AND opp.headline <> '' OR opp.about IS NOT NULL AND opp.about <> '')
  AND opp.city IS NOT NULL AND opp.city <> ''
  AND opp.country IS NOT NULL AND opp.country <> ''
  AND EXISTS (SELECT 1 FROM products p WHERE p.user_id = u.id AND p.is_active = true AND p.show_on_public_profile = true)
```

### D4 — Rating/reviews_count via LEFT JOIN agregado

**Decisión:** el rating promedio y reviews_count se calculan con un LEFT JOIN sobre `event_reviews` filtrado por visibilidad (mismo patrón que `buildProjection`). Free/null → campos null.

**Razón:** consistencia con la ficha `/{slug}`. Sin duplicar la lógica plan-aware del handler.

### D5 — Ranking simple plan-based (no score compuesto)

**Decisión:** `ORDER BY (plan='business') DESC NULLS LAST, avg_rating DESC NULLS LAST, reviews_count DESC NULLS LAST, u.updated_at DESC`.

**Razón:** el score compuesto (featured + rating + proximidad + tasa respuesta) es S15 (#1129). Para S13 un ranking simple plan-aware es suficiente y reversible. El `sort=rating`/`sort=recent` override el default.

### D6 — Filtros city/country case-insensitive partial (ILIKE)

**Decisión:** `city` y `q` usan `ILIKE '%' || $N || '%'`. `event_type` usa `op.event_types @> ARRAY[$N]::text[]` (array contains).

**Razón:** ILIKE es suficiente sin GIN index (volúmenes bajos-medios). Si escala mal, se añade GIN en S15. `event_types` es TEXT[] → `@>` es el operador idiomático.

### D7 — Rate-limit del grupo existente

**Decisión:** la ruta `GET /api/public/organizers` hereda el `mw.RateLimit(20, 1*time.Minute)` del grupo `/public/organizers` (no se le pone el tight 5/min de `/leads`).

**Razón:** es lectura (no escritura spam-prone). El grupo ya está a 20/min, suficiente para navegación normal. Cache futuro (S15) reducirá aún más el load.

## Data Model

Sin migración nueva (usa tablas existentes: `users`, `organizer_public_profiles`, `products`, `event_reviews`).

## Components

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `models.PublicOrganizerCard` | `backend/internal/models/models.go` | Struct de proyección liviana |
| `repository.PublicOrganizerCard` filters | `backend/internal/repository/public_profile_repo.go` | `SearchPublicProfiles(ctx, SearchPublicProfilesFilters)` |
| `handlers.PublicProfileHandler.SearchOrganizers` | `backend/internal/handlers/public_profile_handler.go` | GET público, parsea query params, mapea errores |
| Router | `backend/internal/router/router.go` | `r.Get("/", publicProfileHandler.SearchOrganizers)` en grupo `/public/organizers` (raíz, antes de `/{slug}`) |
| OpenAPI | `backend/docs/openapi.yaml` | Schema `PublicOrganizerCard`, `PaginatedOrganizersResponse`, path GET |

## Testing Strategy

- **Repo (DB real):** buscar con 0/N filtros, publicabilidad (perfil incompleto excluido), ranking (Business primero), paginación sin solapamiento, tenant-less (es público).
- **Handler (httptest + mocks):** parseo de query params, mapeo a repo filters, paginación, error del repo → 500.
- **Integration:** ruta `/api/public/organizers` responde sin auth (hereda grupo público).

Cobertura mínima target: 85% del código nuevo.

## Out of Scope (recíproco)

- Geo (lat/lng, radio) → #1127 (S15).
- Moderación humana → #1130 (S15).
- Filtros avanzados (presupuesto, disponibilidad) → #1128 (S15).
- Cache (Redis/in-memory) → futuro.
- Featured ranking compuesto → #1129 (S15).
