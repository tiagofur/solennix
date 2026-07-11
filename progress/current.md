# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #804 — fix(ios): Widget sync reads stale SwiftData cache after event/payment mutations
- **Estado:** done (pendiente PR)
- **Branch:** `fix/ios-widget-stale-event-cache`

## Root cause
3 flujos postean `.solennixEventUpdated` sin actualizar la caché SwiftData antes del posteo:
- `EventFormViewModel.save()` — create/update via repository (devolvía `Event` pero se descartaba con `_ =`). No tenía `cacheManager`.
- `EventDetailViewModel.changeStatus()` — `PUT` devuelve `updated`, lo asignaba a `event` en memoria, posta sin cachear.
- `EventDetailViewModel.deleteEvent()` — `DELETE`, posta sin remover de caché.

`WidgetSyncCoordinator.syncAll()` lee `getCachedEvents()` sincrónicamente al recibir el trigger → obtenía el snapshot pre-mutación → widget stale hasta el próximo `loadEvents()` o BG refresh. Espejo exacto de #803 (pagos) para eventos.

## Cambios
- [x] `CacheManager.swift`: `upsertCachedEvent(_:)` (fetch por id + update in place / insert) y `deleteCachedEvent(id:)` — espejo de los helpers de payment de #803
- [x] `EventDetailViewModel.swift`: `changeStatus` y `deleteEvent` mutan la caché **antes** del `NotificationCenter.post` (ya tenía `cacheManager` del #803)
- [x] `EventFormViewModel.swift`: `setCacheManager(_:)` + `mirrorEventToCache(_:)` (método `@MainActor` para mantener `cacheManager` private — el `+Save` es otro archivo)
- [x] `EventFormViewModel+Save.swift`: captura el `Event` retornado por `eventRepository.create/update` (antes descartado) y llama `mirrorEventToCache` antes del post
- [x] `EventFormView.swift` (`FormLifecycleModifier`): `@Environment(CacheManager.self)` + `setCacheManager` en `.task`
- [x] Tests: `CacheManagerTests` (3 de eventos) + `WidgetSyncCoordinatorTests` (2 — status change y delete se reflejan en `confirmedEvents`/`pendingPayments`)

## Verificación
- `SolennixTests` (app): 469/469 pasan (1 skipped preexistente)
- Tests nuevos: 5 (3 CacheManager + 2 WidgetSyncCoordinator)
- Build proyecto `Solennix`: OK

## Notas
- `mirrorEventToCache` es `@MainActor` para poder llamar `upsertCachedEvent` (aislado) desde el `+Save` sin exponer `cacheManager` como `internal`
- Paridad cross-platform NO necesaria: mismo rationale que #803

## Bloqueos
- Ninguno.
