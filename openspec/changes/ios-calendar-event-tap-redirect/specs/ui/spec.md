# Delta for UI (iOS Calendar Navigation)

## MODIFIED Requirements

### Requirement: iOS Calendar Mode Event Card Redirection
La lista filtrada de eventos en la vista de Calendario (.calendario) en iOS MUST permitir que al presionar (tap) cualquier tarjeta de evento, el usuario sea redirigido de forma inmediata a la vista de detalle correspondiente (Route.eventDetail).

#### Scenario: Tap Event in Calendar Filtered List
- GIVEN el usuario se encuentra en la pantalla de Eventos en la vista de Calendario
- WHEN el usuario hace tap sobre una tarjeta de evento en la lista de eventos filtrados de la fecha seleccionada
- THEN la aplicación navega a la pantalla de Detalle del Evento (Route.eventDetail) correspondiente al id del evento.
