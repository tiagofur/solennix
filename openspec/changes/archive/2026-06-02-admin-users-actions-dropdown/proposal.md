# Proposal: Menú Contextual de Acciones (Dropdown) en Lista de Usuarios

## Intent
Limpiar la tabla de usuarios en el Panel de Administración reemplazando los botones de acción inline por un único menú contextual (`...`) para mejorar la UI/UX y permitir agregar nuevas acciones (como Bloquear) de manera escalable.

## Scope

### In Scope
- Creación de un componente dropdown/popover en React para el menú `...`.
- Reemplazo de los botones inline ("Verificar", "Regalar", "Editar regalo", "Downgrade") en `AdminUsers.tsx`.
- Integración de los diálogos y estados existentes con las opciones del menú flotante.

### Out of Scope
- Modificación del backend o de las llamadas API (los endpoints ya existen).
- Implementación de la acción de bloquear (se abordará en un issue/PR separado).

## Approach
Implementar un menú contextual flotante en la columna de acciones de la tabla en `AdminUsers.tsx`. Al hacer clic en `...`, se desplegará el popover mostrando dinámicamente las acciones disponibles según el estado del usuario (ej: rol, tipo de suscripción).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| [AdminUsers.tsx](file:///Users/tiagofur/dev/solennix/web/src/pages/Admin/AdminUsers.tsx) | Modified | Reemplazar botones inline por el menú contextual flotante |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Recorte de layout o desbordamiento del dropdown dentro de la tabla | Med | Usar posicionamiento absoluto con `absolute` y clases z-index o un portal React si es necesario |

## Rollback Plan
Revertir el archivo `AdminUsers.tsx` a su commit estable anterior vía Git: `git checkout HEAD -- web/src/pages/Admin/AdminUsers.tsx`.

## Dependencies
Ninguna.

## Success Criteria
- [ ] La columna 'Acciones' en la tabla muestra únicamente el botón `...`.
- [ ] Al hacer clic se despliega el menú flotante con las acciones correctas.
- [ ] Los diálogos de regalo, downgrade y eliminación se activan sin problemas desde el menú.
- [ ] No hay errores de lint ni tests fallidos.
