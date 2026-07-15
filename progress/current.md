# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #1014 — fix(backend): staff handler errors not localized (English hardcoded)
- **Estado:** done (pendiente PR + merge)
- **Branch:** `fix/backend-staff-handler-i18n-1014`

## Root cause
`staff_handler.go` usaba `writeError(w, ..., "<English>")` para los 71 mensajes de error, inconsistente con el patrón `writeCRUDI18nError` de `crud_handler.go` y (tras #902) `dashboard_handler.go`. Hermano de #902.

## Cambios
- [x] `backend/internal/i18n/messages.go`: +38 keys `staff.*` en catálogos `es`+`en`. Valores `en` = texto English verbatim actual (preserva contrato de tests existentes que no inyectan locale → fallback `en`).
- [x] `backend/internal/handlers/staff_handler.go`: 71 `writeError` → `writeCRUDI18nError` con keys `staff.*`. 8 reutilizan keys existentes (`common.invalid_request_body` ×7, `crud.fetch_user_limits_failed` ×1). No se tocaron `writePlanLimitError` (#902) ni `validationErrorMessage` (ya localizado).
- [x] `backend/internal/handlers/staff_handler_i18n_test.go` (nuevo): 8 subtests cubren paths localizados ES (400/403/500/503) + 1 test fallback EN.

## Verificación
- `go test ./internal/handlers/`: verde (incluye tests existentes de staff, que siguen pasando por fallback EN).
- `./init.sh`: verde global (Web 1418 tests).

## Notas
- Backend-only: sin propagación cross-platform. Los clientes parsean codes machine-readable; solo el `message` humano cambia de locale.
- `staff.fetch_user_failed` se repite 7 veces en staff_handler.go; se confirmó que NO aparece en otros handlers, así que se mantuvo scoped a `staff.*` (no se hoistó a `common.*`).

## Bloqueos
- Ninguno.
