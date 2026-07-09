# Proposal: iOS Calendar Event Tap Redirection

## Intent
Habilitar la navegación/redirección correcta hacia el detalle del evento al hacer clic/tap en una tarjeta de evento dentro de la vista de Calendario en iOS.

## Scope
### In Scope
- Modificación de la envoltura de celdas en `EventosFilteredList` dentro de `EventosLayoutFactory.swift` para usar `NavigationLink` directo en lugar de la técnica `ZStack + EmptyView` incompatible con `VStack`.
- Unit / UI tests para validar que las celdas en la vista de calendario redireccionan correctamente.

### Out of Scope
- Modificaciones a la vista de lista regular de eventos (ya funciona correctamente).
- Cambios en el backend o en la plataforma web (la web ya redirecciona correctamente).

## Approach
Envolver cada celda filtrada directamente en un `NavigationLink(value: Route.eventDetail(id: event.id))` en `EventosLayoutFactory.swift`. Al estar fuera de una `List` de SwiftUI, este elemento no pinta chevrons de forma predeterminada y su estilo `.buttonStyle(.plain)` evita cualquier cambio indeseado en la apariencia visual, restaurando el redireccionamiento interactivo.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventosLayoutFactory.swift` | Modified | Cambiar la envoltura de celdas en `EventosFilteredList`. |

## Parity Check (All Platforms)
- iOS: Implementar cambio propuesto en la vista unificada.
- Android: Ya redirecciona correctamente desde la vista mensual.
- Web: Ya redirecciona correctamente desde el panel diario/mensual.
- Backend: No afectado.

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Renderizado accidental de chevrons | Low | SwiftUI no renderiza chevrons para `NavigationLink` fuera de `List`. |

## Rollback Plan
Revertir los cambios en `EventosLayoutFactory.swift`.

## Dependencies
Ninguna.

## Success Criteria
- [ ] Hacer clic en una tarjeta de evento en la vista de calendario en iOS navega exitosamente al detalle del evento.
- [ ] El diseño visual de `EventosFilteredList` se mantiene idéntico.
- [ ] La compilación y la suite de pruebas unitarias y de UI de iOS pasan correctamente.
