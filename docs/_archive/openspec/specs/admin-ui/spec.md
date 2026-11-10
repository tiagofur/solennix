# Admin UI Specification

## Purpose
Administrar los usuarios del sistema, sus roles, planes, moderaciones y correcciones manuales desde un panel centralizado.

## Requirements

### Requirement: Menú Contextual de Acciones (Dropdown)
La UI MUST agrupar las acciones de cada usuario de la tabla en un único botón de menú `...` (dropdown/popover) para mantener la vista despejada y permitir añadir nuevas acciones de forma estructurada.

#### Scenario: Visualización para usuario básico no verificado
- GIVEN una fila de usuario con plan `basic`, rol `user`, e `email_verified_at` vacío.
- WHEN el administrador hace clic en el botón `...` de esa fila.
- THEN el menú MUST mostrar las opciones: "Verificar", "Regalar Pro" y "Bloquear".
- AND la opción "Downgrade" MUST NOT estar visible.

#### Scenario: Visualización para usuario Pro regalado
- GIVEN una fila de usuario con plan `pro`, rol `user`, e `is_gifted` (plan temporal sin suscripción activa).
- WHEN el administrador hace clic en el botón `...` de esa fila.
- THEN el menú MUST mostrar las opciones: "Editar Regalo", "Downgrade" y "Bloquear".

#### Scenario: Visualización para usuario con suscripción pagada activa
- GIVEN una fila de usuario con `has_paid_subscription` en `true`.
- WHEN el administrador hace clic en el botón `...` de esa fila.
- THEN las opciones "Regalar Pro", "Editar Regalo" y "Downgrade" MUST NOT estar visibles.
- AND se MUST mostrar una etiqueta informativa indicando "Suscripción Activa".

#### Scenario: Visualización para usuario bloqueado
- GIVEN una fila de usuario con `account_status` en `blocked`.
- WHEN el administrador hace clic en el botón `...` de esa fila.
- THEN las únicas opciones disponibles MUST ser "Eliminar Permanente" y "Desbloquear".
- AND "Eliminar Permanente" MUST estar activa solo si ya transcurrió la fecha de retención (180 días).


### Requirement: Bloquear Usuario con Motivo
La UI MUST permitir al administrador bloquear la cuenta de un usuario activo (rol `user`) ingresando un motivo obligatorio, para suspender temporalmente su cuenta e iniciar el período de retención de 180 días antes de su baja definitiva.

#### Scenario: Visualización de la opción de bloqueo
- GIVEN una fila de usuario activo con rol `user` y estado `active`.
- WHEN el administrador hace clic en el menú `...`.
- THEN el menú MUST mostrar la opción "Bloquear".

#### Scenario: Bloqueo exitoso con motivo válido
- GIVEN el modal de confirmación de bloqueo abierto para un usuario activo.
- WHEN el administrador escribe un motivo válido (no vacío) y hace clic en "Confirmar".
- THEN la UI MUST enviar la petición de bloqueo al backend.
- AND al completarse con éxito, se MUST cerrar el modal, mostrar un toast de éxito, y actualizar el estado del usuario en la tabla a "Bloqueado (Baja Pendiente)" con su fecha de elegibilidad para eliminación.

#### Scenario: Validación de motivo requerido
- GIVEN el modal de confirmación de bloqueo abierto.
- WHEN el administrador hace clic en "Confirmar" con el campo del motivo vacío.
- THEN la UI MUST mostrar un mensaje de error indicando que el motivo es obligatorio.
- AND la petición al backend MUST NOT realizarse.
