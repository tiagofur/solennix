# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #806 — fix(ios): PlanLimitsManager swallows errors in checkLimits()
- **Estado:** done (pendiente PR)
- **Branch:** `fix/ios-plan-limits-swallowed-errors`

## Root cause
`PlanLimitsManager.checkLimits()` usaba `(try? await ...) ?? []` para cada endpoint. En fallo de red, todos los counts se seteaban a **0** → `canCreate*` retornaba `true** → el gate free-plan se **abría silenciosamente** (false allowance). El usuario entraba al form sin el guard proactivo y recién al submitir recibía el 403 del server. Además, el `do` no tenía `catch` → cero observabilidad.

## Cambios
- [x] `PlanLimitsManager.swift`: agrega `Logger(subsystem: SolennixLog.subsystem, category: "PlanLimitsManager")` (mismo patrón que `DashboardViewModel`). Reescribe el fetch con `async let` + `do/catch` por endpoint: en éxito actualiza el count, en fallo `logger.error(...)` y **conserva** el último valor. `defer { isLoading = false }` garantiza el reset. Rebasado sobre #805 (ya mergeado): usa `Date.utcMonthRange()` para el rango de mes.
- [x] Tests `PlanLimitsManagerTests.swift` (nuevo): 4 casos — preserva counts en error total (regresión #806), actualiza en éxito consecutivo, fallo parcial (events falla + clients ok), no-op sin user.

## Verificación
- `SolennixFeatures` (xcodebuild test): suite completa en verde (+4 nuevos)
- `Solennix` (xcodebuild test): 469/469 (1 skipped preexistente)
- `./init.sh`: verde
- Build esquema `Solennix`: OK

## Notas
- Gate on error: **preservar último valor + log** (decidido). No fail-closed: bloquear al usuario offline contradice la naturaleza offline-capable de la app (OfflineMutationQueue).
- UI feedback: **solo logging** (decidido). `PlanLimitsManager` es `@Environment` compartido, no un per-screen VM; los list Views ya muestran su propio error de `load*` que típicamente falla a la vez.
- `async let` no se puede capturar en closures → el helper `updateCount`/`assignCount` no funcionaba. Resuelto con `do/catch` inline por cada `await`.
- Paridad cross-platform NO necesaria: bug de manejo de errores del manager de plan de iOS.
- Resuelto conflicto de merge con #805 (PR #929, ya mergeado): ambas tocaban `checkLimits()` en áreas ortogonales (TZ del rango de mes vs. manejo de errores del fetch).

## Bloqueos
- Ninguno.
