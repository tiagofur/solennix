---
tags:
  - marketing
  - video
  - v08
date: 2026-04-21
status: concept
duration: 20s
screenshots: pending
---

# V08 — Staff y Equipos de Trabajo

> [!quote] Mensaje clave
> "Tu equipo. Siempre coordinado. Sin WhatsApp groups."

---

## Objetivo

Mostrar la gestión de personal y equipos de trabajo como reemplazo de grupos de WhatsApp desordenados.

## Audiencia

Organizadores que coordinan su equipo por WhatsApp y no saben quién está asignado a qué.

---

## Storyboard

### Escena 1: Hook (Frames 0-60 / 0-2s)

- Pregunta: "¿Quién trabaja en cada evento?"
- Fondo oscuro

### Escena 2: Lista de Personal (Frames 60-180 / 2-6s)

- Screenshot `staff-list.png` aparece
- Muestra: nombre, rol, teléfono, email
- Items aparecen con slide-in escalonado

### Escena 3: Equipos de Trabajo (Frames 180-330 / 6-11s)

- Transición slide → `staff-teams.png`
- Se ve: equipos formados (ej: "Equipo de montaje", "Equipo de sonido")
- Animación de agrupación: personas se agrupan en cards

### Escena 4: Asignación a Evento (Frames 330-450 / 11-15s)

- Screenshot `event-staff.png`
- Muestra staff asignado al evento específico

### Escena 5: Beneficio + CTA (Frames 450-600 / 15-20s)

- Texto: "Tu equipo. Siempre coordinado. Sin grupos de WhatsApp."
- Logo + CTA

---

## Screenshots

| Archivo | Qué mostrar | Listo |
|---------|-------------|-------|
| `staff-list.png` | Lista de personal | ⬜ |
| `staff-teams.png` | Equipos de trabajo | ⬜ |
| `event-staff.png` | Staff asignado a un evento | ⬜ |

## Notas Técnicas

- Slide-in escalonado: `Sequence` con offset de 8 frames por item
- Animación de agrupación: `interpolate()` con translateX/Y agrupando cards
- Transiciones: `slide({ direction: "from-right" })`

---

## Ver también

- [[01 - Plan de Videos Solennix|Plan General]]
- [[02 - Assets Necesarios]]
- [[MOC|Marketing Hub]]
