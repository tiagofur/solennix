---
tags:
  - backend
  - modulo
  - personal
  - staff
related:
  - "[[Backend MOC]]"
  - "[[Módulo Eventos]]"
  - "[[Sistema de Tipos]]"
  - "[[Testing]]"
---

# Módulo Personal

> [!abstract] Resumen
> El módulo de Personal cubre el catálogo de colaboradores (`staff`), su asignación a eventos (`event_staff`), la consulta de disponibilidad y la agrupación en equipos (`staff_teams`). El backend ya soporta las tres capas: **CRM de staff**, **operación por evento** y **equipos reutilizables**.

**Archivos principales**

- `internal/handlers/staff_handler.go`
- `internal/handlers/staff_team_handler.go`
- `internal/repository/staff_repo.go`
- `internal/repository/staff_team_repo.go`
- `internal/database/migrations/042_create_staff_and_event_staff.up.sql`
- `internal/database/migrations/043_add_event_staff_shift_status.up.sql`
- `internal/database/migrations/044_create_staff_teams.up.sql`
- `internal/database/migrations/045_add_product_staff_team.up.sql`

---

## Endpoints

### Staff

| Método | Ruta | Handler | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/staff` | `ListStaff` | Lista el catálogo del organizador |
| `POST` | `/api/staff` | `CreateStaff` | Crea un colaborador |
| `GET` | `/api/staff/{id}` | `GetStaff` | Detalle de colaborador |
| `PUT` | `/api/staff/{id}` | `UpdateStaff` | Edita datos base |
| `DELETE` | `/api/staff/{id}` | `DeleteStaff` | Baja lógica/operativa del registro |
| `GET` | `/api/staff/availability` | `GetStaffAvailability` | Consulta ocupación por fecha o rango |

### Equipos

| Método | Ruta | Handler | Descripción |
| --- | --- | --- | --- |
| `GET` | `/api/staff/teams` | `ListTeams` | Lista equipos con `member_count` |
| `POST` | `/api/staff/teams` | `CreateTeam` | Crea equipo y miembros |
| `GET` | `/api/staff/teams/{id}` | `GetTeam` | Detalle con miembros joined |
| `PUT` | `/api/staff/teams/{id}` | `UpdateTeam` | Reemplazo transaccional de miembros |
| `DELETE` | `/api/staff/teams/{id}` | `DeleteTeam` | Elimina equipo |

### Integración con Eventos

| Método | Ruta | Descripción |
| --- | --- | --- |
| `PUT` | `/api/events/{id}/items` | Persiste `staff[]` junto con productos/extras/equipo/insumos |
| `GET` | `/api/events/{id}/staff` | Lee las asignaciones del evento |

---

## Modelos principales

### `Staff`

- `name`, `role_label`, `phone`, `email`, `notes`
- `notification_email_opt_in`
- `invited_user_id` reservado para fases futuras de acceso del colaborador

### `EventStaff`

- `fee_amount`, `role_override`, `notes`
- `shift_start`, `shift_end`
- `status`: `pending | confirmed | declined | cancelled`
- `notification_sent_at`, `notification_last_result`

### `StaffTeam` y `StaffTeamMember`

- Equipo nombrado reutilizable por organizador
- Miembros ordenados por `position`
- `is_lead` marca liderazgo dentro del equipo
- El equipo **no** persiste fee ni RSVP: esos datos viven en `event_staff`

---

## Comportamiento clave

### Multi-tenant real

- Todas las queries filtran por `user_id`.
- Los miembros de un equipo se validan contra el catálogo del mismo organizador antes de persistir.

### Disponibilidad operativa

- `GET /api/staff/availability` no devuelve “libres”; devuelve asignaciones existentes dentro del rango.
- El cliente infiere disponibilidad por ausencia de resultados.

### Equipos como plantilla, no como snapshot en DB de evento

- El backend expone CRUD de equipos.
- La expansión de un equipo a filas de `event_staff` ocurre del lado cliente consumiendo `GET /api/staff/teams/{id}`.
- Después de expandir, cada asignación de evento mantiene sus propios fee/shift/status.

### Producto con equipo asociado

- Desde migración `045`, `products.staff_team_id` puede apuntar a un equipo.
- `CRUDHandler.SetStaffTeamRepo(...)` valida ownership del equipo antes de persistir el producto.
- La expansión a staff individuales sigue ocurriendo en el cliente al agregar ese producto al evento.

---

## Estado auditado

> [!success] Implementado
> El módulo está operativo en backend: catálogo, disponibilidad, equipos y relación producto↔equipo ya existen y están cableados en el router.

> [!warning] Gaps confirmados
>
> - `backend/docs/openapi.yaml` todavía no documenta `/api/staff/teams`.
> - No existe un archivo de tests dedicado para `staff_team_handler.go`.
