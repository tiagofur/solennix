# Proposal: Add Organizers Search (Directorio /proveedores)

> Refs: Issue [#1116](https://github.com/tiagofur/solennix/issues/1116) · PRD `docs/PRD/15_MARKETPLACE_V2.md` §4 · Milestone Solennix v2.0 (Sprint 13 / Fase 1)

## Intent

Sprint 11 (#787) entregó el lookup individual `GET /api/public/organizers/{slug}` y `ListEnabledSlugs` (solo slugs, para sitemap). v2.0 necesita un endpoint de **búsqueda/listado paginado con filtros** para alimentar la página de directorio `/proveedores` (#1117), el SEO (#1119) y el sharing (#1120). Sin esto, el directorio no tiene fuente de datos.

**NG1 ratificado**: el directorio es inbound tooling del SaaS del proveedor. El visitante busca organizadores, no es usuario Solennix.

## Scope

### In Scope
- Nuevo método `SearchPublicProfiles` en `PublicProfileRepo`: query paginada con filtros (city, country, event_type, q texto) + **criterio de publicabilidad** (joins a `products` + completitud) + ranking (featured plan → rating → recientes).
- Handler `GET /api/public/organizers` con query params (city, country, event_type, service_id, q, sort, order, page, limit).
- Proyección liviana `PublicOrganizerCard` (suficiente para cards: slug, business_name, headline, location, rating, reviews_count, cover_image, primary_event_types, is_featured).
- Plan-aware: tier Business aparece primero (featured); Free incluido pero básico.
- Anti-abuse: rate-limit (grupo público existente), cache agresivo (datos cambian poco).
- OpenAPI: nuevo schema `PublicOrganizerCard` + `PaginatedOrganizersResponse` + path `GET /api/public/organizers`.

### Out of Scope
- Geo-search real (PostGIS/bounding box) → #1127 (S15).
- Moderación humana de listings → #1130 (S15).
- Filtros avanzados (presupuesto, disponibilidad, servicios específicos multi-select) → #1128 (S15).
- UI web del directorio → #1117.
- Featured ranking completo (score compuesto) → refinamiento en #1129 (S15); acá solo plan-based simple.

## Approach

**Backend puro, aditivo.** No se modifica el endpoint `/{slug}` existente. Nueva query con CTE para:
1. Filtrar perfiles habilitados + cuenta activa + no deleted.
2. Aplicar **criterio de publicabilidad** (LEFT JOIN products con `show_on_public_profile=true` para contar servicios visibles; WHERE completitud).
3. Aplicar filtros del visitante (city/country/event_type/q).
4. Ordenar (plan Business primero → rating → recientes).
5. Paginar LIMIT/OFFSET (patrón del repo, consistencia con ClientRepo).

`PublicOrganizerCard` es deliberadamente más liviano que `PublicOrganizerProfile` (sin services[]/reviews/portfolio/faq — esos viven en la ficha `/{slug}`). Mejora performance y reduce payload del listado.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/internal/repository/public_profile_repo.go` | Modified | Nuevo `SearchPublicProfiles(ctx, filters)` + struct `PublicOrganizerCard` |
| `backend/internal/handlers/public_profile_handler.go` | Modified | Nuevo `SearchOrganizers` handler (GET público) |
| `backend/internal/router/router.go` | Modified | `GET /api/public/organizers` (sin `{slug}`) en grupo público existente |
| `backend/docs/openapi.yaml` | Modified | Schema `PublicOrganizerCard` + `PaginatedOrganizersResponse` + path |
| `web/src/types/api.ts` | Regenerated | Auto desde OpenAPI |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Query lenta con joins a `products` en cada búsqueda | Medium | Índice en `(is_enabled, city)`; cache (TTL 5min) en futuro; COUNT solo si hay paginación |
| `event_types` TEXT[] filtrado mal (no indexado) | Medium | Usar `ANY()` con GIN index futuro; por ahora ILIKE/text fallback |
| Criterio de publicabilidad excluye organizadores nuevos sin servicios | Low | Documentado: perfiles incompletos NO aparecen (feature, no bug — PRD §4.4) |
| Cache devuelve datos stale tras cambio de plan | Low | Cache corto (5min) + invalidación futura en handler de update |

## Rollback Plan

- Revertir el handler `SearchOrganizers` + ruta nueva (no afecta `/{slug}` existente).
- No hay migración nueva (sin schema change) → rollback instantáneo.
- `SearchPublicProfiles` repo method queda sin callers (código muerto temporal, inofensivo).

## Dependencies

- Issue #1116 (approved). Milestone v2.0.
- Reutiliza `isPubliclyVisibleAccount` + `OrganizerPublicProfile` existente.

## Success Criteria

- [ ] `GET /api/public/organizers?city=Mexico+City` devuelve perfiles publicables paginados.
- [ ] Perfiles incompletos (sin bio/servicios/ubicación/portada) NO aparecen.
- [ ] Plan Business rankea primero; Free incluido pero abajo.
- [ ] Filtros event_type/country/q funcionan (AND combinable).
- [ ] Rate-limit aplicado; sin abuso.
- [ ] `go test ./...` verde; contract test pasa.
- [ ] No rompe `/{slug}` ni apps existentes.
