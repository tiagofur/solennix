# Design: Menú Contextual de Acciones (Dropdown) en Lista de Usuarios

## Technical Approach
Reutilizar el componente existente [RowActionMenu.tsx](file:///Users/tiagofur/dev/solennix/web/src/components/RowActionMenu.tsx) en [AdminUsers.tsx](file:///Users/tiagofur/dev/solennix/web/src/pages/Admin/AdminUsers.tsx) para compactar y organizar todas las acciones de la tabla. El componente inyecta un menú flotante en un portal React, evitando problemas de desbordamiento dentro de la tabla (`overflow: hidden`).

## Architecture Decisions

| Option Considered | Tradeoff | Decision |
|---|---|---|
| Crear un nuevo componente contextual local en `AdminUsers.tsx` | Duplicación de lógica de clicks externos y posicionamiento de portales. | **Rechazado**. |
| Reutilizar `RowActionMenu` existente | El componente ya maneja portales, posicionamiento vertical dinámico (arriba/abajo) y clics fuera de la vista. | **Elegido**. |
| Utilizar una librería externa (como Headless UI o Radix) | Añade dependencias nuevas en un proyecto que ya cuenta con soluciones a medida. | **Rechazado**. |

## Data Flow
El menú recibe un array de configuraciones `RowActionMenuItem[]` generado dinámicamente en la fila para cada usuario:

```
[RowActionMenu] ──(renders target button)──> [Click]
       │
       └──(portal to document.body)──> [Floating Menu]
                                             │
                                   (triggers callbacks)
                                             │
                         [handleVerifyEmail | openGiftDialog | etc.]
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| [AdminUsers.tsx](file:///Users/tiagofur/dev/solennix/web/src/pages/Admin/AdminUsers.tsx) | Modify | Importar y renderizar `RowActionMenu` con los ítems dinámicos de acción, eliminando botones inline. |

## Interfaces / Contracts
Se reutilizará la interfaz contractual de `RowActionMenuItem`:

```typescript
export interface RowActionMenuItem {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant?: "default" | "destructive";
  href?: string;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Renderizado condicional de opciones del menú dropdown según el rol/estado del usuario | Mockear llamadas en `AdminUsers.test.tsx` y simular clicks en el botón `...` para verificar que se desplieguen las opciones correctas. |

## Migration / Rollout
No migration required.
