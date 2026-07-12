# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #830 — fix(android): No plan gating before navigation to event form
- **Estado:** done (pendiente PR)
- **Branch:** `fix/android-plan-gating-event-form-830`
- **Worktree:** `/Users/tiagofur/dev/solennix-android`

## Root cause
Android navegaba a `event_form?eventId=` (evento nuevo) desde 6 entrypoints sin checkear `canCreateEvent` antes. Free users a 4 eventos/mes solo recibían el paywall al final del submit dentro del form. iOS sí gateaba en `EventListView`/`DashboardView` con `planLimitsManager.canCreateEvent` + banner. Paridad rota (Judgment Day A-005 CRITICAL).

## Cambios
- [x] `EventPlanGateViewModel.kt` (nuevo, módulo `app`): `@HiltViewModel` centralizado que expone `isLimitReached`/`limitReachedMessage`. `checkLimit()` en init + al reanudar (`LifecycleResumeEffect`).
- [x] `CompactBottomNavLayout.kt`: helper `tryCreateEvent(route)` que muestra `UpgradePlanDialog` si `isLimitReached` o navega. Aplicado a los 6 entrypoints: FAB global, Dashboard quick-action, Dashboard onboarding, EventsScreen calendario, QuickQuote→Convert, EventDetail→Duplicate.
- [x] `EventListViewModel.kt`: agregado `PlanLimitsManager`+`AuthManager` al constructor. Propiedades `limitCheckResult`/`isLimitReached`/`nearLimitMessage`/`limitReachedMessage` (clon del patrón `ClientListViewModel`). `checkPlanLimits()` en init + al final de `refresh()`.
- [x] `EventsScreen.kt`: parámetro `onUpgradeClick`, `UpgradeBanner(WARNING)` near-limit arriba del content.
- [x] `DashboardViewModel.kt`: agregado `PlanLimitsManager` al constructor, `limitCheckResult`/`nearLimitMessage`. `checkPlanLimits()` en `refresh()` (vía `DashboardViewModelSync.kt`).
- [x] `DashboardScreen.kt`: `UpgradeBanner(WARNING)` near-limit debajo del promo banner existente.
- [x] Strings `plan_limit_events_near`/`plan_limit_events_reached` en `core:designsystem` (genéricos, reutilizables cross-feature — dashboard no depende de events).

## Decisiones
- **Gate centralizado en módulo `app`** (no replicado 6 veces): los entrypoints viven en `CompactBottomNavLayout`, un solo `EventPlanGateViewModel` los cubre.
- **Banner near-limit además del diálogo**: paridad iOS + clients/products Android. El diálogo bloquea; el banner preveniene.
- **`EventFormViewModel.checkCreateEvent` existente NO se toca**: queda como defensa en profundidad si el gate falla offline.
- **Edición (`eventId=$id`) no se gatea**: correcto, solo crear.
- Strings en `core:designsystem` (no en `feature:events`) porque `DashboardViewModel` referencia el string y dashboard no depende de events.

## Verificación
- `:core:designsystem:assembleDebug :feature:events:assembleDebug :feature:dashboard:assembleDebug :app:assembleDebug`: BUILD SUCCESSFUL
- `:feature:events:testDebugUnitTest`: verde (+4 tests nuevos en `EventListViewModelTest`)
- `:feature:dashboard:testDebugUnitTest`: verde (+1 test near-limit, 5 constructores actualizados)
- `:app:testDebugUnitTest`: verde (+4 tests `EventPlanGateViewModelTest`)
- `./init.sh`: verde (backend Go + web React 1334 tests)

## Bloqueos
- Ninguno.
