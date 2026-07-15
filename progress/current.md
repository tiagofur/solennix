# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #902 — fix(backend): writePlanLimitError and dashboard errors not localized
- **Estado:** done (pendiente commit + PR)
- **Branch:** `fix/backend-i18n-plan-limit-dashboard-902`

## Root cause
`writePlanLimitError` (`helpers.go`) emitía un string español hardcodeado en el campo `message`, sin importar el locale del request. Los 10 handlers de `dashboard_handler.go` usaban `writeError(w, ..., "<English>")` con strings English hardcodeados, inconsistente con el patrón `writeCRUDI18nError` que ya localiza vía `i18n.Message(r.Context(), key)`.

## Cambios
- [x] `backend/internal/i18n/messages.go`: agregados 11 message keys nuevos a ambos catálogos (`es` + `en`):
  - `plan.limit_exceeded` (namespace nuevo).
  - 10 keys `dashboard.*`: `fetch_kpis_failed`, `invalid_period`, `fetch_revenue_chart_failed`, `invalid_scope`, `fetch_events_by_status_failed`, `fetch_top_clients_failed`, `fetch_product_demand_failed`, `fetch_forecast_failed`, `fetch_summary_failed`, `fetch_attention_failed`.
  - Valores `en` = exactamente los strings English antes hardcodeados (preserva contrato de tests existentes, que no inyectan locale → fallback `NoContextLocale = "en"`).
- [x] `backend/internal/handlers/helpers.go`: `writePlanLimitError` cambió signature a `(w, r *http.Request, limitType string, current, max int)` y reemplazó el string hardcodeado por `i18n.Message(r.Context(), "plan.limit_exceeded")`. El code `"plan_limit_exceeded"` y el struct `limit` se preservan (los clientes los parsean).
- [x] 13 callers de `writePlanLimitError` actualizados para pasar `r` (staff_handler.go ×2, crud_handler.go ×9, event_form_handler.go ×2).
- [x] `backend/internal/handlers/dashboard_handler.go`: 10 `writeError(w, ..., "<English>")` → `writeCRUDI18nError(w, r, ..., "<key>")`. Sin cambios de signature.

## Tests
- [x] `backend/internal/handlers/plan_limit_error_test.go` (nuevo, 3 tests): locale ES, locale EN, y fallback a EN cuando no hay locale. Verifica code `plan_limit_exceeded`, `message` localizado y struct `limit` (type/current/max).
- [x] `backend/internal/handlers/dashboard_handler_test.go`: los 10 asserts English existentes siguen pasando (fallback EN). Agregados 2 tests nuevos cubriendo el path localizado ES: `TestDashboardErrors_LocalizedToSpanish` (table-driven, 8 handlers) + `TestDashboardErrors_LocalizedValidation` (invalid_period + invalid_scope en ES).

## Verificación
- `go test ./internal/i18n/ ./internal/handlers/`: verde.
- `./init.sh`: verde global (Web 134 archivos / 1418 tests; Go OK).

## Notas
- Backend-only: sin propagación cross-platform. Los clientes ya parsean el code `plan_limit_exceeded` (machine-readable); solo el campo `message` humano cambia de locale.
- Fuera de scope: strings English en `staff_handler.go` (`"Failed to verify staff limits"`, `"Failed to create staff"`) — no mencionados en #902.

## Bloqueos
- Ninguno.
