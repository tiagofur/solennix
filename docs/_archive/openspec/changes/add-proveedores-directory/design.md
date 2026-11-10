# Design: Add /proveedores Directory Page (Web)

> Refs: proposal.md · specs/proveedores-directory/spec.md · Issue [#1117](https://github.com/tiagofur/solennix/issues/1117) · PRD `docs/PRD/15_MARKETPLACE_V2.md` §4.2

## Architecture

Frontend puro React 19 + TS + Tailwind. Patrón de la web existente: service layer (fetch directo sin auth) + React Query para server state + componentes presentacionales.

```
/proveedores (route pública, App.tsx)
    ↓
ProveedoresPage
    ├── useDirectoryFilters (hook: sync URL ↔ state, debounce)
    ├── useSearchOrganizers (React Query: useQuery con keepPreviousData)
    │       ↓
    │   organizersDirectoryService.search(filters)
    │       ↓ fetch
    │   GET /api/public/organizers?city=&event_type=&q=&page=&limit=
    ├── Buscador (ciudad + tipo evento + q)
    ├── Grid de OrganizerCard (responsive)
    ├── SkeletonCard (carga) / Empty (0 resultados)
    └── Pagination (componente existente)
```

## Decisions

### D1 — Service separado (`organizersDirectoryService`), no reusar `publicProfileService`

**Decisión:** nuevo service `web/src/services/organizersDirectoryService.ts` con `search(filters)`.

**Razón:** `publicProfileService` es para la ficha individual (`/{slug}`). Mezclar búsqueda + ficha en un service viola Single Responsibility y complica el tipo de retorno. Patrón consistente con el resto de services de la web (un service por recurso).

### D2 — React Query para server state (no useEffect+useState manual)

**Decisión:** `useQuery` con `keepPreviousData: true` para evitar layout shift al paginar/filtrar.

**Razón:** la web ya usa React Query extensivamente. `keepPreviousData` mantiene el grid visible mientras carga la nueva página (mejor UX que un flash vacío). El debounce vive en el hook de filtros, no en React Query.

### D3 — URL como source of truth de filtros (vía searchParams)

**Decisión:** los filtros + paginación se leen/escriben en `URLSearchParams` (`?city=&event_type=&q=&page=`). El hook `useDirectoryFilters` sincroniza URL ↔ estado.

**Razón:** URLs shareables (SEO long-tail #1119, sharing #1120), restaurables al recargar, y el historial del browser funciona (back/forward). Es el patrón idiomático de listados con filtros.

### D4 — Debounce 300ms solo en inputs de texto (ciudad, q)

**Decisión:** los inputs de texto (ciudad, q) aplican debounce 300ms antes de disparar la query. El select de tipo evento y la paginación disparan inmediato.

**Razón:** el visitante tipea rápido en inputs; el select es una acción discreta. Debounce solo donde reduce ruido. Sumado al rate-limit del backend (20/min), doble capa anti-spam.

### D5 — `OrganizerCard` como componente dedicado (no genérico)

**Decisión:** nuevo `OrganizerCard.tsx` en `pages/Proveedores/` (colocalizado con la página), no reutilizar `Card.tsx` genérico.

**Razón:** la card del directorio tiene layout específico (cover arriba, datos abajo, badge Featured, rating condicional). El `Card.tsx` genérico es muy simple para esto. Colocalizar con la página sigue el patrón de `PublicProfile/` (que tiene sus sub-componentes ahí).

### D6 — Cover con `loading="lazy"` + fallback

**Decisión:** `<img loading="lazy" />` para covers. Si `cover_url` es null, fallback a un gradient/gris con el logo o iniciales del business_name.

**Razón:** móvil + muchas cards = carga incremental. El backend ya garantiza que publicables tienen cover O logo (criterio #1116), pero el fallback defiende contra null.

### D7 — Rating condicional + formato

**Decisión:** si `average_rating` o `reviews_count` son null → no renderizar el bloque de rating. Si existen → formato `4.8 ★ (23)`.

**Razón:** respeta el gating Free (null) sin lógica negativa. El backend ya decide null vs número (plan-gating en #1116).

## Components

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `organizersDirectoryService` | `web/src/services/organizersDirectoryService.ts` | `search(filters): Promise<PaginatedResponse<PublicOrganizerCard>>` |
| `ProveedoresPage` | `web/src/pages/Proveedores/ProveedoresPage.tsx` | Página + composición (buscador, grid, paginación, states) |
| `OrganizerCard` | `web/src/pages/Proveedores/OrganizerCard.tsx` | Card presentacional |
| `useDirectoryFilters` | `web/src/pages/Proveedores/useDirectoryFilters.ts` | Hook URL↔state + debounce |
| Route | `web/src/App.tsx` | `<Route path="/proveedores" element={<ProveedoresPage/>} />` |
| i18n | `web/src/i18n/locales/{es,en}/directory.json` | Strings |

## Data Flow

1. Visitante entra a `/proveedores?city=CDMX` → `useDirectoryFilters` lee URL.
2. `useSearchOrganizers(filters)` dispara `useQuery(['organizers', filters], ...)`.
3. Service hace `fetch(GET /api/public/organizers?...)` sin auth.
4. React Query cachea; `keepPreviousData` mantiene grid durante refetch.
5. Grid renderiza `OrganizerCard[]`; click → `navigate('/u/'+slug)`.
6. Cambios en inputs → `useDirectoryFilters` actualiza URL → re-dispara query.

## Testing Strategy

- **Service:** mock `fetch`, cubrir happy path + error + params mapping.
- **OrganizerCard:** render con datos completos, Free (sin rating), featured, sin cover (fallback).
- **ProveedoresPage:** render inicial, buscador filtra (mock service), empty state + CTA, paginación, URL params, skeletons.
- **useDirectoryFilters:** sync URL↔state, debounce.

Cobertura target: 85%.

## Out of Scope (recíproco)

- Filtros avanzados (presupuesto, servicios, disponibilidad) → #1128 (S15).
- Sidebar de filtros → #1128.
- Comparación, favoritos → futuro.
- Geo "cerca de mí" → #1127 (S15).
- SSR/ISR → #1119.
