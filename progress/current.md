# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #831 — fix(android): No widget sync coordinator — widgets stale after app mutations
- **Estado:** done (resolviendo conflictos de merge con main / #830)
- **Branch:** `fix/android-widget-sync-coordinator-831`

## Root cause
No existía `WidgetSyncCoordinator` en Android. Los widgets Glance leen Room directamente en `provideGlance`, pero solo se refrescan por el `APPWIDGET_UPDATE` broadcast del OS. Tras sync, mutaciones locales (pago, status de evento), login o foreground, los widgets quedaban stale hasta el refresh del sistema.

## Cambios
- **Arquitectura:** `WidgetSyncTrigger` (interface en `:core:data`) + `WidgetSyncCoordinator` (impl en `:app`, `@Singleton`) + `WidgetUpdater`/`GlanceWidgetUpdater` (abstracción sobre `GlanceAppWidget.updateAll`). La interfaz vive en core:data para ser visible a todos los feature modules; la implementación vive en `:app` donde está la dependencia Glance.
- **Hooks (paridad iOS WidgetSyncCoordinator):**
  - `SyncWorker.doWork()` post-sync exitosa
  - `DashboardViewModelActions`: `registerPayment`, `updateEventStatus`
  - `EventDetailViewModel`: `updateEventStatus`, `deleteEvent`, `addPayment`, `deletePayment`
  - `EventListViewModel`: `updateEventStatus`, `confirmDeleteEvent`
  - `EventFormViewModel`: save (create/update)
  - `SettingsViewModel.logout()` tras `clearAll()` (unconditional)
  - `SolennixApp`: `ProcessLifecycleOwner` ON_START (foreground) + observer de `authState` → Authenticated (cubre las 4 rutas de login + restore en cold launch)
- **Auth gate:** `refreshAll()` es no-op cuando signed out (nunca refresca widgets que mostrarían rows de otro tenant). `refreshAllUnconditional()` para logout (post-purge, re-renderiza estado signed-out).
- **Best-effort:** try/catch + Log.w en el coordinator; errores de Glance nunca propagan (paridad iOS REQ-WDS-06).
- **DI:** `WidgetModule` con `@Binds` (WidgetSyncTrigger→Coordinator, WidgetUpdater→GlanceWidgetUpdater) + `@Provides CoroutineDispatcher`.
- **Tests:** `WidgetSyncCoordinatorTest` (5 casos): no-op signed out, refresh cuando authenticated, unconditional siempre, swallow failure en ambos paths. Tests existentes actualizados (Dashboard, Settings, EventDetail, EventForm) con el nuevo constructor param.
- **Merge con main (#830):** conflictos resueltos conservando ambas features — `widgetSyncTrigger` + `planLimitsManager`/`authManager` en `DashboardViewModel` y `EventListViewModel`.

## Verificación
- `:app:testDebugUnitTest`: verde (+5 nuevos WidgetSyncCoordinatorTest)
- `:feature:{dashboard,events,settings,auth}:testDebugUnitTest`: verde
- `assembleDebug`: APK generado OK
- `./init.sh`: verde (entorno completo)

## Notas
- A diferencia de iOS (que deriva payloads y escribe App Group), Android solo necesita disparar `updateAll()` porque los widgets leen Room directamente. El coordinator es más simple.
- El hook del dashboard NO es sobre `getSummary()` — los widgets no leen KPIs del summary del backend, solo Room (eventDao/paymentDao). El summary actualiza `_kpis` en memoria del VM, irrelevante para widgets. Los hooks correctos son sobre mutaciones que escriben Room.
- Login cubierto con un solo observer de `authState` en `SolennixApp` en vez de instrumentar las 4 rutas de AuthViewModel (paridad con iOS `onChange(of: authManager.authState)`).
- `CoroutineDispatcher` inyectado en el coordinator para testabilidad (StandardTestDispatcher en tests).
- Paridad cross-platform: iOS ya tiene `WidgetSyncCoordinator` (PRs #921/#927/#928). Este issue es de paridad Android-only.

## Bloqueos
- Ninguno.