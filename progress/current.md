# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #816 — fix(ios): Notification tap auth fallback checks token presence not validity
- **Estado:** done (pendiente merge PR #965)
- **Branch:** `fix/ios-notification-auth-fallback-816`
- **Worktree:** `/Users/tiagofur/dev/solennix-ios-816`
- **Issue:** #834 — fix(android): Upcoming widget UTC date('now') and missing QUOTED events
- **Estado:** done (pendiente PR)
- **Branch:** `fix/android-upcoming-widget-utc-quoted-834`

## Root cause
`EventDao.getUpcomingEvents` usaba SQLite `date('now')` (UTC) como lower bound de fecha. En LATAM (UTC-6), `date('now')` salta al día siguiente a las 18:00 local → eventos de hoy desaparecen del widget "Próximos Eventos" y del dashboard upcoming list.

## Cambios
- **EventDao:** reemplazado `date('now')` por parámetro `:today` en ambas sobrecargas de `getUpcomingEvents`. El caller pasa `LocalDate.now().toString()` (fecha local).
- **EventRepository:** `getUpcomingEvents(limit, today)` con default `today = LocalDate.now().toString()`.
- **UpcomingEventsWidget:** pasa `today = LocalDate.now().toString()` explícito con comentario de por qué (paridad iOS `Calendar.current.startOfDay`).

## Decisión de scope
- El issue mencionaba "missing QUOTED events" pero iOS actual (`WidgetSyncCoordinator.swift:139`) filtra confirmed-only también. Se mantiene CONFIRMED para paridad con iOS. El bug real y verificable era el UTC.

## Verificación
- `:feature:dashboard:testDebugUnitTest`: verde
- `assembleDebug`: APK generado OK
- **Issues:** #842 (SyncWorker no payments) + #846 (swallows upload failures) — combo SyncWorker
- **Estado:** done (pendiente PR)
- **Branch:** `fix/android-syncworker-payments-upload-errors-842-846`

## Root cause
- **#842:** `SyncWorker.doWork()` sincronizaba events/clients/products/inventory pero nunca `paymentRepository.syncPayments()`. Los pagos solo se sincronizaban al abrir el dashboard → balances stale en background sync.
- **#846:** `syncPendingChanges()` atrapaba cada error per-item con `catch (e: Exception) { /* nada */ }` — sin log, sin conteo. Eventos quedaban `PENDING` silenciosamente.

## Cambios
- **#842:** Inyectado `PaymentRepository` en el constructor de `SyncWorker`. Agregado `syncPayments()` a `doWork()` (download phase) + método privado `syncPayments()` con try/catch (mismo patrón que los otros sync).
- **#846:** `syncPendingChanges()` ahora:
  - Loguea cada error per-item con `action`, `eventId` y `error.message` via `Log.w(TAG, ...)`.
  - Cuenta los fallos y emite un summary al final: `"$failures/${pendingEvents.size} pending event uploads failed"`.
  - El catch outer también loguea (antes era `/* nada */`).
  - Agregado `TAG = "SyncWorker"` al companion.

## Verificación
- `:app:testDebugUnitTest`: verde
- `assembleDebug`: APK generado OK
- `./init.sh`: verde

## Notas
- #846 scope: logging + conteo (observabilidad). No se agregaron notificaciones al usuario ni UI de badge — eso requiere strings localizados + diseño de UI y excede el issue. El log es el primer paso correcto para diagnosticar stale PENDING.
- Los eventos siguen en `PENDING_*` tras un fallo y se reintentan en el próximo sync (cada 15 min) — el comportamiento de retry no cambió, ahora es visible.
- Paridad cross-platform: iOS BackgroundTaskManager ya sincroniza payments. Este issue es de paridad Android-only.
- **Issue:** #815 — fix(ios): Deep link tokens lack client-side format validation
- **Estado:** done (pendiente merge PR #954)
- **Branch:** `fix/ios-deeplink-token-validation-815`
- **Worktree:** `/Users/tiagofur/dev/solennix-ios-815`
- **Issue:** #828 — fix(android): Widget monthly revenue diverges from dashboard netSalesThisMonth
- **Issue:** #835 — fix(android): App Search index not cleared on logout
- **Estado:** done (pendiente PR)
- **Branch:** `fix/android-logout-search-index-835`

## Root cause
`NotificationManager.didReceive` (líneas 419-423) tenía un fallback cuando `isAuthorizedForNavigation` era nil: chequeaba **presence** del token en keychain (`!= nil`). Un token expirado/revocado sigue presente en keychain hasta que el próximo 401 dispara `handleSessionExpired` → la navegación por notification tap pasaba con auth assumption stale.

## Cambios
- [x] `NotificationManager.swift`:
  - Removido el `KeychainHelper` presence fallback. `didReceive` ahora llama a `isNavigationAllowed()` que retorna `isAuthorizedForNavigation?() ?? false` — deny-by-default cuando el closure no está seteado.
  - Extraído `isNavigationAllowed()` como método `@MainActor` testable (sin necesidad de construir `UNNotificationResponse`, que no tiene init público).
  - Doc comments actualizados.
- [x] Tests `NotificationManagerTests.swift`: +3 casos — auth closure true → allowed, false → denied, unset → denied (regresión #816).

## Verificación
- `SolennixTests` (xcodebuild test): 474/474 (+3 nuevos, 1 skipped preexistente)
- `./init.sh`: verde (Go + Web)

## Notas
- `isAuthorizedForNavigation` SIEMPRE se setea en la app principal (`SolennixApp.swift:179`, dentro del primer `.task`). El deny-by-default solo aplica a: cold-launch race (ventana chica), Notification Service Extension (no maneja taps), y tests.
- `UNNotificationResponse` no tiene init público → no se puede testear `didReceive` directamente. Por eso se extrajo `isNavigationAllowed()`.
- Paridad cross-platform NO necesaria: bug de auth client-side de iOS.

## Bloqueos
- Ninguno.
