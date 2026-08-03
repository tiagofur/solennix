# Public Request Form Specification

## Purpose

El modal de cotización en `/u/:slug` evoluciona de enviar un lead libre (`/leads`) a enviar una **solicitud estructurada** (`/requests`, #1115). El visitante (sin cuenta, NG1) completa sus datos + detalles del evento + servicios deseados, y el organizador recibe una solicitud trazable con conversión a evento. Es el consumidor web del flujo de inbound de #1115.

## Requirements

### Requirement: Service de solicitud estructurada

El sistema MUST proveer `publicRequestService.submit(slug, payload)` que haga POST a `/api/public/organizers/{slug}/requests` sin auth, con el payload `CreatePublicRequestRequest` (contact_email, contact_name, event_type, event_date, location, guest_count, budget, currency, service_ids[], message).

#### Scenario: Submit exitoso

- GIVEN un visitante con datos válidos
- WHEN se llama submit(slug, payload)
- THEN se hace POST y se devuelve la PublicRequest creada (201)

#### Scenario: Email obligatorio

- GIVEN un payload sin contact_email
- WHEN se valida antes de submit
- THEN se muestra error client-side (no se envía)

### Requirement: Modal con campos estructurados

El modal MUST pedir: contact_email (obligatorio), contact_name, event_type (select), event_date (date, futura), location (texto), guest_count (number ≥ 0), budget (number ≥ 0), services[] (multi-select de los servicios públicos del organizador), message (textarea).

#### Scenario: Campos nuevos presentes

- GIVEN el modal abierto
- WHEN se renderiza
- THEN muestra inputs para email, ubicación, presupuesto, servicios (además de los existentes)

#### Scenario: Multi-select de servicios

- GIVEN el organizador tiene 3 servicios públicos
- WHEN el visitante abre el multi-select
- THEN puede elegir 0, 1 o varios

#### Scenario: Sin servicios públicos

- GIVEN el organizador no tiene servicios visibles
- WHEN el modal renderiza
- THEN el campo servicios se oculta (graceful)

### Requirement: Validación client-side

El sistema MUST validar antes de enviar: contact_email con formato válido, event_date no pasada, budget ≥ 0, guest_count ≥ 0. Mensajes de error localizados.

#### Scenario: Email inválido

- GIVEN el visitante entra "no-email"
- WHEN intenta submit
- THEN se muestra error "email inválido" y no se envía

#### Scenario: Fecha pasada

- GIVEN event_date = ayer
- WHEN intenta submit
- THEN se muestra error "la fecha debe ser futura"

### Requirement: Disclaimer legal visible

El sistema MUST mostrar un disclaimer visible en el modal: "El acuerdo es directo con el proveedor. Solennix solo facilita el contacto." (cláusula ToS #1112).

#### Scenario: Disclaimer presente

- GIVEN el modal abierto
- WHEN se renderiza
- THEN el disclaimer está visible (no colapsado)

### Requirement: Estados del form

El sistema MUST manejar: submitting (botón deshabilitado + spinner), error (mensaje localizado según status), success (confirmación + cierre). El error 429 inbox_full muestra mensaje específico.

#### Scenario: Submitting

- GIVEN un submit en vuelo
- WHEN se renderiza el botón
- THEN está deshabilitado con spinner

#### Scenario: Error 429 inbox_full

- GIVEN el backend devuelve 429 con error "inbox_full"
- WHEN se procesa la respuesta
- THEN se muestra "La bandeja de este organizador está llena. Probá más tarde."

#### Scenario: Success

- GIVEN el submit devuelve 201
- WHEN se procesa
- THEN se muestra vista de confirmación y se puede cerrar el modal

### Requirement: i18n ES/EN

El sistema MUST tener todos los strings (labels, placeholders, errores, disclaimer, success) en ES y EN.

#### Scenario: Strings EN

- GIVEN el idioma EN
- WHEN el modal renderiza
- THEN todos los textos están en inglés
