# Public Request Specification

## Purpose

Una **PublicRequest** es una solicitud de cotización estructurada enviada por un visitante anónimo (con email de contacto) al perfil público de un organizador. Una **PublicResponse** es la cotización que el organizador envía en respuesta. Juntas permiten el flujo de inbound del proveedor sin que Solennix intermedie (NG1 ratificado: el visitante no es usuario Solennix; el acuerdo económico queda fuera de la plataforma).

## Requirements

### Requirement: Creación de solicitud estructurada

El sistema MUST exponer `POST /api/public/organizers/{slug}/requests` que acepta `contact_email`, `event_type`, `event_date`, `location` (texto), `guest_count`, `budget`, `currency`, `services[]` (IDs de productos públicos del organizador), y `message` (opcional). El sistema MUST validar que el organizador tenga perfil público habilitado (`is_enabled=true`).

#### Scenario: Visitante envía solicitud válida

- GIVEN un organizador con perfil público habilitado en `/u/:slug`
- WHEN un visitante envía POST con `contact_email` válido + `event_type` + `event_date` futura
- THEN se crea `PublicRequest` con `status=pending`
- AND se notifica al organizador (best-effort)

#### Scenario: Solicitud a perfil deshabilitado

- GIVEN un organizador con `is_enabled=false` o sin perfil público
- WHEN se recibe POST a su slug
- THEN se devuelve `404` sin revelar si el organizador existe

#### Scenario: Servicios inexistentes o ajenos

- GIVEN `services[]` contiene un ID que no pertenece al organizador o no tiene `show_on_public_profile=true`
- WHEN se valida la solicitud
- THEN se devuelve `400` con mensaje "servicios inválidos"

### Requirement: Máquina de estados

El sistema MUST gestionar `status` con transiciones válidas: `pending → info_requested | responded | declined_provider | expired`; `info_requested → pending`; `responded → accepted_by_client | declined_client | booked | expired`; cualquier estado → `expired` por inactividad.

#### Scenario: Transición válida (responder)

- GIVEN una request `pending`
- WHEN el organizador envía una `PublicResponse`
- THEN `status` pasa a `responded`

#### Scenario: Transición inválida rechazada

- GIVEN una request `declined_provider`
- WHEN el organizador intenta enviar respuesta
- THEN se devuelve `409 conflict` y el estado no cambia

### Requirement: Inbox del organizador

El sistema MUST exponer `GET /api/organizers/me/requests` (auth) con paginación cursor-based y filtros por `status` y rango de `event_date`.

#### Scenario: Inbox paginado

- GIVEN un organizador con 50 solicitudes
- WHEN pide `GET /api/organizers/me/requests?limit=20`
- THEN recibe 20 items + `next_cursor`
- AND al pedir `?cursor={next_cursor}` recibe la página siguiente sin solapamiento

### Requirement: Respuesta con cotización

El sistema MUST exponer `POST /api/organizers/me/requests/{id}/responses` (auth) que crea `PublicResponse` con `quote_amount`, `currency`, `inclusions[]`, `valid_until` (default +7d), `message`.

#### Scenario: Respuesta con presupuesto

- GIVEN una request `pending` del organizador autenticado
- WHEN envía `quote_amount=5000` y `currency=MXN`
- THEN se crea la `PublicResponse` y la request pasa a `responded`

### Requirement: Declinar y pedir información

El sistema MUST exponer `POST /api/organizers/me/requests/{id}/decline` y `POST /api/organizers/me/requests/{id}/request-info` (auth, ambos con `message`).

#### Scenario: Declinar

- GIVEN una request `pending`
- WHEN el organizador la declina con motivo
- THEN `status=declined_provider` y se registra el motivo

#### Scenario: Pedir información

- GIVEN una request `pending`
- WHEN el organizador pide info adicional
- THEN `status=info_requested`

### Requirement: Conversión a evento

El sistema MUST exponer `POST /api/organizers/me/requests/{id}/convert-to-event` (auth) que crea un `Event` con `status=quoted` precargado desde la solicitud (reutiliza el flujo `EventFormLink`, NO crea entidad Quote). Idempotente por `request_id`.

#### Scenario: Convertir a evento

- GIVEN una request `accepted_by_client`
- WHEN el organizador la convierte
- THEN se crea `Event(status=quoted)` con cliente creado desde `contact_email`
- AND `status=booked` y se enlaza `event_id` en la request

#### Scenario: Doble conversión

- GIVEN una request ya convertida (`status=booked`, `event_id` set)
- WHEN se intenta convertir nuevamente
- THEN se devuelve `409` y se devuelve el `event_id` existente

### Requirement: Acción del cliente sobre la respuesta

El sistema MUST exponer `POST /api/public/requests/{id}/action` (público, identificado por token de la solicitud) para que el visitante marque `accepted_by_client` o `declined_client` sobre una request `responded`.

#### Scenario: Cliente acepta

- GIVEN una request `responded` con token válido
- WHEN el visitante envía `action=accept`
- THEN `status=accepted_by_client`

### Requirement: Auto-expiración

El sistema MUST ejecutar un job diario que marque `expired` toda request que lleve 14 días sin cambio de estado desde su última actualización.

#### Scenario: Expiración por inactividad

- GIVEN una request `pending` actualizada hace 15 días
- WHEN corre el job
- THEN `status=expired`

### Requirement: Anti-spam

El sistema MUST aplicar rate-limit por IP (≤ N requests/hora) y un cap de solicitudes `pending` por organizador (default 100). El sistema SHOULD requerir captcha en el form web (#1118, fuera de este spec).

#### Scenario: Rate-limit excedido

- GIVEN una IP que envió N solicitudes en la última hora
- WHEN envía otra
- THEN se devuelve `429`

#### Scenario: Cap de pendientes del organizador

- GIVEN un organizador con 100 solicitudes `pending`
- WHEN llega una nueva
- THEN se devuelve `429` con mensaje "bandeja llena"

### Requirement: Marcar como leído

El sistema MUST exponer `POST /api/organizers/me/requests/{id}/read` (auth) que setea `is_read=true` y alimenta el contador de no leídas.

#### Scenario: Marcar leída

- GIVEN una request `is_read=false`
- WHEN el organizador la abre
- THEN `is_read=true` y el badge disminuye
