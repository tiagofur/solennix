# Verification Report — add-public-request-flow

**Change**: add-public-request-flow
**Issue**: #1115 (Sprint 13 / Fase 1, Solennix v2.0)
**Branch**: feat/v2-public-request
**Verified**: 2026-08-01

---

## Completeness

| Métrica | Valor |
|--------|-------|
| Tasks totales | 19 |
| Tasks completas | 19 |
| Tasks pendientes | 0 |

Todas las tasks de las 6 phases marcadas `[x]`.

---

## Build & Tests Execution (real)

**Build**: ✅ `go build ./...` limpio (exit 0).

**Vet**: ✅ `go vet ./...` limpio.

**gofmt**: ✅ Aplicado a 5 archivos (`-l` devuelve vacío).

**Tests**: ✅ **47/47 tests nuevos pasan** + suite backend completa 100% verde.

| Paquete | Tests nuevos | Resultado |
|---|---|---|
| `repository` (DB real via testcontainers) | 7 | ✅ 7 PASS |
| `services` (mocks manuales) | 23 | ✅ 23 PASS |
| `handlers` (httptest + testify mock) | 17 | ✅ 17 PASS |

Suite completa: 12 paquetes `ok`, **0 FAILs** (`go test ./...`).

**Web**: ✅ `openapi:types` regeneró 35 refs; `tsc --noEmit` limpio.

**Coverage**: ➖ No configurado en `openspec/config.yaml`.

---

## Bug cazado durante verify (corregido)

**`TestPublicRequestRepoExpireStale` fallaba**: el query `ExpireStale` usaba `($2 || ' days')::interval` con `$2` como `int`, que pgx no puede encodear a text. **Fix**: `$2 * INTERVAL '1 day'` (multiplicación int × interval, soportada nativamente). Test ahora pasa.

Esto validó el valor del verify real: el bug no se detectó en fases previas porque localmente no había DB (los tests se skipeaban). El verify con testcontainers lo expuso.

---

## Spec Compliance Matrix

Mapeo de los 17 escenarios del spec (`specs/public-request/spec.md`) a tests reales que pasan:

| Requisito | Escenario | Test | Resultado |
|---|---|---|---|
| Creación | solicitud válida | `repo > TestPublicRequestRepoCreateAndGet` + `svc > HappyPath` + `handler > HappyPath` | ✅ COMPLIANT |
| Creación | perfil deshabilitado (404) | `svc > ProfileDisabled` + `handler > ProfileDisabled_MapsTo404` | ✅ COMPLIANT |
| Creación | servicios inválidos (400) | `svc > InvalidServiceID` + `handler > InvalidServices_MapsTo400` + `handler > InvalidServiceID_Returns400` | ✅ COMPLIANT |
| Máquina estados | transición válida (responder) | `svc > Respond_FromPending` | ✅ COMPLIANT |
| Máquina estados | transición inválida (409) | `svc > Respond_FromDeclined` + `svc > CanTransition_Table` (8 casos) + `handler > InvalidTransition_MapsTo409` | ✅ COMPLIANT |
| Inbox | paginación sin solapamiento | `repo > ListPaginationAndFilters (offset)` + `handler > Paginated` | ✅ COMPLIANT |
| Respuesta | con presupuesto | `svc > Respond_FromPending` + `repo > CreateAndList` + `handler > RespondRequest` | ✅ COMPLIANT |
| Declinar / pedir info | decline + request-info | `svc > Decline_FromPending` + `svc > RequestInfo_FromPending` | ✅ COMPLIANT |
| Conversión a evento | convertir (crear Event quoted) | `svc > ConvertToEvent` (tx real via mocks) + `handler > ConvertToEvent` | ⚠️ PARTIAL — tx real cubierta por `event_form_handler` integration; mi service usa mocks. Conversión end-to-end full-router pendiente. |
| Conversión a evento | doble conversión (idempotente 409) | `svc > AlreadyConverted` + `handler > AlreadyConverted_MapsTo409WithEventID` | ✅ COMPLIANT |
| Acción cliente | aceptar via token | `svc > ClientAction_Accept` + `handler > ClientAction_HappyPath` | ✅ COMPLIANT |
| Acción cliente | token equivocado (404) | `svc > WrongToken` + `handler > WrongToken_MapsTo404` | ✅ COMPLIANT |
| Acción cliente | token ausente (401) | `handler > MissingToken_Returns401` | ✅ COMPLIANT |
| Auto-expiración | 14 días sin acción | `repo > ExpireStale` (backdated 20 días → expired) + `svc > ExpireStale_Delegates` | ✅ COMPLIANT |
| Anti-spam | rate-limit (middleware) | Cubierto por router wiring (`mw.RateLimit(5, 1*time.Minute)`) | ⚠️ PARTIAL — rate-limit real no testeado en unit (es middleware existente probado). |
| Anti-spam | cap pendientes (429) | `svc > PendingCapExceeded` + `repo > CountPendingAndCap` + `handler > PendingCap_MapsTo429` | ✅ COMPLIANT |
| Marcar leído | badge unread | `repo > StatusTransitionAndMarkRead` + `svc > MarkRead` + `handler > CountUnread` | ✅ COMPLIANT |

**Compliance summary**: **15/17 COMPLIANT, 2 PARTIAL** (sin CRITICAL/UNTESTED).

---

## Coherence (Design)

| Decisión | Seguida? | Notas |
|---|---|---|
| D1 — tablas separadas, no ALTER `public_leads` | ✅ | `public_requests` + `public_responses` nuevas; `/leads` intacto. |
| D2 — `services[]` como JSONB snapshot | ✅ | `PublicRequestServiceSnapshot` en modelo + repo scan. |
| D3 — `status` CHECK + transiciones en Service | ✅ | CHECK en migración 073; `canTransition` en service. |
| D4 — `client_token` para visitante | ✅ | `GetByIDAndToken` + header `X-Request-Token`. |
| D5 — conversión reutiliza EventFormLink flow | ✅ | `CreateClientTx`/`CreateEventTx`/etc.; idempotente. Dedup email postergado (documentado). |
| D6 — expiración job diario `updated_at` | ⚠️ Deviated | Usé `last_status_change` (más preciso que `updated_at`) — mejora válida, documentada en migración. |
| D7 — anti-spam 2 capas | ✅ | RateLimit IP + cap 100 repo. |

---

## Issues Found

**CRITICAL**: None.

**WARNING**:
- Conversión a evento full-router end-to-end (crear→responder→aceptar→convertir via HTTP) no tiene test de integración dedicado; la lógica de tx está cubierta por `event_form_handler` integration tests preexistentes y por mis tests de service con mocks.
- Rate-limit real del middleware no testeado en unit (es middleware existente ya probado).

**SUGGESTION**:
- Añadir un test de integración full-router del flujo completo cuando se implemente el consumer web (#1118) — ahí se valida end-to-end con auth real.

---

## Verdict

# ✅ PASS WITH WARNINGS

Implementación completa, las 6 fases entregadas, 47 tests nuevos pasan, suite backend 100% verde, OpenAPI sincronizado, web types regenerados. 1 bug cazado y corregido durante verify. Las 2 WARNINGs son coberturas que viven naturalmente en los issues consumer (#1117/#1118) o en middleware preexistente, no blockers para este backend-only PR.
