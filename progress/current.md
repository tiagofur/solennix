# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #904 — feat(backend): Optional start_date/end_date alias on GET /events (iOS compat)
- **Estado:** done (pendiente PR + merge)
- **Branch:** `feat/backend-events-date-aliases-904`

## Root cause
iOS `PlanLimitsManager` envía `start_date`/`end_date` en `GET /events`; el backend solo lee `start`/`end`. El filtro se ignora silenciosamente y se devuelve la lista paginada completa. El fix primario es iOS (#799); este issue es "safety net" backward-compat para que los requests iOS no se rompan durante la migración.

## Cambios
- [x] `backend/internal/handlers/crud_handler.go` — `ListEvents`: tras leer `start`/`end` canónicos, si están vacíos lee los aliases `start_date`/`end_date` (con `slog.Warn` de deprecación). El canónico tiene prioridad. El resto del handler opera sobre `start`/`end` ya resueltos sin cambios.
- [x] `backend/internal/handlers/crud_handler_success_test.go` — 2 tests nuevos:
  - `TestListEvents_DateRange_StartDateEndDateAlias_Success`: `?start_date=...&end_date=...` → resuelve a `GetByDateRange` con las mismas fechas.
  - `TestListEvents_DateRange_CanonicalParamWins_Success`: ambos sets enviados → gana el canónico.

## Verificación
- `go test ./internal/handlers/`: verde (incluye deprecation logs visibles en el test del alias).
- `./init.sh`: verde global (Web 1418 tests).

## Notas
- Backend-only, puramente aditivo/backward-compat. Sin cambios de schema/DB/API contract.
- Fuera de scope: fix iOS #799 (el cliente debe migrar a `start`/`end`).

## Bloqueos
- Ninguno.
