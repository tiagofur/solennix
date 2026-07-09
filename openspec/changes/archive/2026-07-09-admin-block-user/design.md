# Design: Acción de Bloquear Usuario con Motivo desde el Panel de Admin

## Technical Approach
Integrar el endpoint de bloqueo `PUT /api/admin/users/{id}/block` en los servicios y mutaciones del frontend React, y crear un modal de confirmación con input de texto obligatorio en la página de administración de usuarios.

## Architecture Decisions

| Option Considered | Tradeoff | Decision |
|---|---|---|
| Usar el `ConfirmDialog` genérico para el bloqueo | El componente `ConfirmDialog` no admite entradas de texto (motivo requerido por el backend). | **Rechazado**. |
| Diseñar un modal interactivo a medida en `AdminUsers.tsx` | Permite un campo de texto `<textarea>` con validación de error en tiempo real específica del caso. | **Elegido**. |

## Data Flow
```
[User Row > dropdown] ──(Click 'Bloquear')──> [Open Modal & State]
                                                   │
                                       (Confirm with reason string)
                                                   │
                                      [useBlockUser.mutate(id, reason)]
                                                   │
                                     [PUT /admin/users/{id}/block]
                                                   │
                                      (invalidate admin users query)
                                                   │
                                        (Refreshes Table View)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| [adminService.ts](file:///Users/tiagofur/dev/solennix/web/src/services/adminService.ts) | Modify | Añadir `blockUser(id, reason)` al servicio. |
| [useAdminQueries.ts](file:///Users/tiagofur/dev/solennix/web/src/hooks/queries/useAdminQueries.ts) | Modify | Añadir mutation hook `useBlockUser()`. |
| [AdminUsers.tsx](file:///Users/tiagofur/dev/solennix/web/src/pages/Admin/AdminUsers.tsx) | Modify | Agregar el hook `useBlockUser`, registrar estado de modal/input, renderizar el modal de bloqueo y mapear la acción en `RowActionMenu`. |

## Interfaces / Contracts
El body enviado al backend cumple con el contrato OpenAPI:

```typescript
export interface BlockUserRequest {
  reason: string;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Bloqueo con éxito y validación de motivo requerido | Añadir tests en `AdminUsers.test.tsx` simulando click en "Bloquear", validando error de campo vacío y simulando éxito con mock de `adminService.blockUser`. |

## Migration / Rollout
No migration required.
