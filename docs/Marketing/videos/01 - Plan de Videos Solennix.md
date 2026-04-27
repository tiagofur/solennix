---
tags:
  - marketing
  - videos
  - plan
date: 2026-04-21
status: active
---

# Plan de Videos de Producto — Solennix

> [!abstract] Objetivo
> Crear **10 videos cortos** (15-30 seg) que muestren a organizadores de eventos LATAM cómo Solennix elimina el caos de Excel, Google Calendar, WhatsApp y papelitos. Todo en una sola app.

---

## Propuesta de Valor por Video

Cada video sigue la fórmula: **Problema → Solución → Beneficio → CTA**

| # | Título | Problema que resuelve | Feature principal |
|---|--------|----------------------|-------------------|
| 01 | Del Caos al Orden | Info desparramada en 10 apps | Overview general |
| 02 | Dashboard | No saber cuánto ganaste | KPIs + gráficos |
| 03 | Gestión de Clientes | Datos de clientes en Excel/WhatsApp | CRM integrado |
| 04 | Calendario Inteligente | Agenda desordenada | Calendario visual |
| 05 | Cotizaciones en Segundos | Presupuestos a mano en horas | Quick Quote + PDF |
| 06 | Control de Pagos | No saber quién pagó | Seguimiento de pagos |
| 07 | Inventario y Equipamiento | Stock en papel, doble reserva | Inventario + alertas |
| 08 | Staff y Equipos | No saber quién trabaja dónde | Asignación de personal |
| 09 | Resumen de Evento | Info del evento en 5 lugares | Todo-en-uno |
| 10 | Portal del Cliente | Clientes llamando por todo | Portal auto-servicio |

---

## Setup Técnico — Remotion

### Instalación

Remotion se instala como **brownfield** (proyecto existente) dentro de `remotion/` en la raíz del repo.

```bash
npm i --save-exact remotion @remotion/cli @remotion/transitions @remotion/media
```

### Estructura de Carpetas

```
remotion/
├── src/
│   ├── index.ts                    # registerRoot()
│   ├── Root.tsx                    # Todas las <Composition>
│   ├── compositions/               # Un folder por video
│   │   ├── 01-chaos-to-order/
│   │   │   └── ChaosToOrder.tsx
│   │   ├── 02-dashboard/
│   │   │   └── DashboardVideo.tsx
│   │   ├── 03-clients/
│   │   │   └── ClientsVideo.tsx
│   │   ├── 04-calendar/
│   │   │   └── CalendarVideo.tsx
│   │   ├── 05-quotes/
│   │   │   └── QuotesVideo.tsx
│   │   ├── 06-payments/
│   │   │   └── PaymentsVideo.tsx
│   │   ├── 07-inventory/
│   │   │   └── InventoryVideo.tsx
│   │   ├── 08-staff/
│   │   │   └── StaffVideo.tsx
│   │   ├── 09-event-summary/
│   │   │   └── EventSummaryVideo.tsx
│   │   └── 10-client-portal/
│   │       └── ClientPortalVideo.tsx
│   ├── components/                 # Componentes reutilizables
│   │   ├── PhoneMockup.tsx         # Frame de celular animado
│   │   ├── BrowserMockup.tsx       # Frame de browser animado
│   │   ├── TextReveal.tsx          # Texto con reveal (typewriter/fade)
│   │   ├── FeatureCard.tsx         # Card con icono + texto animado
│   │   ├── SolennixLogo.tsx        # Logo animado
│   │   ├── CTAEndCard.tsx          # Card final de CTA
│   │   ├── QuestionHook.tsx        # Pregunta/hook animado
│   │   └── ScreenSlide.tsx         # Slide de screenshot con animación
│   ├── lib/
│   │   ├── animations.ts           # Helpers: fadeIn, slideUp, scaleIn
│   │   └── colors.ts               # Paleta de colores Solennix
│   └── theme/
│       └── tokens.ts               # Design tokens (tamaños, spacing)
├── public/
│   ├── screenshots/                # Capturas de pantalla de la app
│   ├── audio/                      # Música de fondo / voiceover
│   └── logo/                       # Logo Solennix SVG/PNG
└── package.json
```

### Especificaciones Técnicas

| Parámetro | Vertical (Reels/TikTok) | Horizontal (YouTube) |
|-----------|-------------------------|---------------------|
| Resolución | 1080 x 1920 | 1920 x 1080 |
| FPS | 30 | 30 |
| Formato | MP4 (H.264) | MP4 (H.264) |
| Duración | 15-30 seg | 15-30 seg |

### Reglas de Animación (Remotion)

1. **SIEMPRE** usar `useCurrentFrame()` + `interpolate()` — jamás CSS animations/transitions
2. **NUNCA** usar Tailwind animation classes (`animate-pulse`, etc.)
3. Transiciones entre escenas: `<TransitionSeries>` con `fade()`, `slide()`, `wipe()`
4. Timing: `linearTiming()` para cortes limpios, `springTiming()` para orgánicos
5. Imágenes estáticas: usar `<Img>` de Remotion (no `<img>` HTML)
6. Fuentes: cargar con `@remotion/fonts` o Google Fonts via `loadFont()`

### Workflow

```
1. Screenshots → remotion/public/screenshots/
2. Código → remotion/src/compositions/
3. Preview → npx remotion studio remotion/src/index.ts
4. Iterar en Studio hasta quedar conformes
5. Render → npx remotion render remotion/src/index.ts <CompositionId> out/<video>.mp4
```

### Comandos Principales

```bash
# Preview interactivo (Remotion Studio)
npx remotion studio remotion/src/index.ts

# Renderizar un video individual
npx remotion render remotion/src/index.ts ChaosToOrder out/01-chaos-to-order.mp4

# Renderizar TODOS los videos (script batch)
# Se puede hacer con un loop bash o un script Node.js
```

---

## Fórmula de Cada Video

Cada video tiene 5 fases:

```
┌──────────────────────────────────────────────────────────┐
│ HOOK (0-2s)                                              │
│ Pregunta o statement que genera curiosidad                │
│ Ej: "¿Cuánto tiempo te toma armar un presupuesto?"       │
├──────────────────────────────────────────────────────────┤
│ PROBLEMA (2-5s)                                           │
│ Muestra el dolor del organizador (caos, desorden)         │
├──────────────────────────────────────────────────────────┤
│ SOLUCIÓN (5-20s)                                          │
│ Screenshots de la app con animaciones mostrando features  │
├──────────────────────────────────────────────────────────┤
│ BENEFICIO (20-25s)                                        │
│ Mensaje clave: "Todo en un solo lugar" / "En segundos"   │
├──────────────────────────────────────────────────────────┤
│ CTA (25-30s)                                              │
│ "Probá gratis → solennix.com" + App Store / Play Store    │
└──────────────────────────────────────────────────────────┘
```

---

## Plataformas de Distribución

| Plataforma | Formato | Duración ideal |
|-----------|---------|----------------|
| Instagram Reels | Vertical 9:16 | 15-30s |
| TikTok | Vertical 9:16 | 15-30s |
| YouTube Shorts | Vertical 9:16 | 15-60s |
| YouTube (ads) | Horizontal 16:9 | 15-30s |
| LinkedIn | Horizontal 16:9 | 30-60s |
| Landing page | Horizontal 16:9 | 30s |

---

## Próximos Pasos

- [ ] Confirmar paleta de colores exacta y logo
- [ ] Tomar screenshots de la app (ver [[02 - Assets Necesarios]])
- [ ] Instalar Remotion en el proyecto
- [ ] Desarrollar componentes base compartidos
- [ ] Desarrollar video por video iterando en Studio
- [ ] Elegir música de fondo (royalty-free)
- [ ] Render final de los 10 videos
- [ ] Subir a plataformas

---

## Ver también

- [[02 - Assets Necesarios]]
- [[MOC|Marketing Hub]]
