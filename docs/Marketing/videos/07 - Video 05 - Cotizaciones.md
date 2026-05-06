---
tags:
  - marketing
  - video
  - v05
date: 2026-04-21
status: done
duration: 18s
screenshots: mixed
---

# V05 — Cotizaciones en Segundos

> [!quote] Mensaje clave
> "Agregas servicios, se calcula el total y mandas el PDF. Todo en minutos."

---

## Objetivo

Mostrar la cotización rápida y generación de PDF como reemplazo de presupuestos manuales que llevan horas.

## Audiencia

Organizadores que arman presupuestos a mano en Excel o Word perdiendo 30+ minutos cada vez.

---

## Storyboard

### Escena 1: Hook (Frames 0-80 / 0-2.7s)

- Texto animado con comparación clara:
  - "¿30 minutos? ¿1 hora? ¿Medio día?"
- Números cruzados con línea roja
- Aparece: "**Ahora: minutos.**"

### Escena 2: Cotización rápida (Frames 80-250 / 2.7-8.3s)

- Mockup del celular con una cotización real
- Se agregan servicios uno por uno
- El total se actualiza automáticamente
- Mensaje clave: "Agregas servicios y el total se calcula solo"

### Escena 3: PDF listo (Frames 250-410 / 8.3-13.7s)

- Reveal vertical del PDF
- Se ve: logo, conceptos, precios y total
- Badge final: "Enviar al cliente"

### Escena 4: Beneficio + CTA (Frames 410-550 / 13.7-18.3s)

- Texto: "Tu cotización queda lista. Con total, PDF y tu marca en segundos."
- Logo + CTA

---

## Screenshots

| Archivo | Qué mostrar | Listo |
|---------|-------------|-------|
| Mockup animado en código | Pantalla de cotización rápida con productos | ✅ |
| Mockup animado en código | PDF generado profesional | ✅ |

## Notas Técnicas

- Hook comparativo con before/after más claro
- Productos agregándose con reveal escalonado
- Reveal vertical del PDF para reforzar la entrega final
- Count-up en total: `interpolate(frame, [0, 60], [0, totalPrice])`
- Composición implementada: `V05-Quotes-Reel`
- Output renderizado: `remotion/out/v05-quotes-reel.mp4`

---

## Ver también

- [[01 - Plan de Videos Solennix|Plan General]]
- [[02 - Assets Necesarios]]
- [[MOC|Marketing Hub]]
