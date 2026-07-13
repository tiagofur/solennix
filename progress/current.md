# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #814 — fix(ios): Replace fatalError with graceful degradation when App Group missing
- **Estado:** done (pendiente merge PR #961)
- **Branch:** `fix/ios-widget-appgroup-fatalerror-814`
- **Worktree:** `/Users/tiagofur/dev/solennix-ios-814`

## Root cause
`WidgetDataSync.appGroup` (línea 41) era `UserDefaults` non-optional backed por `fatalError` cuando `UserDefaults(suiteName:)` retornaba `nil`. Builds mal aprovisionados (CI, nuevos targets sin entitlements) crasheaban en launch en vez de degradar. El crash disparaba en el primer acceso a cualquier método de sync que tocara `appGroup`.

**Nota:** `SolennixApp.swift:134` citado en el issue NO es el mismo bug. Ese `fatalError` es del `SolennixModelContainer` (SwiftData) y **ya degrada correctamente** (persistent → in-memory fallback → crash solo si ambos fallan). Es el template, no un segundo fix.

## Cambios
- [x] `WidgetDataSync.swift`:
  - `appGroup` → `UserDefaults?` lazy. En vez de `fatalError`: `logger.error(...)` + `SentryHelper.capture(message:)` once + store `nil`.
  - Suite name extraído a `static let appGroupIdentifier = "group.com.solennix.app"` (era string inline). `internal` para que tests puedan verificar el valor.
  - Agregado `internal init(suiteName:)` (test-only) para inyectar suite inválido sin tocar el singleton real.
  - `guard let appGroup else { return }` en 6 métodos: `syncUpcomingEvents`, `syncKPIs`, `syncUserPlan`, `syncCurrencyCode`, `setAuthState`, `clearWidgetData`.
  - `reload*Widgets` (no tocan appGroup) sin cambios. `clearWidgetData` todavía llama `reloadAllWidgets()` aunque appGroup sea nil.
- [x] Tests `WidgetDataSyncMissingAppGroupTests.swift` (nuevo): 8 casos — cada método público no-crash con suite inválido, reload siempre safe, y guard del valor de `appGroupIdentifier`.
- [x] `project.pbxproj`: agregado el test file al target `SolennixTests` (vía `xcodeproj` gem — el proyecto usa referencias explícitas, no synchronized groups).

## Verificación
- `SolennixTests` (xcodebuild test): 479/479 (+8 nuevos, 1 skipped preexistente)
- `./init.sh`: verde (Go + Web)

## Notas
- El proyecto Xcode (`objectVersion 77`) **no** usa `PBXFileSystemSynchronizedRootGroup` — referencia explícita de archivos en pbxproj. Agregar un test file nuevo requiere registrarlo en el pbxproj (hecho vía `xcodeproj` gem de Ruby).
- Patrón de degradación replicado de `IntentSharedDataStore` (el sibling intents-extension que ya maneja el missing-suite gracefully) y `SolennixModelContainer` (capture-then-degrade).
- API pública, singleton, las 9 call sites, y el protocolo `WidgetSyncing` sin cambios.
- Widget extension `AppGroup.userDefaults` tiene el mismo `fatalError` pero está out of scope — el widget no puede funcionar sin App Group (no tiene otra data source).

## Bloqueos
- Ninguno.
