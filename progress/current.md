# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #832 — fix(android): Repository sync upsert-only — deleted remote entities persist locally
- **Estado:** done (conflictos de merge con main resueltos, pendiente push)
- **Branch:** `fix/android-sync-orphan-deletion-832`

## Root cause
Los 4 repositorios (`EventRepository`, `ClientRepository`, `ProductRepository`, `InventoryRepository`) hacían solo upsert (`@Insert(REPLACE)`) durante `sync*()`. Las filas cuyo `id` no aparecía en el response del API nunca se borraban → entidades borradas en web persistían en Room indefinidamente (listas, search index, widgets, plan-limit counts).

## Cambios
- **DAOs (4):** Agregué queries de orphan-cleanup + métodos `@Transaction sync*()` atómicos:
  - `EventDao.syncEvents()` / `deleteSyncedOrphans(keepIds)` / `deleteAllSynced()` — preserva `PENDING_*` (mutaciones offline).
  - `ClientDao.syncClients()` / `deleteSyncedOrphans(keepIds)` / `deleteAllSynced()` — preserva `PENDING_*`.
  - `ProductDao.syncProducts()` / `deleteOrphans(keepIds)` — sin `sync_status` (no offline).
  - `InventoryDao.syncInventory()` / `deleteOrphans(keepIds)` — sin `sync_status`.
- **Repositorios (4):** cada `sync*()` ahora delega al método transaccional del DAO en vez del bare `insert*`.
  - `InventoryRepository.syncInventory(typeParam)`: **full sync** (typeParam null) → orphan cleanup; **partial sync** (typeParam non-null) → upsert-only (preserva items de otros tipos).
- **Edge case empty response:** si el API devuelve `[]`, se borran todos los SYNCED (no se puede hacer `NOT IN ([])` en SQL).
- **Merge con main (#943):** sin conflictos de código. `SyncWorker` conserva ambas features — orphan cleanup en `sync*()` + `widgetSyncTrigger.refreshAll()` post-sync.

## Verificación
- `:core:data:testDebugUnitTest`: verde (+6 tests nuevos en Event/Product/Inventory + Client actualizado)
- `assembleDebug`: APK generado OK
- `./init.sh`: verde (entorno completo)

## Notas
- No necesita userId scoping: el API ya devuelve solo las rows del caller (bearer token), así que cualquier row local SYNCED ausente del set es necesariamente un huérfano de este tenant. `NOT IN (:keepIds)` + `sync_status = 'SYNCED'` es suficiente y más seguro.
- Event/Client preservan `PENDING_INSERT/UPDATE/DELETE` durante orphan-cleanup (offline mutations aún no subidas no aparecen en el response del API).
- Product/Inventory no tienen `sync_status` (no soportan offline mutations), así que su cleanup es directo.
- Partial sync de inventory por tipo (`InventoryListViewModel:164`) NO hace orphan cleanup — borraría items de los otros dos tipos ausentes del subset.
- Paridad cross-platform: iOS ya hace reconciliation. Backend no afectado (es solo read path).
- Complementa #831 (#943): orphan cleanup actualiza Room; `WidgetSyncCoordinator` refresca widgets tras sync/mutaciones.

## Bloqueos
- Ninguno.