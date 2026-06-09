# Changelog

Historial oficial de cambios de Solennix para Web, iOS, Android y Backend.

Última actualización: 2026-06-08

## Versiones actuales

| Plataforma | Versión | Build | Source |
| --- | --- | --- | --- |
| Web | 1.0.1 | - | web/package.json |
| iOS | 1.3.0 | 8 | ios/project.yml |
| Android | 1.3.1 | 9 | android/app/build.gradle.kts |
| Backend | 1.0.0 | - | backend/VERSION |

## 2026-06-08 - Android 1.3.1: Menús contextuales y correcciones de UI

Se unifican los menús de acciones rápidas (bottom sheets) para todas las listas principales en Android y se corrige el espaciado del teclado en formularios.

### WEB

### IOS

### ANDROID
- Se implementa menú contextual (bottom sheet) de acciones rápidas para las listas de Clientes, Productos, Inventario, Colaboradores y Equipos.
- Se corrige el bug de espaciado vacío que aparecía arriba del teclado al abrirlo en cualquier formulario.
- Se corrigen bugs de navegación y edición en el flujo del formulario de eventos.

### BACKEND

## 2026-06-03 - Release train móvil 1.3.0: Eliminación de cuenta y localización

Se introduce la eliminación de cuenta autogestionada para cumplir con normativas de tiendas y la paridad total de localización dinámica en mobile y web.

### WEB
- Se implementa la opción de eliminación de cuenta autogestionada en Ajustes.
- Admin: Pantalla de detalle de usuario con métricas de adopción y timeline de actividad sin PII.
- Admin: Menú contextual de acciones y función de bloquear usuario con motivo obligatorio.

### IOS
- Se implementa la eliminación de cuenta autogestionada en Ajustes.
- Paridad total y traducción dinámica para toda la interfaz (Auth, Configuración, Calendario).

### ANDROID
- Se implementa la eliminación de cuenta autogestionada en Ajustes.
- Paridad total y traducción dinámica para toda la interfaz (Auth, Configuración, Calendario).
- Actualizaciones en las dependencias Gradle y Gradle Wrapper para mayor estabilidad.

### BACKEND
- Se añade el endpoint POST /api/user/delete para eliminación de cuenta.
- Se añade columna de verificación de email y flujo de verificación administrativa.
- Seguridad: Enmascaramiento de emails en logs de auth y sanitización de rutas absolutas de archivos.
- Observabilidad: Logs estructurados para flujos de pago públicos y validación de OpenAPI.

## 2026-05-14 - Android 1.2.0 pre-publicación: hardening y paridad final

Se completa el hardening previo a publicación de Android 1.2.0 con mejoras de estabilidad, UX en formularios, consistencia visual y mayor confiabilidad de calidad para stores.

### WEB

### IOS

### ANDROID
- Se corrige fricción en formularios largos aplicando `imePadding()` en contenedores scrolleables para que el teclado no tape campos ni acciones.
- La bandeja de pagos del organizador queda integrada y alineada visualmente (tema y referencias de diseño corregidas).
- La generación de PDFs migra a endpoints backend para mejorar consistencia y reducir trabajo pesado en cliente.
- Se elimina la acción legacy de WhatsApp en detalle de evento para consolidar el flujo oficial de compartición.
- Se refuerza estabilidad de dependencias/build (alineación Hilt-AGP y actualizaciones de toolchain Android).
- Se consolida baseline de calidad con batería de tests unitarios en verde y gate de umbral de startup para hardening pre-store.

### BACKEND

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
