# Exploration: iOS Calendar Event Tap Redirection

### Current State
En `EventListView.swift` (modo `.lista`), los eventos se renderizan usando un `List` que permite que el hack de `ZStack { cell; NavigationLink(EmptyView) }` funcione debido a que SwiftUI reenvía automáticamente los toques de fila al primer link.

En cambio, en `EventosLayoutFactory.swift` (modo `.calendario`), el contenedor de la lista filtrada (`EventosFilteredList`) es un `VStack` plano dentro de un `ScrollView`. En un `VStack`, este hack no funciona porque `EmptyView` no tiene tamaño ni target de hit-test. Por lo tanto, tocar la tarjeta del evento toca la vista del cell pero no dispara la navegación del `NavigationLink`.

### Affected Areas
- `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventosLayoutFactory.swift` — `EventosFilteredList` utiliza un `ZStack` con un `NavigationLink` invisible envolviendo un `EmptyView`.

### Approaches
1. **Direct NavigationLink Wrapping** — Envolver la celda directamente en el `NavigationLink(value: Route.eventDetail(id: event.id))`.
   - Pros: Funciona al 100% en `VStack`, restaura la navegación del tap y no pinta chevrons de forma nativa al estar fuera de un `List`.
   - Cons: Ninguno.
   - Effort: Low.

2. **Convert filtered list to List component** — Reemplazar el `VStack` por un `List` en `EventosFilteredList`.
   - Pros: Permite mantener el hack del `ZStack`.
   - Cons: Introduce estilos de lista nativos de iOS (backgrounds, separadores, paddings) que romperían el diseño compacto y la estética de la tarjeta del calendario unificado.
   - Effort: Medium.

### Recommendation
Usar la **Aproximación 1 (Direct NavigationLink Wrapping)** ya que mantiene el diseño visual intacto de `EventosFilteredList` y habilita la interacción nativa de forma limpia.

### Risks
- Ninguno detectado. El estilo `.buttonStyle(.plain)` ya está aplicado y previene cualquier resalte de color azul de botón no deseado.

### Ready for Proposal
Yes — La causa raíz está identificada y la solución es directa.
