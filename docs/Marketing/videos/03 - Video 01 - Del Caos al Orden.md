---
tags:
  - marketing
  - video
  - v01
date: 2026-04-21
status: concept
duration: 30s
screenshots: none
---

# V01 — Del Caos al Orden

> [!quote] Mensaje clave
> "Todo tu negocio de eventos. Una sola app. Cero caos."

---

## Objetivo

Video hook principal. No muestra una feature específica sino el **dolor del organizador** y la solución integral. Funciona como trailer de la app.

## Audiencia

Organizadores de eventos que usan Excel + WhatsApp + Google Calendar + papel para gestionar su negocio.

## Formato

- **Vertical:** 1080x1920 (Reels/TikTok/Shorts)
- **Horizontal:** 1920x1080 (YouTube/LinkedIn)

---

## Storyboard

### Escena 1: El Caos (Frames 0-90 / 0-3s)

- Fondo oscuro con efecto de "escritorio desordenado"
- Iconos flotando con movimiento errático:
  - Excel (hoja de cálculo verde)
  - WhatsApp (burbuja verde)
  - Google Calendar (calendario)
  - Papel con notas escritas a mano
  - Carpeta de archivos
  - Teléfono sonando
- Sonido: caótico, múltiples notificaciones

### Escena 2: El Vórtice (Frames 90-180 / 3-6s)

- Todos los iconos se acercan al centro con efecto de absorción
- Rotación + escala decreciente
- Efecto visual de "remolino"

### Escena 3: La Revelación (Frames 180-300 / 6-10s)

- Explosión suave (spring animation)
- Logo de Solennix aparece en el centro con escala elástica
- Tagline aparece con typewriter: "Todo tu negocio de eventos. Una sola app."

### Escena 4: Mosaico (Frames 300-540 / 10-18s)

- 4 screenshots aparecen en cuadrícula 2x2 con slide-in escalonado:
  - Dashboard
  - Calendario
  - Clientes
  - Cotización
- Cada uno se destaca brevemente con zoom suave

### Escena 5: CTA (Frames 540-900 / 18-30s)

- Texto: "Cero caos. Cero Excel. Cero papel."
- Aparece logo + "Probá gratis → solennix.com"
- Badges App Store + Google Play

---

## Assets — Inventario

### Ya tenemos

| Asset | Ubicación | Estado |
|-------|-----------|--------|
| Logo Solennix (icono, SVG) | `marketing/logos/svg/solennix-icon-final-filled.svg` | ✅ Listo |
| Logo horizontal (SVG) | `marketing/logos/svg/solennix-logo-horizontal.svg` | ✅ Listo |
| Logo vertical (SVG) | `marketing/logos/svg/solennix-logo-vertical.svg` | ✅ Listo |
| Wordmark dorado (SVG) | `marketing/logos/svg/solennix-wordmark-dark.svg` | ✅ Listo |
| Logo PNG (transparente) | `marketing/logos/png/transparent/` | ✅ Listo |
| Logo PNG (dark bg) | `marketing/logos/png/dark-bg/` | ✅ Listo |
| Logo PNG (social media) | `marketing/logos/png/social-media/` | ✅ Listo |
| Paleta de colores | `marketing/brand-manual/BRAND-MANUAL.md` | ✅ Listo |
| Screenshot Dashboard | `marketing/ios_screens/final/iphone/01-dashboard.png` | ✅ Listo |
| Screenshot Calendario | `marketing/ios_screens/final/iphone/02-calendario.png` | ✅ Listo |
| Screenshot Clientes | `marketing/ios_screens/final/iphone/06-clientes.png` | ✅ Listo |
| Screenshot Eventos lista | `marketing/ios_screens/final/iphone/03-eventos-lista.png` | ✅ Listo |
| Screenshot Evento detalle | `marketing/ios_screens/final/iphone/04-evento-detalle.png` | ✅ Listo |
| Screenshot Pagos | `marketing/ios_screens/final/iphone/05-evento-pagos.png` | ✅ Listo |
| Screenshot Inventario | `marketing/ios_screens/final/iphone/09-inventario.png` | ✅ Listo |

### Faltante — solo esto necesitamos

| Asset | Formato | Uso | Urgencia |
|-------|---------|-----|----------|
| Icono Excel (hoja verde) | SVG o PNG | Escena "El Caos" — representa el spreadsheet | 🔴 Necesario |
| Icono WhatsApp (burbuja verde) | SVG o PNG | Escena "El Caos" — representa los mensajes | 🔴 Necesario |
| Icono Google Calendar | SVG o PNG | Escena "El Caos" — representa la agenda desordenada | 🔴 Necesario |
| Icono Papel/Notas | SVG o PNG | Escena "El Caos" — representa notas a mano | 🔴 Necesario |
| Icono Carpeta de archivos | SVG o PNG | Escena "El Caos" — representa archivos sueltos | 🟡 Opcional |
| Música de fondo | MP3 royalty-free | Todo el video | 🟡 Opcional |

> [!tip] Dónde conseguir los iconos faltantes
> - **Opción 1 (gratis):** Descargar SVGs de [Simple Icons](https://simpleicons.org/) — tienen Microsoft Excel, WhatsApp, Google Calendar
> - **Opción 2 (gratis):** [Lucide Icons](https://lucide.dev/) para el papel y carpeta (ya usamos Lucide en el proyecto)
> - **Opción 3:** Yo puedo generarlos con SVG inline directamente en el componente de Remotion — **no necesitás descargar nada**, los dibujo en código

> [!important] Conclusión
> **Prácticamente estamos listos para empezar V01.** Los iconos del "caos" los puedo generar en SVG inline dentro del componente React. Las screenshots de iOS + los logos cubren todo lo demás.

---

## Paleta de Colores (del Brand Manual)

| Color | HEX | Uso en video |
|-------|-----|-------------|
| Navy | `#1B2A4A` | Fondos principales, textos |
| Dorado | `#C4A265` | Acentos, gradientes, highlights |
| Crema | `#F5F0E8` | Texto sobre oscuro, fondos claros |
| Dark Navy | `#0F1A2E` | Fondos profundos, gradientes |
| Dorado Claro | `#D4B87A` | Highlights |
| Gris Suave | `#6B7B8D` | Texto secundario |

## Notas Técnicas

- Escena 1 (Caos): iconos SVG inline — no necesitamos archivos externos
- Escena 2 (Vórtice): `interpolate()` con `translateX/Y` + `rotate` hacia centro
- Escena 3 (Revelación): `spring()` con `damping: 12` para logo reveal
- Escena 4 (Mosaico): `<Img>` con screenshots de `marketing/ios_screens/final/iphone/`
- Escena 5 (CTA): `<Img>` con logos de App Store/Play Store de `marketing/logos/png/`
- `TransitionSeries` con `fade()` entre escenas
- Fondo: `#0F1A2E` (Dark Navy) — coherente con brand manual
- Screenshots son de iPhone (vertical) — perfecto para formato Reels/TikTok 9:16

---

## Redes Sociales & Promoción

### Descripción sugerida
¿Sentís que tu negocio de eventos es un caos de Excels, WhatsApp y papeles? 🌪️ Descubrí Solennix, la plataforma todo-en-uno diseñada para organizadores que quieren retomar el control. Del caos al orden, en un solo lugar.

### Hashtags
#Solennix #EventPlanner #OrganizacionDeEventos #EventosLATAM #GestionDeNegocios #AdiosExcel #PlannerCommunity

### Música sugerida
- **Estilo:** Cinematic Tech / Hybrid Orchestral.
- **Evolución:** Debe empezar con sonidos tensos y rítmicos (caos) y hacer un "drop" a un beat limpio y moderno cuando aparece el logo.

---

## Ver también

- [[01 - Plan de Videos Solennix|Plan General]]
- [[02 - Assets Necesarios]]
- [[MOC|Marketing Hub]]
