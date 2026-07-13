# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #816 — fix(ios): Notification tap auth fallback checks token presence not validity
- **Estado:** done (pendiente merge PR #965)
- **Branch:** `fix/ios-notification-auth-fallback-816`
- **Worktree:** `/Users/tiagofur/dev/solennix-ios-816`

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
