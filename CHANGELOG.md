# Changelog

Historial oficial de cambios de Solennix para Web, iOS, Android y Backend.

Ultima actualizacion: 2026-05-03

## Versiones actuales

| Plataforma | Version | Build | Source |
| --- | --- | --- | --- |
| Web | 0.0.0 | - | web/package.json |
| iOS | 1.1.0 | 6 | ios/project.yml |
| Android | 1.1.2 | 5 | android/app/build.gradle.kts |
| Backend | 0.1.0 | - | backend/VERSION |

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
