# Módulo Links de Solicitud (ex Formularios Compartibles)

#web #solicitudes #dominio

> [!important] Unificado (2026-08)
> **Formularios compartibles ya no es un producto aparte.** Quedó absorbido por **Solicitudes**.
> Diseño: `openspec/changes/unify-solicitudes-forms/`.

---

## Qué quedó

| Cara | Ruta | Notas |
|------|------|--------|
| Form visitante (link) | `/s/:token` | Mismo form que el CTA del perfil (`RequestForm`) |
| Legacy form | `/form/:token` | Redirect → `/s/:token` |
| Gestión organizador | `/requests?tab=links` | Tab **Links** del hub Solicitudes |
| Legacy gestión | `/event-forms` | Redirect → `/requests?tab=links` |
| Inbox | `/requests` | Solicitudes + estados + cotización |
| Perfil CTA | `/u/:slug` | Modal → `POST /public/organizers/{slug}/requests` |

---

## API (web)

| Acción | Endpoint |
|--------|----------|
| Listar / crear links | `GET/POST /api/organizers/me/request-links` |
| Revocar | `DELETE /api/organizers/me/request-links/{id}` |
| Cargar form público | `GET /api/public/request-links/{token}` |
| Enviar form link | `POST /api/public/request-links/{token}/requests` |
| Enviar desde perfil | `POST /api/public/organizers/{slug}/requests` |

**Eliminado:** `/api/event-forms*`, `/api/public/event-forms*`, `/api/leads*`.

---

## Código principal

| Pieza | Path |
|-------|------|
| Form compartido | `web/src/components/requests/RequestForm.tsx` |
| Página link | `web/src/pages/PublicRequest/PublicRequestLinkPage.tsx` |
| Hub + Links | `web/src/pages/Requests/RequestsInboxPage.tsx`, `RequestLinksPanel.tsx` |
| Services | `requestLinkService.ts`, `publicRequestService.ts`, `organizerRequestsService.ts` |

`submit_mode` del link: `standard` \| `auto_quote` \| `auto_event` (default **auto_event**).

---

## Ver también

- Inbox / estados: flujo PublicRequest (mismo hub)
- Backend: [[../Backend/Módulo Formularios Compartibles|Links de Solicitud (backend)]]
- Design: `openspec/changes/unify-solicitudes-forms/design.md`
