# Changelog

Historial oficial de cambios de Solennix para Web, iOS, Android y Backend.

Última actualización: 2026-05-11

## Versiones actuales

| Plataforma | Versión | Build | Source |
| --- | --- | --- | --- |
| Web | 1.0.1 | - | web/package.json |
| iOS | 1.2.0 | 7 | ios/project.yml |
| Android | 1.2.0 | 6 | android/app/build.gradle.kts |
| Backend | 1.0.0 | - | backend/VERSION |

## 2026-05-10 — iOS UX: filtro de fechas Apple HIG + KPI responsivo en productos

Mejoras de calidad UX en iOS siguiendo las guías oficiales de Apple (HIG). Sin cambios en otras plataformas.

### IOS

- **Events list — filtro por fecha**: se reemplazó el panel expandible inline ("Filtros" en texto) por un ícono `calendar` en la toolbar que abre un sheet nativo de 380pt. Dentro del sheet, dos `DatePicker` con estilo `.compact` (Apple HIG recomendado para espacio restringido) permiten seleccionar rango "Desde / Hasta" con toggle de activación. El ícono cambia a `calendar.badge.clock` cuando hay filtros activos.
- **Products detail — KPI grid responsivo**: la grilla de 4 KPIs (precio base, costo unitario, margen, próximos eventos) pasó de dos `HStack` fijos a un `LazyVGrid` dinámico: 2 columnas en iPhone, 4 en iPad/Mac Catalyst. Usa el `horizontalSizeClass` ya presente en la vista.

## 2026-05-11 — Personal: respuesta de asignaciones team_member + first-accept-wins (MVP)

Se habilita el flujo base para que colaboradores con usuario puedan responder asignaciones y para operar ofertas competitivas estilo dispatch (primer aceptación gana).

### BACKEND

- Nuevo `POST /api/staff/assignments/{id}/respond` con respuestas `accept|decline`.
- Nuevo `GET /api/staff/my-assignments` para que el team_member vea sus asignaciones.
- Nueva migración `050` en `event_staff`: `offer_group_id` + `offer_slots`.
- Lógica transaccional first-accept-wins: al llenarse cupos, se auto-marcan `declined` los pendientes del mismo grupo.

### WEB

- Contratos de tipos agregados para `TeamMemberAssignment` y `AssignmentResponseOutcome`.
- `staffService` agrega `getMyAssignments()` y `respondAssignment()`.

### IOS

- Endpoints de red agregados para `staff/my-assignments` y `staff/assignments/{id}/respond`.
- Modelos nuevos `TeamMemberAssignment` y `AssignmentResponseOutcome`.

### ANDROID

- Endpoints de red agregados para `staff/my-assignments` y `staff/assignments/{id}/respond`.
- Modelos nuevos `TeamMemberAssignment` y `AssignmentResponseOutcome`.
- `StaffRepository` agrega métodos para listar y responder asignaciones.

## 2026-05-06 - Release train móvil 1.2.0 + Web 1.0.1

Se prepara el siguiente release de tiendas con mejoras reales de paridad en búsqueda, disponibilidad de equipo y calendario; Web recibe un patch visible para acompañar el changelog público y el reposicionamiento del producto.

### WEB
- La versión declarada de Web sube a 1.0.1 para reflejar el siguiente batch público de mejoras.
- La app consume búsqueda de eventos server-backed (`/api/events/search`) y se alinea mejor con mobile en resultados y filtros.
- Landing, Help y changelog público quedan listos como superficie coherente de comunicación del release.

### IOS
- iOS sube a 1.2.0 (build 7) con búsqueda de eventos apoyada en backend y mejor coherencia de resultados.
- Calendario gana paridad funcional con filtro por estado, exportación iCal, retry y navegación refinada.
- Se recuperan widgets clave del Dashboard y se corrige el guardado de ajustes de stock.

### ANDROID
- Android sube a 1.2.0 (versionCode 6) con búsqueda server-backed y disponibilidad de equipo integrada al flujo de eventos.
- Calendario alcanza paridad con estado, iCal, retry, FAB y navegación desde eventos.
- Los formularios scrolleables usan `imePadding()` para evitar que el teclado tape acciones o campos.

### BACKEND
- El backend mantiene 1.0.0 como versión canónica del API en este release train.
- Las apps consumen capacidades ya presentes en el API actual para `/api/events/search`, disponibilidad de equipo y exportación iCal.

## 2026-05-04 - Baseline 1.0.0 para Web y Backend + Help alineado al diseño

Web y Backend quedan formalmente en 1.0.0 bajo el manifest canónico, con changelog oficial regenerado y Help Center visualmente alineado al sistema de diseño.

### WEB
- La versión pública de Web sube a 1.0.0 y queda gobernada desde versioning/releases.json + web/package.json.
- About deja de hardcodear la versión y consume el valor generado desde changelog.generated.ts.
- Help Center adopta tokens del design system (bg/card/border/text/primary) para respetar light/dark theme y consistencia visual con el resto de la app.

### IOS

### ANDROID

### BACKEND
- backend/VERSION sube a 1.0.0 como referencia estable del API en producción.
- La documentación de arquitectura backend deja explícito que backend/VERSION, no go.mod, es la fuente de verdad para versionado del servicio.

## 2026-05-03 - Paridad de flujo de eventos y estabilidad general

Se consolidaron mejoras de UX y fixes criticos en mobile y web para formulario, pagos y PDFs.

### WEB
- Fix de descuento en PDF de contrato/cotizacion para que coincida con Finanzas.
- Confirmacion antes de eliminar productos, extras, equipo o insumos.
- Alerta inline de sobrestock en equipamiento en formulario de evento.

### IOS
- Fix de crash al eliminar extra o insumo vacio en formulario de evento.
- Fix de descuento en PDF de contrato para mantener consistencia con pantalla financiera.
- Paridad de UI de equipamiento con alerta de sobrestock no bloqueante.

### ANDROID
- Boton Liquidar en pagos para autocompletar saldo pendiente.
- Confirmacion previa para eliminar pagos.
- Generacion de PDF en segundo plano para evitar congelamiento de UI.

### BACKEND
- Contratos de API y reglas de negocio alineados con los fixes de descuentos y pagos.
- Refuerzo de consistencia para calculos mostrados en clientes API.
