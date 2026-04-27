---
tags:
  - marketing
  - video
  - v10
date: 2026-04-21
status: concept
duration: 20s
screenshots: pending
---

# V10 — Portal del Cliente

> [!quote] Mensaje clave
> "Tus clientes ven presupuestos, detalles y más. Sin llamadas."

---

## Objetivo

Mostrar el portal del cliente como feature diferenciador: el cliente puede ver su evento, productos y presupuesto sin llamar al organizador.

## Audiencia

Organizadores que pasan horas contestando llamadas de clientes preguntando "¿cuánto llevo pagado?" o "¿qué productos elegimos?".

---

## Storyboard

### Escena 1: Hook (Frames 0-60 / 0-2s)

- Pregunta: "¿Y si tu cliente pudiera ver todo online?"
- Fondo oscuro

### Escena 2: Compartir Link (Frames 60-180 / 2-6s)

- Screenshot `share-link.png` aparece
- Se ve: card de "Compartir portal" con botón de link
- Animación: botón se "presiona" y aparece link copiado

### Escena 3: Portal del Cliente (Frames 180-390 / 6-13s)

- Transición fade → `client-portal.png`
- Muestra la vista que el cliente ve:
  - Nombre del evento
  - Productos seleccionados
  - Presupuesto
  - Estado del evento
- Animación de "navegación del cliente" — se scrolla suavemente

### Escena 4: Beneficio + CTA (Frames 390-600 / 13-20s)

- Texto: "Tus clientes ven todo. Sin llamarte. Sin WhatsApp."
- "Transparencia total. Confianza total."
- Logo + CTA

---

## Screenshots

| Archivo | Qué mostrar | Listo |
|---------|-------------|-------|
| `share-link.png` | Card de compartir portal | ⬜ |
| `client-portal.png` | Vista del portal del cliente | ⬜ |

## Notas Técnicas

- Animación de "botón presionado": `interpolate()` con scale de 1.0 → 0.95 → 1.0
- Scroll suave en portal: `interpolate()` sobre `translateY` del contenedor
- Transición fade: `fade()` con `linearTiming({ durationInFrames: 15 })`

---

## Ver también

- [[01 - Plan de Videos Solennix|Plan General]]
- [[02 - Assets Necesarios]]
- [[MOC|Marketing Hub]]
