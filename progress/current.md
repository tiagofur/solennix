# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #852 — test(android): Add PlanLimitsManager and widget KPI derivation tests
- **Estado:** done (pendiente push + PR)
- **Branch:** `fix/android-planlimits-widget-tests-852`

## Objetivo
Cubrir los 3 gaps de tests más críticos del audit "Judgment Day" (A-027, A-028 / B-026):
1. `PlanLimitsManager` — 0 tests directos (solo VM-level).
2. Widget KPI derivation — 2 de 3 KPIs extraídos como funciones puras; `upcomingEvents` inline.
3. `LocalCacheManager.clearAll()` — 0 tests (purge de logout, 9 tablas Room).

## Cambios

### `PlanLimitsManagerTest.kt` (nuevo, 26 tests)
`core/data/src/test/.../plan/PlanLimitsManagerTest.kt`
- Caps free-tier BASIC matchean fixtures iOS (events=4, clients=20, products=15, inventory=30, catalog=20).
- Umbrales near-limit/limit-reached: events (1-slot), clients (5-slot), products/inventory (3-slot).
- **Catalog gate combinado**: dispara `LimitReached("catalog")` cuando products solos están bajo su cap pero products+inventory superan el cap de catálogo.
- **Month range half-open**: `canCreateEvent` consulta `[firstOfMonth, firstOfNextMonth)` (distinto del inclusive de iOS — pinnado).
- **Fallback offline user-scoped**: API failure → `getEventCountForMonth(userId, …)` con el id del usuario autenticado (tenant-scoped, nunca filas de otro user).
- Paid plans short-circuit antes de contar.

### `KpiCalculator.kt` + `KpiWidget.kt` (extracción)
- Extraído `deriveUpcomingEventsCount(events, today)` de `KpiWidget.provideGlance` (estaba inline en suspend Glance method → no testeable). Preserva el filtro existente: `!date.isBefore(today) && status != CANCELLED`.
- 2 imports sin uso removidos de `KpiWidget.kt` (`EventStatus`, `parseFlexibleDate`).

### `KpiCalculatorTest.kt` (+6 tests, 24 total)
- Boundary behavior del upcoming count: hoy cuenta, pasado excluido, cancelled excluido, quoted incluido, fechas inválidas descartadas.

### `LocalCacheManagerTest.kt` (nuevo, 2 tests)
- `clearAll()` invoca cada delete en los 7 DAOs exactamente una vez (events, clients, products, inventory, payments, event items, staff).
- Tablas staff (`cached_staff`, `cached_event_staff`) se purgan — leak cross-tenant en logout si falta.

## Verificación
- `:core:data:testDebugUnitTest`: PlanLimitsManagerTest 26/26, LocalCacheManagerTest 2/2
- `:widget:testDebugUnitTest`: KpiCalculatorTest 24/24
- `./init.sh`: verde (Go + Web 1371/1371)

## Notas
- **Quirk pinnado**: el branch near-limit de inventory (`inventory >= 27`) está shadowed por el catalog gate (`catalog >= 20`) cuando no hay productos — con 0 products, `0+27=27 >= 20` dispara `LimitReached("catalog")` primero. Test lo documenta como comportamiento consciente.
- Deep-link parsing ya estaba testeado (`DeepLinkRoutesTest`); la lógica park→replay de `MainNavHost.kt` está inline en Compose state (`rememberSaveable`) y necesitaría extracción para ser testeable — fuera de scope de este issue test-only.
- Commits de limpieza suelta (iOS xcstrings + web TODOs) commiteados en `fix/mobile-team-portal-execution-sync-875` (2 commits) antes de arrancar esta rama.

## Bloqueos
- Ninguno.
