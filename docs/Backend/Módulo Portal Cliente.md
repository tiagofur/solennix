---
tags:
  - backend
  - modulo
  - portal-cliente
  - public-link
related:
  - "[[Backend MOC]]"
  - "[[Módulo Eventos]]"
  - "[[Módulo Pagos]]"
  - "[[Seguridad]]"
---

# Módulo Portal Cliente

> [!abstract] Resumen
> Este módulo genera y sirve un enlace público por evento para que el cliente final vea un portal de solo lectura con branding del organizador, resumen del evento y estado agregado de pagos. No expone notas internas ni el detalle línea por línea de los pagos.

**Archivos principales**

- `internal/handlers/event_public_link_handler.go`
- `internal/repository/event_public_link_repo.go`
- `internal/database/migrations/041_add_event_public_links.up.sql`

---

## Endpoints

### Gestión autenticada por organizador

| Método | Ruta | Handler | Descripción |
| --- | --- | --- | --- |
| `POST` | `/api/events/{id}/public-link` | `CreateOrRotate` | Crea o rota el token activo del evento |
| `GET` | `/api/events/{id}/public-link` | `GetActive` | Lee el link activo actual |
| `DELETE` | `/api/events/{id}/public-link` | `Revoke` | Revoca el link activo |

### Lectura pública

| Método | Ruta | Auth | Rate limit | Handler |
| --- | --- | --- | --- | --- |
| `GET` | `/api/public/events/{token}` | No | `10 req/min` | `GetPortalData` |

---

## Qué devuelve el portal

`PublicEventView` agrupa cuatro bloques:

- `event`: tipo de servicio, fecha, horario, ubicación, ciudad, cantidad de invitados, estado
- `organizer`: `business_name`, `logo_url`, `brand_color`
- `client`: nombre del cliente
- `payment`: `total`, `paid`, `remaining`, `currency`

### Decisiones deliberadas

- No se exponen notas internas.
- No se expone el detalle individual de pagos.
- El payload es de lectura, mínimo y seguro por defecto.

---

## Reglas de negocio

### Rotación segura

- Un evento puede tener histórico de tokens.
- Solo un token `active` puede existir a la vez.
- `CreateOrRotate` invalida el link ya compartido y emite uno nuevo.

### TTL opcional

- `ttl_days` es opcional.
- Si se envía, debe estar entre **1 y 730** días.
- Si no se envía, el link queda sin expiración explícita.

### Estados públicos

| Caso | Status |
| --- | --- |
| Token inexistente | `404` |
| Token revocado | `410` |
| Token expirado | `410` |
| Evento borrado con link todavía activo | `410` |

---

## Estado auditado

> [!success] Implementado
> El router y el handler ya soportan CRUD autenticado + lectura pública con branding y resumen de pagos.

> [!warning] Gaps confirmados
>
> - `backend/docs/openapi.yaml` no incluye todavía las rutas del portal.
> - No existe un archivo de tests dedicado para `event_public_link_handler.go`.
