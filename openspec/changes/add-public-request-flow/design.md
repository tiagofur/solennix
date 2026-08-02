# Design: Add Public Request Flow

> Refs: proposal.md · specs/public-request/spec.md · Issue [#1115](https://github.com/tiagofur/solennix/issues/1115) · PRD `docs/PRD/15_MARKETPLACE_V2.md` §3

## Architecture

Sigue el patrón canónico del repo: **Handler → Service → Repository**, sobre Go (Chi) + PostgreSQL (pgx/v5). Capa nueva, aditiva, sin tocar `public_leads` existente.

```
POST /api/public/organizers/{slug}/requests ─┐
GET  /api/organizers/me/requests            ─┤
POST /api/organizers/me/requests/{id}/*     ─┼─→ PublicRequestHandler
POST /api/public/requests/{id}/action        ─┘        ↓
                                                  PublicRequestService
                                                  (estados, conversión, expiración)
                                                        ↓
                                                  PublicRequestRepository (pgx)
                                                        ↓
                                                  public_requests / public_responses
```

## Decisions

### D1 — Tablas separadas, no ALTER a `public_leads`

**Decisión:** crear `public_requests` + `public_responses` nuevas. No migrar ni ALTER `public_leads`.

**Razón:** `public_leads` se consume hoy desde `/leads` (rate-limit 5/min). Mezclar schemas rompería retrocompatibilidad y complicaría rollback. El endpoint `/leads` queda **soft-deprecated** (sigue funcionando; web migrará a `/requests` en #1118).

**Alternativa descartada:** ALTER `public_leads` añadiendo columnas — rompe reads existentes, ambigüedad `lead vs request`.

### D2 — `services[]` como JSONB, no tabla join

**Decisión:** `public_requests.services JSONB` (array de `{product_id, name, price_snapshot}`).

**Razón:** Las servicios referenciadas son **snapshots** del catálogo público en el momento de la solicitud (el organizador puede cambiar precios después). Una FK a `products` crearía dependencia frágil (borrar producto rompería el histórico). JSONB preserva el snapshot + simplifica queries.

### D3 — `status` con CHECK + transiciones en Service (no en DB)

**Decisión:** `status VARCHAR CHECK (...)` enum en DB; transiciones válidas validadas en `PublicRequestService`, no por triggers DB.

**Razón:** Las transiciones de estado son lógica de negocio (varían por actor: organizador vs visitante), mala idea en triggers SQL. El CHECK protege contra valores inválidos; el Service protege contra transiciones inválidas (409 conflict).

### D4 — Token público para acción del cliente

**Decisión:** cada `PublicRequest` tiene `client_token` (uuid) emitido al crear. El visitante actúa sobre su request vía `POST /api/public/requests/{id}/action` con header `X-Request-Token: {client_token}`.

**Razón:** el visitante no tiene cuenta (NG1). El token (enviado por email al crear, futuro #1118) prueba posesión sin login. Lifetime = vida de la request (caduca al `booked/expired`).

**Alternativa descartada:** magic link firmado — más complejo, sin beneficio real para v1.

### D5 — Conversión a evento reutiliza `EventFormLink` flow

**Decisión:** `convert-to-event` crea `Client` (desde `contact_email`/`name`) + `Event(status=quoted, total=0)` replicando `event_form_handler.go:431`. Idempotente: si `event_id` ya set, devuelve 409 + el event_id.

**Razón:** reutiliza código probado, mantiene consistencia con el modelo mental del organizador ("una solicitud aceptada = un evento cotizado"). No crea entidad `Quote` nueva.

### D6 — Expiración: job diario con `updated_at < NOW() - 14 days`

**Decisión:** job existente del repo (ver `services/notification_service.go` scheduler pattern) marca `expired` donde `status NOT IN (expired, booked, declined_*)` AND `updated_at < NOW() - INTERVAL '14 days'`.

**Razón:** `updated_at` ya captura última acción (crear, responder, pedir info). Simple, sin tabla de jobs nueva.

### D7 — Anti-spam: rate-limit IP (middleware) + cap por organizador (repo)

**Decisión:**
- Rate-limit IP: reusar `mw.RateLimit(N, window)` del router (hoy 5/min en `/leads`). Aplicar mismo o similar a `/requests`.
- Cap por organizador: `SELECT count(*) WHERE organizer_user_id=$1 AND status='pending'`; si ≥ 100, rechazar 429 "bandeja llena".

**Razón:** dos capas (IP evita flood externo; cap evita que un organizador popular se sature). Sin verificación de cuenta (NG1), el captcha (#1118) es la siguiente línea.

## Data Model

```sql
-- Migración 073
CREATE TABLE public_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_token UUID NOT NULL DEFAULT gen_random_uuid(),
    contact_email VARCHAR(320) NOT NULL,
    contact_name VARCHAR(160),
    event_type VARCHAR(80),
    event_date DATE,
    location TEXT,
    guest_count INT CHECK (guest_count >= 0),
    budget NUMERIC(12, 2) CHECK (budget >= 0),
    currency VARCHAR(3) DEFAULT 'MXN',
    services JSONB NOT NULL DEFAULT '[]'::jsonb,
    message TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','info_requested','responded',
                         'accepted_by_client','declined_provider',
                         'declined_client','booked','expired')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    event_id UUID,  -- set al convertir; no FK dura (event puede borrarse)
    declined_reason TEXT,
    last_status_change TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_public_requests_organizer
    ON public_requests (organizer_user_id, status, created_at DESC);
CREATE INDEX idx_public_requests_expiry
    ON public_requests (last_status_change) WHERE status IN ('pending','info_requested','responded');
CREATE UNIQUE INDEX idx_public_requests_token ON public_requests (client_token);

CREATE TABLE public_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public_requests(id) ON DELETE CASCADE,
    organizer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quote_amount NUMERIC(12, 2) NOT NULL CHECK (quote_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'MXN',
    inclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    valid_until DATE,
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_public_responses_request ON public_responses (request_id);
```

## Components

| Componente | Archivo | Responsabilidad |
|---|---|---|
| `models.PublicRequest`, `models.PublicResponse`, `RequestStatus` | `backend/internal/models/models.go` | Tipos + enum |
| `repository.PublicRequestRepo` | `backend/internal/repository/public_request_repo.go` | CRUD + paginación cursor + filtros + cap check |
| `services.PublicRequestService` | `backend/internal/services/public_request_service.go` | Transiciones de estado, conversión a evento, reglas |
| `handlers.PublicRequestHandler` | `backend/internal/handlers/public_request_handler.go` | HTTP público + auth proveedor |
| Router wiring | `backend/internal/router/router.go` | Rutas nuevas + rate-limit |
| Job expiración | `backend/internal/services/notification_service.go` (scheduler) o nuevo `expiry_job.go` | Marca `expired` diario |

## Cross-platform impact

- **Backend**: todo el cambio (este change).
- **Web**: consume los endpoints nuevos en #1118 (form), #1117 (directorio — no), inbox proveedor (#1115 mismo sprint, parte web implícita fuera de este change).
- **iOS/Android**: consumen inbox en S14 (#1121-#1126). Fuera de scope de este change.
- **OpenAPI** (`backend/openapi.yaml`): sincronizar nuevos schemas/paths.

## Risks (recíproco del proposal)

| Riesgo | Mitigación |
|---|---|
| Conversión a evento duplica Client si email ya existe | `convert-to-event` busca Client por `(organizer_user_id, email)` primero; crea solo si no existe |
| Job de expiración pisa acciones en vuelo | Job solo marca estados terminales-posibles; `updated_at` siempre se bump en cada transición, evitando race |
| `client_token` filtrado en logs | Logging middleware filtra `X-Request-Token`; nunca en body responses públicas |

## Testing Strategy

- **Unit (repo):** crear, paginar, filtros, cap, transiciones válidas/inválidas. Mock pgx.
- **Unit (service):** máquina de estados, conversión a evento (mock repo + client repo), idempotencia.
- **Integration (handler):** round-trip completo crear→responder→aceptar→convertir; rate-limit 429; cap 429; 404 perfil deshabilitado.
- **Job:** expiración tras 14 días (clock mockeado).
- Cobertura mínima target: 85% del código nuevo.

## Out of Scope (recíproco)

- UI web/móvil (otros issues).
- Notificaciones push/email al organizador (best-effort en este change; push real en #1124 S14).
- Geo-struct en location (#1127).
- Trust score / verificación cliente (descartado v2.0, NG1).
