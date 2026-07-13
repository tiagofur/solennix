# Sesión Activa — Solennix Agent Progress

## Feature en curso
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

## Bloqueos
- Ninguno.
