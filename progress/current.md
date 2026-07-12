# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #820 — perf(ios): Gate dashboard premium API fetches for basic plan users
- **Estado:** done (pendiente merge PR #949)
- **Branch:** `perf/ios-dashboard-premium-fetch-gating-820`
- **Worktree:** `/Users/tiagofur/dev/solennix-ios-820`

## Root cause
El issue se escribió antes de #807. Originalmente había 5 fetches premium separados; #807 los consolidó en un único `GET /dashboard/summary`. Eso significa que un **basic user hacía el mismo fetch pesado que un Pro/Business** — solo se le ocultaba el `premiumReportsCard` en la UI, pero los 5 datasets premium viajaban igual por la red para renderizarse en nada.

## Cambios
- [x] `DashboardViewModel.swift`: agregado `isBasicPlan: Bool` al `init` (snapshot de `PlanLimitsManager.isBasicPlan` al cargar, default `false` para no romper callers existentes). `loadDashboard()` branchear: basic → `GET /dashboard/kpis` (core counts); paid → `GET /dashboard/summary` (bundle completo). Extraído `applyKPIs(_ kpis:now:)` de `applySummary` para compartir la lógica de KPIs + `NotificationCenter` post + `lowStockCount` sin duplicar.
- [x] `DashboardView.swift`: `.task` pasa `isBasicPlan: planLimitsManager.isBasicPlan` al constructor del VM. Gateados `ForecastWidgetView`, `TopClientsWidgetView`, `ProductDemandWidgetView` detrás de `!planLimitsManager.isBasicPlan` para consistencia con `premiumReportsCard` (que ya estaba gateado). Antes los 3 widgets se renderizaban vacíos/loading para basic users.
- [x] Tests `DashboardViewModelPlanGatingTests.swift` (nuevo, en `SolennixFeaturesTests/Dashboard/`): 2 casos — basic → kpis only (summary nunca hit, premium datasets vacíos), paid → summary (todos los datasets populados). Reusa `MockURLProtocol` de `DashboardViewModelTests`.

## Verificación
- `SolennixFeatures` (xcodebuild test): 155/155 (+2 nuevos)
- `Solennix` (xcodebuild test): 469/469 (1 skipped preexistente)
- `./init.sh`: verde (Go + Web 1341/1341)

## Notas
- `init(apiClient:)` defaultea `isBasicPlan: false` → callers existentes (tests, previews) siguen funcionando sin cambios (toman el path paid/summary, que es el comportamiento previo).
- Rebasado sobre `origin/main` (`61847215`) antes de pushear.
- Endpoint `dashboardKpis` ya existía (`/dashboard/kpis`) — no requiere cambio de backend.
- Paridad cross-platform NO necesaria: optimización de fetch específica de iOS. Android/Web tienen sus propios mecanismos de gating.

## Bloqueos
- Ninguno.
