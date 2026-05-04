# Changelog

Historial oficial de cambios de Solennix para Web, iOS, Android y Backend.

Última actualización: 2026-05-04

## Versiones actuales

| Plataforma | Versión | Build | Source |
| --- | --- | --- | --- |
| Web | 1.0.0 | - | web/package.json |
| iOS | 1.1.0 | 6 | ios/project.yml |
| Android | 1.1.2 | 5 | android/app/build.gradle.kts |
| Backend | 1.0.0 | - | backend/VERSION |

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
