# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #805 — fix(ios): PlanLimitsManager month boundaries use local calendar vs dashboard UTC
- **Estado:** done (pendiente PR)
- **Branch:** `fix/ios-plan-limits-utc-month-boundaries`

## Root cause
`PlanLimitsManager.checkLimits()` armaba el rango `start`/`end` del `GET /events` con `Calendar.current` + `DateFormatter` sin timezone (TZ del dispositivo). En zonas negativas (UTC-6 MX), cerca del límite de mes, el rango discrepaba con `DashboardViewModel.loadDashboard()` (UTC-pinned) → el contador del gate free-plan (`eventsThisMonth`/`canCreateEvent`) se desincronizaba del dashboard.

## Cambios
- [x] `DateFormatting.swift`: nuevo `public static func utcMonthRange(for:) -> (start: String, end: String)` + `private static let utcCalendar`. Reutiliza el `utcDayFormatter` público (UTC-pinned `yyyy-MM-dd`). Rango inclusivo `[primer día, último día]`.
- [x] `PlanLimitsManager.swift`: `checkLimits()` reemplaza 18 líneas (Calendar.current + formatter + dateComponents + guard) por `let (startStr, endStr) = Date.utcMonthRange()`.
- [x] `DashboardViewModel.swift`: `loadDashboard()` delega al mismo helper (eliminando la lógica duplicada de month-range; `utcCalendar` y `dashboardDateFormatter` privados se conservan — scope decidido: month-range only).
- [x] `Localizable.xcstrings`: removida key huérfana `dashboard.error.invalid_date_range` (su único uso era el guard que se eliminó).
- [x] Tests: `DateFormattingTests` +7 (meses 31/30/28/29 días, boundary, regresión UTC-6) · `PlanLimitsManagerTests` +4 (params UTC, count bajo/en límite, no-op sin user).

## Verificación
- `SolennixCore` (xcodebuild test): todos pasan (+7 nuevos)
- `SolennixFeatures` (xcodebuild test): suite completa en verde (+4 nuevos, incluido `DashboardViewModelTests` sin regresión)
- `Solennix` (xcodebuild test): 469/469 (1 skipped preexistente)
- `./init.sh`: verde (web 1334/1334)
- Build esquema `Solennix`: OK

## Notas
- Scope month-range only: no se eliminaron `utcCalendar`/`dashboardDateFormatter` privados del DashboardViewModel (usados por `makeAttentionEvents`, sorting, parseo de `eventDate` en ~8 sitios).
- Paridad cross-platform NO necesaria: bug de TZ exclusivo de iOS (Android/Web calculan mes server-side o con contrato UTC propio).
- `EventListViewModel`/`EventFormViewModel`/`TeamMemberPortalView` usan `Calendar.current` intencionalmente para "Este mes" como filtro de UI — fuera del scope del bug de conteo de plan.

## Bloqueos
- Ninguno.
