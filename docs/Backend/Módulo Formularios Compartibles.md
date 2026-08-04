# Módulo Links de Solicitud (ex Formularios Compartibles)

#backend #solicitudes #módulo

> [!important] Unificado (2026-08)
> **EventFormLink** y **PublicLead** se eliminaron. Canónico: **PublicRequest** + **public_request_links**.
> Ver `openspec/changes/unify-solicitudes-forms/`.

---

## Tablas

| Tabla | Rol |
|-------|-----|
| `public_requests` | Solicitud (source: `public_profile` \| `shared_link`) |
| `public_responses` | Cotización del organizador |
| `public_request_links` | Token compartible (`submit_mode`, TTL, max_uses) |

**Dropped:** `event_form_links`, `public_leads` (migración 079).

---

## Endpoints

### Públicos
- `GET /api/public/request-links/{token}`
- `POST /api/public/request-links/{token}/requests`
- `POST /api/public/organizers/{slug}/requests`
- `POST /api/public/requests/{id}/action` (accept/decline + `X-Request-Token`)

### Auth organizador
- `GET/POST /api/organizers/me/request-links`
- `DELETE` / `POST .../revoke` `/api/organizers/me/request-links/{id}`
- Inbox: `/api/organizers/me/requests*`

### Eliminados
- `/api/event-forms*`, `/api/public/event-forms*`
- `/api/leads*`, `POST .../leads`

---

## `submit_mode` (link)

| Mode | Al submit |
|------|-----------|
| `standard` | `pending` → inbox |
| `auto_quote` | `PublicResponse` + `responded` |
| `auto_event` | Client + Event(quoted) + products → `booked` |

Default de links nuevos: **`auto_event`**.

## Catálogo

- Perfil público ON → productos `is_active` + `show_on_public_profile`
- Perfil OFF + link → productos `is_active` del organizador
- Selección de catálogo **siempre opcional**

---

## Código

| Capa | Path |
|------|------|
| Service | `internal/services/public_request_service.go`, `request_link_helpers.go` |
| Handlers | `public_request_handler.go`, `request_link_handler.go` |
| Repos | `public_request_repo.go`, `public_request_link_repo.go` |
| TX helpers (convert) | `repository/tx_helpers.go` |

Jobs: expire requests (14d) + expire request links (hourly).
