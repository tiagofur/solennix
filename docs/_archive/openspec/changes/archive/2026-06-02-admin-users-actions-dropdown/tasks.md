# Tasks: Menú Contextual de Acciones (Dropdown) en Lista de Usuarios

## Phase 1: Core Implementation

- [x] 1.1 Importar `RowActionMenu` y los iconos necesarios (`CheckCircle`, `Gift`, `RefreshCw`, `X`, `MoreVertical`) en [AdminUsers.tsx](file:///Users/tiagofur/dev/solennix/web/src/pages/Admin/AdminUsers.tsx).
- [x] 1.2 Definir la función helper `buildUserActions(user)` que retorne el array de acciones condicionales según las especificaciones.
- [x] 1.3 Reemplazar los botones de acción inline dentro del cuerpo de la tabla por `<RowActionMenu items={buildUserActions(user)} />`.

## Phase 2: Testing & Verification

- [x] 2.1 Actualizar los unit tests en [AdminUsers.test.tsx](file:///Users/tiagofur/dev/solennix/web/src/pages/Admin/AdminUsers.test.tsx) para buscar el menú `...` y hacer clic en él antes de interactuar con los diálogos de acción.
- [x] 2.2 Ejecutar las pruebas unitarias del frontend con `npm run test:run` en la carpeta `web` y asegurar que pasen en verde.
- [x] 2.3 Ejecutar linting del frontend con `npm run lint` en la carpeta `web` para verificar consistencia.

## Phase 3: Cleanup & Documentation

- [x] 3.1 Remover código muerto, funciones o variables de acción inline en `AdminUsers.tsx` que ya no se utilicen.
- [x] 3.2 Actualizar el historial de progreso en [current.md](file:///Users/tiagofur/dev/solennix/progress/current.md) and [history.md](file:///Users/tiagofur/dev/solennix/progress/history.md).
