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
