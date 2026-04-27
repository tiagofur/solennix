---
tags:
  - marketing
  - video
  - v02
date: 2026-04-21
status: concept
duration: 20s
screenshots: pending
---

# V02 — Dashboard: Tu Centro de Comando

> [!quote] Mensaje clave
> "¿Cuánto ganaste este mes? Tus números, de un vistazo."

---

## Objetivo

Mostrar el dashboard como la primera pantalla que un organizador ve cada mañana. KPIs, gráficos, alertas.

## Audiencia

Organizadores que cierran el mes sin saber si ganaron o perdieron.

---

## Storyboard

### Escena 1: Hook (Frames 0-60 / 0-2s)

- Pregunta aparece con efecto typewriter:
  - "¿Cuánto ganaste este mes?"
- Fondo oscuro, texto blanco grande

### Escena 2: Dashboard Reveal (Frames 60-180 / 2-6s)

- Screenshot `dashboard-full.png` aparece con slide desde abajo
- Se muestra completo por 1 segundo

### Escena 3: KPIs Destacados (Frames 180-360 / 6-12s)

- Zoom secuencial a cada KPI card:
  1. **Ventas Netas** → número aparece con "count-up"
  2. **Cobrado** → otro count-up
  3. **Eventos** → número aparece
  4. **Cotizaciones Pendientes** → badge de warning

### Escena 4: Gráfico (Frames 360-480 / 12-16s)

- Zoom al gráfico de barras comparativo
- Barras se animan de izquierda a derecha (interpolate height)

### Escena 5: Beneficio + CTA (Frames 480-600 / 16-20s)

- Texto: "Tus números. De un vistazo. Sin Excel."
- Logo + CTA "Probá gratis"

---

## Screenshots

| Archivo | Qué mostrar | Listo |
|---------|-------------|-------|
| `dashboard-full.png` | Dashboard completo con datos reales | ⬜ |
| `dashboard-chart.png` | Gráfico de barras (close-up, opcional) | ⬜ |
| `dashboard-alerts.png` | Sección de alertas (close-up, opcional) | ⬜ |

## Notas Técnicas

- Efecto "count-up" en KPIs usando `interpolate()` sobre el frame
- Zoom con `transform: scale()` interpolado
- `TransitionSeries` con `slide({ direction: "from-bottom" })` para reveal del dashboard

---

## Redes Sociales & Promoción

### Descripción sugerida
Dejá de adivinar si tu negocio es rentable. 📈 Con el Dashboard de Solennix, tenés tus ventas, cobros y eventos pendientes de un vistazo. Tomá decisiones basadas en datos, no en presentimientos. ¡Tus números bajo control!

### Hashtags
#Solennix #FinanzasEventos #DataDriven #WeddingPlanner #EventosMexico #ControlTotal #BusinessIntelligence

### Música sugerida
- **Estilo:** Upbeat Corporate / Modern Minimal.
- **Evolución:** Un beat constante y motivador que transmita claridad y progreso.

---

## Ver también

- [[01 - Plan de Videos Solennix|Plan General]]
- [[02 - Assets Necesarios]]
- [[MOC|Marketing Hub]]
