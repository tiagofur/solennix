---
tags:
  - marketing
  - video
  - v06
date: 2026-04-21
status: concept
duration: 20s
screenshots: pending
---

# V06 — Control de Pagos

> [!quote] Mensaje clave
> "Sabés exactamente cuánto te deben. Siempre."

---

## Objetivo

Mostrar el seguimiento de pagos y alertas financieras como reemplazo de "yo te debo" por WhatsApp.

## Audiencia

Organizadores que no saben cuánto les deben porque lo rastrean en notas o mensajes.

---

## Storyboard

### Escena 1: Hook (Frames 0-60 / 0-2s)

- Pregunta: "¿Quién pagó y quién no?"
- Fondo oscuro

### Escena 2: Alertas del Dashboard (Frames 60-210 / 2-7s)

- Screenshot `dashboard-alerts.png` aparece
- Se destaca la sección "Requieren atención"
- Badge "X alertas" pulsa con animación
- Se ve: "Cobros por cerrar" con montos pendientes

### Escena 3: Tab de Pagos (Frames 210-390 / 7-13s)

- Transición slide → `payments-tab.png`
- Muestra: pagos registrados con monto, fecha, método
- Animación de "checkmark" aparece sobre pagos completados

### Escena 4: Beneficio + CTA (Frames 390-600 / 13-20s)

- Texto: "Sabés exactamente cuánto te deben. Siempre."
- Logo + CTA

---

## Screenshots

| Archivo | Qué mostrar | Listo |
|---------|-------------|-------|
| `dashboard-alerts.png` | Alertas de cobros pendientes | ⬜ |
| `payments-tab.png` | Tab de pagos de un evento | ⬜ |

## Notas Técnicas

- Badge pulsante: `interpolate()` con `scale` entre 1.0 y 1.15 en loop
- Highlight en alertas: overlay con `opacity` interpolado
- Checkmarks: aparecen con `spring()` animation

---

## Ver también

- [[01 - Plan de Videos Solennix|Plan General]]
- [[02 - Assets Necesarios]]
- [[MOC|Marketing Hub]]
