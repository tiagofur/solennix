# Tasks: Add Public Request Flow

> Branch: `feat/v2-public-request` (única). Refs: proposal.md, design.md, specs/public-request/spec.md, Issue #1115.

## Phase 1: Foundation (DB + modelos)

- [ ] 1.1 Crear `backend/internal/database/migrations/073_add_public_requests.up.sql` con `public_requests` + `public_responses` (ver data model en design.md D1-D3): CHECK status, FKs, índices (`idx_public_requests_organizer`, `idx_public_requests_expiry`, `idx_public_requests_token` unique).
- [ ] 1.2 Crear `073_add_public_requests.down.sql` con `DROP TABLE public_responses; DROP TABLE public_requests;`.
- [ ] 1.3 Verificar round-trip up/down con `go test ./internal/database/...` (o comando de migraciones del repo).
- [ ] 1.4 Añadir `PublicRequest`, `PublicResponse` structs + `RequestStatus` enum en `backend/internal/models/models.go` (mapeo snake_case→camelCase via tags).

## Phase 2: Repository

- [x] 2.1 Crear `backend/internal/repository/public_request_repo.go` con `PublicRequestRepo`: `Create`, `GetByID`, `GetByIDAndToken`, `ListByOrganizer` (LIMIT/OFFSET + filtros + total), `UpdateStatus`, `SetEventID`, `MarkRead`, `CountUnreadByOrganizer`, `CountPendingByOrganizer`, `ExpireStale`.
- [x] 2.2 Implementar `public_responses` repo (`CreateResponse`, `ListResponsesByRequest`) en mismo archivo.
- [x] 2.3 Tests de integración con DB real (openTestPool): paginación LIMIT/OFFSET sin solapamiento, filtros status/date, cap count, tenant isolation, expire stale. Nota: cursor → LIMIT/OFFSET para consistencia con ClientRepo/EventRepo.

## Phase 3: Service (lógica de negocio)

- [x] 3.1 Crear `backend/internal/services/public_request_service.go` con `PublicRequestService`: validación perfil habilitado + servicios válidos (delegado a `ProductRepo`/`PublicProfileRepo`) en `CreatePublicRequest`; cap 100 pendientes → error.
- [x] 3.2 Implementar máquina de estados `canTransition(from, to)` con mapa de transiciones válidas → error `ErrInvalidTransition`.
- [x] 3.3 Implementar `Respond`, `Decline`, `RequestInfo`, `MarkRead` (delegan a repo + service de transición).
- [x] 3.4 Implementar `ConvertToEvent`: crea `Client` (nuevo, mismo patrón que EventFormLink — dedup por email postergado) + `Event(status=quoted)` en tx reutilizando helpers `CreateClientTx`/`CreateEventTx`/`CreateEventProductsTx`/`UpdateClientStatsTx`; `SetEventID` → booked; idempotente (ErrAlreadyConverted si `event_id` ya set).
- [x] 3.5 Implementar `ClientAction` (accept/decline) validando `client_token` + estados `responded`/`accepted`.
- [x] 3.6 Tests unitarios service con mocks manuales (19 tests): transiciones válidas/inválidas, conversión idempotente + guard de estado, cap excedido, perfil deshabilitado, servicios inválidos, wrong token, helpers.

## Phase 4: Handler + Router

- [ ] 4.1 Crear `backend/internal/handlers/public_request_handler.go`: `CreatePublicRequest` (público, valida slug), `ListOrganizerRequests` (auth), `Respond`, `Decline`, `RequestInfo`, `MarkRead`, `ConvertToEvent` (auth), `ClientAction` (público, header `X-Request-Token`).
- [ ] 4.2 Wiring en `backend/internal/router/router.go`: grupo `/api/public/organizers/{slug}/requests` con `mw.RateLimit`; grupo `/api/organizers/me/requests/*` con `mw.Auth`; `/api/public/requests/{id}/action` con `mw.RateLimit`.
- [ ] 4.3 Tests de integración handler: 404 perfil deshabilitado, 400 servicios inválidos, 409 transición inválida, 429 rate-limit, 429 cap, 401 sin auth en rutas proveedor, flujo crear→responder→aceptar→convertir.

## Phase 5: Job de expiración

- [ ] 5.1 Añadir `ExpireStaleRequests(ctx)` en `PublicRequestService` + repo `MarkExpiredOlderThan(days)`.
- [ ] 5.2 Registrar job diario en el scheduler existente (ver patrón `notification_service.go` scheduler).
- [ ] 5.3 Test del job con clock mockeado (request 15 días → expired; request 10 días → sin cambio).

## Phase 6: OpenAPI + cleanup

- [ ] 6.1 Sincronizar `backend/openapi.yaml` con nuevos schemas (`PublicRequest`, `PublicResponse`, `RequestStatus`) y paths.
- [ ] 6.2 Regenerar tipos web (`web/src/types/`) desde OpenAPI si el pipeline lo requiere.
- [ ] 6.3 `gofmt` + `golangci-lint run` en verde; `go test ./...` 100% verde.
- [ ] 6.4 Comentario de soft-deprecation en `public_lead_handler.go` apuntando a `/requests`.

## Implementation Order

Lineal: 1 → 2 → 3 → 4 → 5 → 6. Cada phase habilita la siguiente (modelos antes que repo, repo antes que service, service antes que handler). Fase 5 y 6 pueden paralelizarse con 4 si hace falta, pero el orden lineal minimiza risk.
