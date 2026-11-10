# Delta for admin-ui

## ADDED Requirements

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
