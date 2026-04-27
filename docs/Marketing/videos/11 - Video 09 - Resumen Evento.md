---
tags:
  - marketing
  - video
  - v09
date: 2026-04-21
status: concept
duration: 25s
screenshots: pending
---

# V09 — Resumen de Evento: Todo en Uno

> [!quote] Mensaje clave
> "Info general, productos, finanzas, contrato, fotos... TODO en un solo lugar."

---

## Objetivo

Mostrar que un evento completo vive en una sola pantalla, con tabs que organizan toda la información. El reemplazo definitivo de "la info desparramada en 5 lugares".

## Audiencia

Organizadores que tienen info de un mismo evento en Excel, WhatsApp, Drive, papel y email.

---

## Storyboard

### Escena 1: Hook (Frames 0-60 / 0-2s)

- Texto: "Toda la info de tu evento. En un solo lugar."
- Fondo oscuro

### Escena 2: Overview (Frames 60-180 / 2-6s)

- Screenshot `event-summary-overview.png` aparece
- Muestra: nombre del cliente, fecha, tipo de evento, estado, personas

### Escena 3: Tabs Animados (Frames 180-540 / 6-18s)

Cada tab se "activa" con animación de click:

1. **General** → ya visible
2. **Productos** → `event-products.png` aparece con slide
   - Lista de productos con precios
3. **Finanzas** → `event-financials.png` aparece con slide
   - Total cargado, pagos, saldo pendiente
4. **Contrato** → `event-contract.png` aparece con slide
   - Contrato generado listo para firmar

- Cada transición dura ~3 segundos
- Tab activo se destaca con underline animado

### Escena 4: Beneficio + CTA (Frames 540-750 / 18-25s)

- Texto: "Todo. De tu evento. En un solo lugar. Sin excepciones."
- Logo + CTA

---

## Screenshots

| Archivo | Qué mostrar | Listo |
|---------|-------------|-------|
| `event-summary-overview.png` | Tab General del resumen | ⬜ |
| `event-products.png` | Tab Productos | ⬜ |
| `event-financials.png` | Tab Finanzas | ⬜ |
| `event-contract.png` | Contrato generado | ⬜ |

## Notas Técnicas

- Tab switching: `TransitionSeries` con `slide({ direction: "from-right" })` entre cada tab
- Underline animado: `interpolate()` sobre `width` del underline
- Cada tab se muestra ~90 frames (3s)
- Total de la composición: 750 frames (25s a 30fps)

---

## Ver también

- [[01 - Plan de Videos Solennix|Plan General]]
- [[02 - Assets Necesarios]]
- [[MOC|Marketing Hub]]
