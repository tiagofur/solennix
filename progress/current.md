# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #812 — fix(ios): Dashboard disabled new-event button lacks pricing upgrade path
- **Estado:** done (pendiente merge PR #976)
- **Branch:** `fix/ios-dashboard-upgrade-path-812`
- **Worktree:** `/Users/tiagofur/dev/solennix-ios-812`

## Root cause
3 entrypoints del Dashboard renderizaban "Nuevo evento" como inert (`.disabled()` o sin NavigationLink) cuando el user estaba al plan limit. EventListView ya ruteara a `Route.pricing` en el mismo scenario — inconsistencia cross-screen.

## Cambios
- [x] `DashboardView.swift` (3 edits):
  - **Toolbar Menu** (línea 129-131): removido `.disabled(!canCreateEvent)`. NavigationLink ahora ruteara a `canCreateEvent ? Route.eventForm() : Route.pricing`.
  - **`quickActionItem` helper** (línea 292-304): siempre renderiza NavigationLink. Cuando `isAtLimit`, ruteara a `Route.pricing`. Opacity 0.6 preserva el affordance visual. Parámetro `enabled: Bool` → `isAtLimit: Bool`.
  - **4 call sites** (iPad grid + iPhone HStack × event/client): actualizados al nuevo signature con `isAtLimit: !canCreateEvent` / `!canCreateClient`. "Nuevo cliente" también ruteara a pricing al limit (DRY).

## Verificación
- `SolennixFeatures` (xcodebuild test): 158/158
- `SolennixTests` (xcodebuild test): 482/482 (1 skipped preexistente)
- `./init.sh`: verde (Go + Web)

## Notas
- El `planLimitsBanner` existente (que ya tiene `NavigationLink(value: Route.pricing)`) NO se tocó — funciona como upgrade path secundario.
- El color muted (gris) del botón cuando está al limit se preserva como affordance visual — solo el routing cambió.
- Paridad: este fix alinea Dashboard con EventListView, que ya usaba `Route.pricing` en el toolbar menu.
- **Issue:** #810 — fix(ios): Logout resets hasSeenOnboarding forcing onboarding replay
- **Estado:** done (pendiente merge PR #975)
- **Branch:** `fix/ios-onboarding-replay-logout-810`
- **Worktree:** `/Users/tiagofur/dev/solennix-ios-810`

## Root cause
`SolennixApp.performSessionCleanup` (línea 438) removía `hasSeenOnboarding` de UserDefaults en logout, forzando el replay completo del onboarding en cada logout/login del mismo dispositivo. El flag está en `UserDefaults.standard` (device-scoped), pero el cleanup lo trataba como per-session.

## Cambios
- [x] `SolennixApp.swift`: removida la línea `removeObject(forKey: "hasSeenOnboarding")`. Extraído `internal static clearPerUserUserDefaults()` del `performSessionCleanup` para que el contract de key-survival sea testable sin disparar el cleanup async completo (que toca SwiftData, widgets, notifications). Doc comments actualizados con justificación y paridad Android.
- [x] Tests `SessionCleanupUserDefaultsTests.swift` (nuevo): 2 casos — `hasSeenOnboarding` sobrevive cleanup (regresión #810), per-session keys sí se clear.
- [x] `project.pbxproj`: agregado test file al target.

## Verificación
- `SolennixTests` (xcodebuild test): 484/484 (+2 nuevos, 1 skipped preexistente)
- `./init.sh`: verde (Go + Web)

## Notas
- Paridad Android confirmada: `has_seen_onboarding` sobrevive signOut en Android.
- `appearance` ya se preservaba (device-wide preference). Ahora `hasSeenOnboarding` también.
- Paridad cross-platform: este fix ALINEA iOS con Android.

## Bloqueos
- Ninguno.
