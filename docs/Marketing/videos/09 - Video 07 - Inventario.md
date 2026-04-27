---
tags:
  - marketing
  - video
  - v07
date: 2026-04-21
status: concept
duration: 20s
screenshots: pending
---

# V07 — Inventario y Equipamiento

> [!quote] Mensaje clave
> "Stock bajo? Te avisamos antes de que sea un problema."

---

## Objetivo

Mostrar que Solennix controla inventario, equipos y alerta antes de que algo falte en un evento.

## Audiencia

Organizadores que descubren que faltan sillas/mesas/equipos el día del evento.

---

## Storyboard

### Escena 1: Hook (Frames 0-60 / 0-2s)

- Pregunta: "¿Tenés suficientes sillas para el evento del sábado?"
- Fondo oscuro

### Escena 2: Lista de Inventario (Frames 60-210 / 2-7s)

- Screenshot `inventory-list.png` aparece
- Items aparecen en secuencia con slide-in
- Se ve: nombre del item, stock actual, unidad

### Escena 3: Alerta de Stock Bajo (Frames 210-360 / 7-12s)

- Transición zoom → `low-stock-alert.png`
- Alerta roja se destaca con pulso
- Icono de warning animado
- Se ve: item con stock crítico

### Escena 4: Equipos del Evento (Frames 360-480 / 12-16s)

- Screenshot `event-equipment.png`
- Muestra equipos asignados al evento

### Escena 5: Beneficio + CTA (Frames 480-600 / 16-20s)

- Texto: "Inventario controlado. Alertas automáticas. Cero sorpresas."
- Logo + CTA

---

## Screenshots

| Archivo | Qué mostrar | Listo |
|---------|-------------|-------|
| `inventory-list.png` | Lista de inventario con stocks | ⬜ |
| `low-stock-alert.png` | Alerta de stock bajo (rojo) | ⬜ |
| `event-equipment.png` | Equipos asignados a evento | ⬜ |

## Notas Técnicas

- Items apareciendo en secuencia: `Sequence` con offsets de ~10 frames
- Alerta roja pulsante: `interpolate()` con scale y boxShadow
- Icono warning: rotación suave con `interpolate()`

---

## Ver también

- [[01 - Plan de Videos Solennix|Plan General]]
- [[02 - Assets Necesarios]]
- [[MOC|Marketing Hub]]
