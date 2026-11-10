# Proposal: Add /proveedores Directory Page (Web)

> Refs: Issue [#1117](https://github.com/tiagofur/solennix/issues/1117) · PRD `docs/PRD/15_MARKETPLACE_V2.md` §4.2 · Milestone Solennix v2.0 (Sprint 13 / Fase 1)

## Intent

Los backends fundacionales de S13 están mergeeados: #1115 (solicitudes) y #1116 (endpoint search `GET /api/public/organizers`). Pero la web no tiene dónde consumirlos. v2.0 necesita la **página de directorio `/proveedores`** — el hub de descubrimiento donde un visitante (sin cuenta, NG1 ratificado) busca organizadores por ciudad/tipo/texto y navega a sus perfiles públicos. Sin esta página, el inbound del proveedor no tiene superficie de entrada y los endpoints de #1116 quedan sin consumer.

## Scope (MVP — lo avanzado es S15 #1128)

### In Scope
- Service web `organizersDirectoryService.search(filters)` consumiendo `GET /api/public/organizers`.
- Página React `/proveedores` (route pública, sin auth): hero + buscador + grid de cards + paginación.
- Componente `OrganizerCard` (cover, business_name, rating/reviews, ubicación, primary_event_types, badge Featured si `is_featured`).
- Buscador inline: input ciudad + select tipo evento + input q (texto). Sin sidebar de filtros (S15).
- Skeletons durante carga, Empty state con CTA "limpiar filtros" cuando 0 resultados.
- Responsive mobile-first (grid 1 col móvil, 2-3 col desktop) — el cliente llega por móvil vía SEO (#1119).
- Card → link a `/u/:slug` (perfil público existente, #787). Sin drawer/modal.
- i18n ES/EN (regla AGENTS.md).

### Out of Scope (S15 #1128 o posteriores)
- Filtros avanzados (presupuesto, servicios específicos, disponibilidad por fecha) → #1128.
- Sidebar de filtros colapsable → #1128.
- Comparación de proveedores side-by-side → futuro.
- Favoritos / guardar proveedores → futuro (requiere cuenta, choca NG1).
- Geo-search "cerca de mí" → #1127 (S15).
- SSR/ISR para SEO → se evalúa en #1119 (este PR usa CSR; SEO técnico va aparte).

## Approach

**Frontend puro, aditivo.** Nueva página + nuevo service + 1 componente nuevo. No modifica el perfil público `/u/:slug` existente. Patrón de la web existente (React 19 + TS + Tailwind + React Query para server state, fetch directo sin auth como `publicProfileService`).

URL params (`?city=&event_type=&q=&page=`) shareables/bookmarkable — ayuda SEO long-tail (#1119) y sharing (#1120).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `web/src/services/organizersDirectoryService.ts` | New | Service + tipos (reusa `PublicOrganizerCard` de api.ts) |
| `web/src/pages/Proveedores/ProveedoresPage.tsx` | New | Página directorio |
| `web/src/pages/Proveedores/OrganizerCard.tsx` | New | Card reutilizable |
| `web/src/pages/Proveedores/ProveedoresPage.test.tsx` | New | Tests |
| `web/src/App.tsx` | Modified | Route `/proveedores` pública |
| `web/src/i18n/locales/{es,en}/directory.json` | New | Strings i18n |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Lento en móvil (imágenes cover grandes) | Medium | `loading="lazy"` en imgs, thumbnails si el backend los provee |
| Layout shift al paginar | Medium | Skeleton fijo + `keepPreviousData` (React Query) |
| Buscador genera queries spam | Low | Debounce 300ms + el backend ya tiene rate-limit (20/min) |
| Sin SSR → Google no indexa bien | Medium | Se aborda en #1119 (SEO técnico); este PR es CSR |

## Rollback Plan

- Remover la route `/proveedores` de App.tsx.
- Borrar los archivos nuevos (service + página + card + i18n).
- No hay cambios en backend ni en otras páginas → rollback instantáneo.

## Dependencies

- Issue #1117 (approved). Milestone v2.0.
- Consume `GET /api/public/organizers` (#1116, ya mergeeado).
- Reutiliza `/u/:slug` (#787) para los links de cards.

## Success Criteria

- [ ] `/proveedores` carga sin auth y muestra el grid paginado de organizadores publicables.
- [ ] Buscador filtra por ciudad + tipo evento + q (debounced), actualiza URL params.
- [ ] Card muestra los campos correctos + badge Featured en Business + link a `/u/:slug`.
- [ ] Skeletons durante carga + Empty state con CTA cuando 0 resultados.
- [ ] Responsive: 1 col móvil, 2-3 col desktop.
- [ ] i18n ES/EN completo.
- [ ] `vitest` verde; `tsc --noEmit` limpio.
- [ ] No rompe `/u/:slug` ni otras páginas.
