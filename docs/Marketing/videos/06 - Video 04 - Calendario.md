---
tags:
  - marketing
  - video
  - v04
date: 2026-04-21
status: done
duration: 15s
screenshots: done
---

# V04 — Calendario Inteligente

> [!quote] Mensaje clave
> "Visualizá tu mes entero. Un vistazo. Cero sorpresas."

---

## Objetivo

Mostrar el calendario interactivo como reemplazo de Google Calendar desordenado y notas sueltas.

## Audiencia

Organizadores que usan Google Calendar + papel para llevar la agenda de eventos.

---

## Storyboard

### Escena 1: Hook (0-2s)

- Pregunta: "¿Qué eventos tenés esta semana?"
- Fondo oscuro

### Escena 2: Calendario Mensual (2-7s)

- Screenshot `02-calendario.png` aparece con scale-up
- Efecto de pulso suave en días con eventos
- Texto: "Tu agenda visual. Sin sorpresas."

### Escena 3: Detalle del Evento (7-11s)

- Screenshot `04-evento-detalle.png` con zoom-in
- Overlay: "DETALLE TOTAL — Toda la info de tus eventos en un solo lugar."

### Escena 4: CTA (11-15s)

- Logo Solennix animado
- "SIN EXCEL. SIN CAOS."
- Badges de App Store + Google Play + solennix.com

---

## Screenshots

| Archivo | Qué mostrar | Listo |
|---------|-------------|-------|
| `02-calendario.png` | Calendario mensual con eventos | ✅ |
| `04-evento-detalle.png` | Detalle de un evento | ✅ |

## Notas Técnicas

- Duración implementada: **15s (450 frames a 30fps)**
- Composiciones: `V04-Calendar-Reel` (9:16) y `V04-Calendar-Square` (1:1)
- `TransitionSeries`: 60+150+120+150 − 30 (3 transiciones × 10) = 450 frames exactos
- Efecto de pulso en calendario: `Math.sin(frame / 5)`
- Zoom en detalle: `interpolate(frame, [0, 120], [1.1, 1.3])`

---

## Redes Sociales & Promoción

### Descripción sugerida

¿Cuántas veces revisaste el teléfono esta semana para recordar qué eventos tenías? 📅 Con el Calendario de Solennix, visualizás todo tu mes de un vistazo: nombre del cliente, tipo de evento, horarios y estado — todo en una sola pantalla. Cero Google Calendar. Cero papelitos. Cero sorpresas.

👇 Probalo gratis en solennix.com

### Hashtags

#Solennix #OrganizadorDeEventos #WeddingPlanner #AgendaDeEventos #EventosMexico

### Música sugerida

- **Estilo:** Ambient moderno / Corporate Minimal.
- **Evolución:** Comienza tranquilo y crece sutilmente hacia el CTA, transmitiendo orden y claridad.

---

## Ver también

- [[01 - Plan de Videos Solennix|Plan General]]
- [[02 - Assets Necesarios]]
- [[MOC|Marketing Hub]]
