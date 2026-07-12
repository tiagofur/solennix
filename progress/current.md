# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #828 — fix(android): Widget monthly revenue diverges from dashboard netSalesThisMonth
- **Estado:** done (pendiente PR)
- **Branch:** `fix/android-widget-monthly-revenue-divergence-828`

## Root cause
El widget "Este mes" sumaba `COMPLETED` event `totalAmount` client-side (excluía `CONFIRMED`, sin conciencia de descuentos/impuestos). El dashboard usa `netSalesThisMonth` del backend (`/dashboard/summary`), que scopea confirmed+completed y es tax/discount-aware. Widget y dashboard mostraban valores distintos.

## Cambios
- **`WidgetKpiSnapshot`** (`:core:model`): DTO con `netSalesThisMonth`, `eventsThisMonth`, `updatedAt` — el snapshot server-authoritative que el widget prefiere.
- **`WidgetKpiStore`** (`:widget`): lee/escribe el snapshot en el mismo `EncryptedSharedPreferences` compartido app↔widget (mismo UID). `read()`/`write()`/`clear()` best-effort.
- **`WidgetSyncTrigger`** (`:core:data`): extendido con `saveKpiSnapshot(kpis)` + `clearKpiSnapshot()`.
- **`WidgetSyncCoordinator`** (`:app`): impl que persiste el snapshot vía `WidgetKpiStore` y luego refresca widgets.
- **`DashboardViewModelSync.refresh()`**: tras `getSummary()` exitoso, llama `widgetSyncTrigger.saveKpiSnapshot(summary.kpis)`.
- **`SettingsViewModel.logout()`**: llama `widgetSyncTrigger.clearKpiSnapshot()` antes del refresh.
- **`KpiCalculator.deriveMonthlyRevenue()`**: fallback client-side corregido — confirmed+completed (no solo completed), scoped al mes calendario real vía `YearMonth`. Usado solo cuando no hay snapshot (cold launch antes del primer fetch del dashboard).
- **`KpiWidget`**: lee `WidgetKpiStore.read(context)`; prefiere `snapshot.netSalesThisMonth`, fallback a `deriveMonthlyRevenue(events)`. También corregido el upcoming count para usar `parseFlexibleDate` en vez de naive string compare.

## Verificación
- `:widget:testDebugUnitTest`: verde (+5 tests nuevos de `deriveMonthlyRevenue`)
- `:app:testDebugUnitTest`: verde (coordinator test actualizado con nuevo `appContext` param)
- `:feature:{dashboard,settings}:testDebugUnitTest`: verde
- `assembleDebug`: APK generado OK
- `./init.sh`: verde (entorno completo)

## Notas
- Patrón "server-authoritative override" (igual que iOS PR #921): el dashboard ya fetcha `/dashboard/summary` con `netSalesThisMonth`; solo faltaba persistirlo para que el widget lo lea.
- El snapshot vive en `EncryptedSharedPreferences` (mismo archivo que `WidgetAuthProvider` ya lee) — no requiere DataStore nuevo ni una tabla Room adicional.
- El fallback `deriveMonthlyRevenue` replica el scope del backend (`status IN ('confirmed','completed')`, `totalAmount` ya post-descuento) para cold-launch antes del primer fetch. No replica prorrateo VAT (el snapshot del server es la fuente autoritativa para eso).
- #824 (pending payment balance) ya estaba resuelto en PR #913 (commit 79bb1043) — verificado y confirmado antes de pivotar a #828.
- **Issue:** #809 — fix(ios): EventFormViewModel silently sets product cost to 0 on API error
- **Estado:** done (PR #944 — fix CI LoginFlowTests)
- **Branch:** `fix/ios-event-form-cost-on-error-809`
- **Worktree:** `/Users/tiagofur/dev/solennix-ios-809`

## Root cause
`EventFormViewModel+Profitability.fetchProductCosts()` y `EventDetailViewModel.loadProductUnitCosts()` seteaban `productUnitCosts[id] = 0` cuando fallaba el fetch de ingredientes. Cero costo → margen inflado artificialmente. Peor: `hasPendingProductCosts` (que dispara el warning naranja "Algunos costos de productos siguen cargando") depende de que el costo sea `nil`, pero el `= 0` lo pisa y el warning **nunca aparece** — el usuario ve rentabilidad falsa sin señal. `QuickQuoteViewModel` ya hacía lo correcto (deja `nil`).

## Cambios
- [x] `EventFormViewModel+Profitability.swift`: removido `productUnitCosts[productId] = 0` del `catch`. Agregado `logger` (`os.log`, subsystem `SolennixLog.subsystem`, category `EventFormProfitability`). En error: `logger.error(...)` + deja `nil` → `hasPendingProductCosts` queda `true` → la UI muestra el warning. Docstring actualizado.
- [x] `EventDetailViewModel.swift`: mismo fix en el `withTaskGroup`. Cambio el tipo del group de `(String, Double)` a `(String, Double)?` para poder retornar `nil` en el `catch` y omitir la asignación. Agregado `logger` (category `EventDetailViewModel`). Docstring corregido (decía "records 0 so the margin stays usable" — ahora documenta el comportamiento correcto).
- [x] Tests `EventFormViewModelProfitabilityTests.swift` (nuevo, en `SolennixFeaturesTests/Events/`): 3 casos — regresión #809 (error deja nil + warning visible), éxito (10*2 + 5*4 = 40, equipment excluido), skip producto cacheado. Patrón: `ProfitabilityMockURLProtocol` + `APIClient(session:)` (copia de `ClientFormViewModelTests`).
- [x] CI fix PR #944: `AuthManager.applyUITestAuthBootstrap()` resuelve auth sincrónicamente en UI tests (evita splash race). `LoginFlowTests` reforzado con `hasSeenOnboarding` seed + `waitForExistence(30s)`.

## Verificación
- `SolennixFeatures` (xcodebuild test): 156/156 (+3 nuevos)
- `Solennix` (xcodebuild test): 469/469 (1 skipped preexistente)
- `./init.sh`: verde (Go + Web 1334/1334)

## Notas
- `ProductIngredient` no tiene init público (es `Codable` sintetizado) → los tests usan JSON raw string + `Data(utf8)` en vez de construir el struct.
- `EventDetailViewModel` usa `withTaskGroup` (paralelo) vs. `EventFormViewModel` usa `for` secuencial — el fix se adaptó a cada patrón (sentinel nil opcional vs. omitir asignación).
- Scope: 2 ViewModels afectados (EventFormVM + EventDetailVM). `QuickQuoteVM` ya correcto, no se tocó.
- Paridad cross-platform NO necesaria: bug de manejo de errores del fetch de costos de iOS.
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
