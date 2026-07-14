# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #874 — fix(web): Logout leaves onboarding and checklist localStorage keys
- **Estado:** done (pendiente commit + PR)
- **Branch:** `fix/web-logout-localstorage-874` (a crear)

## Root cause
`AuthContext.signOut` solo llamaba al endpoint `/auth/logout`, limpiaba React Query y redirigía a `/login`. **Nunca tocaba localStorage**. El handler de UI (`Layout.handleSignOut`) solo limpiaba tokens `sb-*-auth-token` en su `catch` (path de error). Resultado: keys session/user-scoped (`eventosOnboardingShown`, `event_checklist_*`, `team_event_detail:*`) sobrevivían al logout, filtrando contexto cross-user en máquinas compartidas.

## Cambios
- [x] `web/src/lib/storage.ts` (nuevo): helper `clearUserScopedStorage()`. Enfoque **denylist** — preserva explícitamente device prefs (`theme`, `sidebar-collapsed`, `sidebar-width`, `i18nextLng`) y onboarding dismissal per-user (`hideOnboarding_<userId>`, paridad con iOS #810). Limpia todo lo demás (secure-by-default).
- [x] `web/src/contexts/AuthContext.tsx`:
  - `signOut` (finally): invoca `clearUserScopedStorage()` antes del redirect.
  - `handleLogout` (401 auto-logout event): invoca `clearUserScopedStorage()`.
- [x] `web/src/components/Layout.tsx`: simplificado `handleSignOut` — removido el bloque inline de cleanup de `sb-*-auth-token` en el catch (ahora redundante: `signOut()` lo hace en su finally). El catch queda como safety net que solo loguea.
- [x] `web/tests/setup.ts`: el mock de `localStorage` ahora implementa `length` (getter) y `key(i)` — spec-compliant. Antes faltaban, impidiendo iteración via `localStorage.key(i)`.

## Tests
- [x] `web/src/lib/storage.test.ts` (nuevo): 9 casos — preserva device prefs, preserva per-user onboarding, limpia cada categoría (eventosOnboardingShown, event_checklist_*, team_event_detail:*, sb-*-auth-token), secure-by-default para keys futuras, caso mixto.
- [x] `web/src/contexts/AuthContext.test.tsx`: mock de `clearUserScopedStorage`; 3 tests existentes (auth:logout event, signOut success, signOut API fail) ahora verifican que la limpieza se invoca.
- [x] `web/src/components/Layout.test.tsx`: actualizado "handles sign out failure" — antes esperaba redirect en el catch (contrato incorrecto), ahora verifica que Layout no duplica el redirect.

## Verificación
- `npx vitest run` (web): **1380/1380** (128 archivos)
- `./init.sh`: verde (Go + Web)

## Notas
- **Paridad cross-platform:** alinea Web con iOS #810 (`hasSeenOnboarding` sobrevive logout; solo se limpia session state).
- **Clasificación de keys:** device prefs sobreviven, per-user dismissals sobreviven, session/leak-prone state se limpia.
- El mock de localStorage en setup.ts ahora es spec-compliant (`length` + `key(i)`) — fix latente para cualquier código futuro que enumere storage keys.
- DRY: el cleanup inline de Layout.tsx se eliminó; `clearUserScopedStorage` es la única fuente.

## Bloqueos
- Ninguno.

---

## (Sesiones previas — pendientes de mover a history.md)

## Feature en curso
- **Issue:** N/D — fix(ios): eliminar warnings de Xcode (concurrencia Swift 6)
- **Estado:** done (sin commitear — rama actual es Android #840/#847)
- **Branch:** `fix/android-dashboard-sync-error-and-debounce-840-847` (cambios iOS no relacionados; crear rama `fix/ios-swift6-warnings` para commitear)

## Root cause
`xcodebuild` reportaba 88 warnings. La raíz de ~70 era `ViewScopedTask.start` exigir un closure `@Sendable` (no-aislado) mientras 46 callsites en Views `@MainActor` mutaban `@State`/`viewModel` dentro. El resto: `@discardableResult` ausente en protocolo `KeychainStoring`, función local `loadOrEmpty` ejecutada concurrentemente sin `@Sendable`, y un closure `handle` en `WidgetSyncCoordinator` declarado no-aislado pero siempre invocado en MainActor.

## Cambios (5 ediciones de 1 línea, sin tocar callsites)
- [x] `ViewModifiers.swift:252`: `ViewScopedTask.start` closure `@Sendable` → `@MainActor` (un closure `@MainActor` es implícitamente `Sendable`). Corrige ~70 warnings en 25 archivos.
- [x] `KeychainHelper.swift:187-191`: añadido `@discardableResult` a `saveString`/`delete` en el protocolo `KeychainStoring` (igualando los métodos concretos). Corrige 11 warnings.
- [x] `SettingsViewModel.swift:182`: añadido `@discardableResult` a `deleteOwnAccount()`. 1 warning. El `Bool` era redundante (estado vía `@Published`).
- [x] `DashboardViewModel.swift:211`: función local `loadOrEmpty` marcada `@Sendable` (5 `async let`). 1 warning.
- [x] `WidgetSyncCoordinator.swift:86`: closure `handle` tipado como `@MainActor () -> Void`. 2 warnings.

## Verificación
- `xcodebuild -scheme Solennix -destination 'iPhone 17' build`: **88 → 0 warnings, 0 errores, BUILD SUCCEEDED**.

## Notas
- Sin cambios de comportamiento: los closures ya corrían/hop-eaban al main actor; ahora se declaran así.
- iOS-only, no altera dominio/DB/APIs → sin propagación cross-platform.
- No hay tests de `ViewScopedTask` (paquete `SolennixDesign` sin test target).
- `Localizable.xcstrings` ya estaba modificado en el working tree al iniciar (entrada `"SOLENNIX"`); NO fue tocado en esta sesión.

---

## (Sesiones previas — pendientes de mover a history.md)

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
