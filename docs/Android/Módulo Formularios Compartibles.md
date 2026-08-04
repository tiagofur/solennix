# Módulo Links de Solicitud (ex Formularios Compartibles)

#android #solicitudes #módulo

> [!important] Unificado (2026-08)
> Los **enlaces de formulario** viven dentro de **Solicitudes** (tabs Inbox | Links).
> Se eliminó la pantalla de settings `EventFormLinks`. API: `organizers/me/request-links`.

---

## Superficie organizador

| Pieza | Ubicación |
|-------|-----------|
| Inbox + Links | `feature/requests` — `RequestsInboxScreen`, `RequestLinksPanel` |
| ViewModel links | `RequestLinksViewModel` |
| Modelo | `core/model/PublicRequestLink.kt` |
| Endpoints | `Endpoints.PUBLIC_REQUEST_LINKS` |

Visitante: **solo web**. Push channel `solennix_solicitudes` / `public_request` deeplink sin cambios.

---

## Ver también

- Design: `openspec/changes/unify-solicitudes-forms/design.md`
- Backend: [[../Backend/Módulo Formularios Compartibles]]
