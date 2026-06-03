# Proposal: Acción de Bloquear Usuario con Motivo desde el Panel de Admin

## Intent
Exponer en la interfaz de administración (Web) la funcionalidad existente de bloqueo de usuarios en el backend (`PUT /api/admin/users/{id}/block`), lo que permite inhabilitar cuentas de usuario y definir su fecha de elegibilidad para borrado automático tras 180 días.

## Scope

### In Scope
- Añadir la función `blockUser(id, reason)` en `adminService.ts`.
- Añadir el hook `useBlockUser()` en `useAdminQueries.ts`.
- Diseñar e integrar un cuadro de diálogo modal en `AdminUsers.tsx` que requiera ingresar un motivo.
- Mostrar la acción "Bloquear" en el menú contextual `RowActionMenu` para usuarios activos de rol `user`.

### Out of Scope
- Modificación del backend o cambio en los días de retención (los 180 días ya se manejan en Go).
- Vistas de administración en plataformas móviles (no existen).

## Approach
Agregar la llamada API correspondiente e integrar un modal similar a `ConfirmDialog` o un modal personalizado que reciba el motivo. Al confirmar, se dispara la mutación `useBlockUser` que actualiza la tabla de usuarios administradores.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| [adminService.ts](file:///Users/tiagofur/dev/solennix/web/src/services/adminService.ts) | Modified | Añadir endpoint de bloqueo |
| [useAdminQueries.ts](file:///Users/tiagofur/dev/solennix/web/src/hooks/queries/useAdminQueries.ts) | Modified | Añadir mutación useBlockUser |
| [AdminUsers.tsx](file:///Users/tiagofur/dev/solennix/web/src/pages/Admin/AdminUsers.tsx) | Modified | Agregar modal de motivo e integrar opción Bloquear en el menú |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Ingreso de campos vacíos en el motivo | Low | Validar el input del motivo antes de enviar la petición (campo requerido) |

## Rollback Plan
Revertir los archivos modificados vía Git: `git checkout HEAD -- web/src/services/adminService.ts web/src/hooks/queries/useAdminQueries.ts web/src/pages/Admin/AdminUsers.tsx`.

## Dependencies
Ninguna (el backend ya soporta el bloqueo).

## Success Criteria
- [ ] La opción "Bloquear" está visible en el menú `...` para usuarios con cuenta activa y rol `user`.
- [ ] Al hacer clic en "Bloquear", se despliega un modal solicitando el motivo.
- [ ] Al confirmar con un motivo válido, se bloquea al usuario y se actualiza el estado en la lista visual de inmediato.
- [ ] Las llamadas al backend y la actualización de caché funcionan correctamente.
