# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #803 — fix(ios): Widget pending payments stale — payment cache not updated on foreground
- **Estado:** done (pendiente PR)
- **Branch:** `fix/ios-widget-stale-payments`

## Root cause
`EventDetailViewModel.addPayment()` / `deletePayment()` mutaban el array `payments` en memoria y posteaban `.solennixPaymentRegistered` / `.solennixPaymentDeleted`, pero **nunca escribían en la caché SwiftData**. `WidgetSyncCoordinator.syncAll()` deriva `pendingPayments` desde `getCachedPayments(eventId:)`, que devolvía `[]` hasta que `BackgroundTaskManager.performRefresh()` (background, ~30+ min) poblaba la caché. Resultado: el widget mostraba el monto total del evento sin descontar el pago parcial.

## Cambios
- [x] `CacheManager.swift`: `upsertCachedPayment(_:)` (fetch por id + update in place / insert) y `deleteCachedPayment(id:)` — mutaciones de un solo pago sin wipe de la caché existente
- [x] `EventDetailViewModel.swift`: `setCacheManager(_:)` + llamada a `upsertCachedPayment`/`deleteCachedPayment` **antes** del `NotificationCenter.post` (el trigger corre `syncAll` sincrónico en main thread)
- [x] `EventDetailView.swift` + `EventPaymentsDetailView.swift`: `@Environment(CacheManager.self)` + `viewModel.setCacheManager(cacheManager)` en `.task`
- [x] Tests: `CacheManagerTests` (upsert insert+update, delete single id, no-op unknown id) + `WidgetSyncCoordinatorTests` (pendingPayments refleja upsert y delete en el siguiente `syncAll`)

## Verificación
- `SolennixTests` (app): 464/464 pasan (1 skipped preexistente)
- Tests nuevos: 5 (3 CacheManager + 2 WidgetSyncCoordinator), todos en verde
- Build proyecto `Solennix`: OK

## Notas
- Approach: upsert local (sin red), coherente con D3/REQ-WDS-06 — el widget SIEMPRE deriva de la caché local
- Mutación antes del posteo de notificación es crítico: el observer de `WidgetSyncCoordinator` entrega sincrónico en main thread
- Paridad cross-platform NO necesaria: el widget y su arquitectura App-Group son específicos de iOS

## Bloqueos
- Ninguno.
