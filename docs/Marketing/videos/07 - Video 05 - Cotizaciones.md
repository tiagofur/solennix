---
tags:
  - marketing
  - video
  - v05
date: 2026-04-21
status: concept
duration: 25s
screenshots: pending
---

# V05 — Cotizaciones en Segundos

> [!quote] Mensaje clave
> "Cotizaciones profesionales en segundos. No en horas."

---

## Objetivo

Mostrar la cotización rápida y generación de PDF como reemplazo de presupuestos manuales que llevan horas.

## Audiencia

Organizadores que arman presupuestos a mano en Excel o Word perdiendo 30+ minutos cada vez.

---

## Storyboard

### Escena 1: Hook (Frames 0-60 / 0-2s)

- Texto animado con cuenta regresiva:
  - "¿30 minutos? ¿1 hora? ¿Medio día?"
- Números cruzados con línea roja
- Aparece: "**Segundos.**"

### Escena 2: Quick Quote (Frames 60-210 / 2-7s)

- Screenshot `quick-quote.png` aparece
- Animación: productos se agregan uno por uno al carrito
- Cada línea aparece con slide-from-right
- Total se actualiza con efecto "count-up"

### Escena 3: PDF Generado (Frames 210-420 / 7-14s)

- Transición fade → `quote-pdf.png`
- Animación de "imprimir": el PDF aparece como si saliera de una impresora
- Se ve profesional: logo, productos, precios, totales

### Escena 4: Beneficio + CTA (Frames 420-750 / 14-25s)

- Texto: "Cotizaciones profesionales. En segundos. Con tu marca."
- Logo + CTA

---

## Screenshots

| Archivo | Qué mostrar | Listo |
|---------|-------------|-------|
| `quick-quote.png` | Pantalla de cotización rápida con productos | ⬜ |
| `quote-pdf.png` | PDF generado profesional | ⬜ |

## Notas Técnicas

- Cuenta regresiva inicial: `interpolate()` con texto dinámico
- Productos agregándose: `Sequence` con offset escalonado
- Efecto "impresora": slide-from-top con clip-path animado
- Count-up en total: `interpolate(frame, [0, 60], [0, totalPrice])`

---

## Ver también

- [[01 - Plan de Videos Solennix|Plan General]]
- [[02 - Assets Necesarios]]
- [[MOC|Marketing Hub]]
