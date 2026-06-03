# Tasks: Acción de Bloquear Usuario con Motivo desde el Panel de Admin

## Phase 1: Service & Query Integration

- [ ] 1.1 Agregar la función `blockUser(id, reason)` en [adminService.ts](file:///Users/tiagofur/dev/solennix/web/src/services/adminService.ts).
- [ ] 1.2 Agregar el hook mutation `useBlockUser` en [useAdminQueries.ts](file:///Users/tiagofur/dev/solennix/web/src/hooks/queries/useAdminQueries.ts) e importarlo.

## Phase 2: UI Implementation

- [ ] 2.1 Agregar los hooks de estado (`blockTarget`, `blockReason`, `blockReasonError`) y llamar a `useBlockUser` en [AdminUsers.tsx](file:///Users/tiagofur/dev/solennix/web/src/pages/Admin/AdminUsers.tsx).
- [ ] 2.2 Agregar la opción "Bloquear" al listado de acciones en `buildUserActions` de `AdminUsers.tsx`.
- [ ] 2.3 Renderizar el modal interactivo de bloqueo en `AdminUsers.tsx` y conectar con `handleBlockConfirm`.

## Phase 3: Testing & Verification

- [ ] 3.1 Añadir unit tests en [AdminUsers.test.tsx](file:///Users/tiagofur/dev/solennix/web/src/pages/Admin/AdminUsers.test.tsx) cubriendo el flujo de bloqueo (error de motivo vacío, cancelación y éxito).
- [ ] 3.2 Ejecutar los tests de vitest con `npm run test:run` y verificar que todo pase.
- [ ] 3.3 Validar con `npm run lint` para descartar problemas de estilo.
