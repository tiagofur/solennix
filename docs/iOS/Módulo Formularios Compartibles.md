# Módulo Links de Solicitud (ex Formularios Compartibles)

#ios #solicitudes #módulo

> [!important] Unificado (2026-08)
> Los **enlaces de formulario** viven dentro de **Solicitudes** (tabs Bandeja | Links).
> Ya no hay entrada de menú “Formularios”. API: `/organizers/me/request-links`.

---

## Superficie organizador

| Pieza | Ubicación |
|-------|-----------|
| Inbox + Links | `SolennixFeatures/Requests/` — `RequestsInboxView`, `RequestLinksView` |
| ViewModel links | `RequestLinksViewModel` |
| Modelo | `SolennixCore/Models/PublicRequestLink.swift` |
| Endpoints | `Endpoint.publicRequestLinks` |

Visitante: **solo web** (`/s/:token`). No hay form nativo de visitante.

Push: `type=public_request` → `solennix://requests/{id}` (sin cambios).

---

## Ver también

- Design: `openspec/changes/unify-solicitudes-forms/design.md`
- Backend: [[../Backend/Módulo Formularios Compartibles]]
