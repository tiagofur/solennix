# Proposal: Add Public Request Flow (Solicitudes de Cotización Estructuradas)

> Refs: Issue [#1115](https://github.com/tiagofur/solennix/issues/1115) · PRD `docs/PRD/15_MARKETPLACE_V2.md` §3 · Milestone Solennix v2.0 (Sprint 13 / Fase 1)

## Intent

Sprint 11 (#787) entregó el perfil público `/u/:slug` y un `PublicLead` con campos básicos + endpoint `POST /api/public/organizers/{slug}/leads` (rate-limit 5/min). v2.0 necesita **solicitudes estructuradas** (presupuesto, servicios, ubicación, estado) y **respuestas del proveedor con cotización**, para alimentar el directorio `/proveedores` (S13) y la paridad móvil del proveedor (S14). Sin esto, el inbound del proveedor se queda en mensajes libres sin trazabilidad ni conversión a evento.

**NG1 ratificado**: el solicitante es un **visitante con email**, NO un usuario Solennix. No hay `account_type`, no hay cuenta de cliente.

## Scope

### In Scope
- Migración 073: tablas `public_requests` + `public_responses` (separadas de `public_leads` para no romper lo existente).
- Modelos `PublicRequest` (extiende campos de `PublicLead`) + `PublicResponse` + enum `RequestStatus`.
- Estados: `pending | info_requested | responded | accepted_by_client | declined_provider | declined_client | booked | expired`.
- Campos nuevos en request: `budget`, `currency`, `services[]` (JSONB de product IDs públicos), `location`, `status`.
- Endpoints: crear (público), inbox proveedor (paginado), responder, declinar, convertir a evento, marcar leído.
- Anti-spam: rate-limit IP + cap N pendientes por proveedor + captcha (web).
- Job de auto-expiración: 14 días sin acción → `expired`.
- Conversión a evento: reutiliza flujo `EventFormLink` → `Event(status=quoted)` precargado (no crea entidad Quote).

### Out of Scope
- UI web del form (#1118), directorio (#1117), inbox móvil (#1122/#1123) — issues separados de S13/S14.
- Geo-struct en `location` (postergado a #1127).
- Trust score / verificación de cliente (descartado v2.0, NG1).
- Pay-per-lead, comisión (descartado v2.0, NG1).

## Approach

**Backend puro, aditivo.** No se modifica `public_leads` existente (se deja deprecado soft, el endpoint `/leads` sigue funcionando hasta que web migre a `/requests`). Patrón Handler → Service → Repository del repo. Nueva migración 073 con `CHECK` en `status`. Conversión a evento reutiliza `EventFormLink` flow.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/internal/database/migrations/073_*` | New | Tablas `public_requests`, `public_responses` |
| `backend/internal/models/models.go` | Modified | Nuevos tipos `PublicRequest`, `PublicResponse`, `RequestStatus` |
| `backend/internal/repository/public_request_repo.go` | New | CRUD + filtros por status/organizer |
| `backend/internal/handlers/public_request_handler.go` | New | Endpoints públicos + auth del proveedor |
| `backend/internal/services/public_request_service.go` | New | Lógica de estados, conversión a evento, expiración |
| `backend/internal/router/router.go` | Modified | Nuevas rutas bajo `/api/public/organizers/{slug}/requests` y `/api/organizers/me/requests` |
| `backend/internal/jobs/` | Modified | Job periódico de expiración |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Spam inunda el inbox del proveedor | High | Rate-limit IP + cap N pendientes + captcha (#1118) |
| Conversión a evento duplica o rompe Event existente | Medium | Reutiliza `EventFormLink` flow probado; status `quoted` inicial; idempotente por request_id |
| Migración 073 rompe DB existente | Low | Tablas nuevas, FK a `users`; sin ALTER destructivo; down-migration limpia |
| Endpoint público expone datos del proveedor | Medium | Solo lee `slug` + valida `is_enabled`; no PII de clientes |

## Rollback Plan

- Revert migración 073 (down: `DROP TABLE public_requests, public_responses`).
- Remover rutas nuevas del router (no rompe `/leads` existente).
- Los datos de `public_leads` existentes quedan intactos (no se migran).

## Dependencies

- Issue #1115 (approved). Milestone v2.0.
- Reutiliza `EventFormLink` handler/service existente.

## Success Criteria

- [ ] Un visitante puede enviar una `PublicRequest` estructurada a `/api/public/organizers/{slug}/requests`.
- [ ] El proveedor ve su inbox paginado filtrable por status.
- [ ] El proveedor puede responder con presupuesto, declinar, pedir info, y convertir a evento.
- [ ] Solicitudes de 14 días sin acción pasan a `expired` automáticamente.
- [ ] Rate-limit + cap anti-spam operativos.
- [ ] `go test ./...` en verde; migración up/down round-trip OK.
- [ ] No rompe `public_leads` ni apps existentes (sin consumers nuevos todavía).
