---
tags:
  - marketing
  - videos
  - assets
date: 2026-04-21
status: active
---

# Assets Necesarios para los Videos

> [!warning] Checklist
> Antes de empezar a codear, necesitamos estos assets.

---

## Logo

| Asset | Formato | Notas |
|-------|---------|-------|
| Logo Solennix (completo) | SVG o PNG transparente | Para animaciones de intro/outro |
| Logo Solennix (ícono solo) | SVG o PNG transparente | Para watermark, favicon en mockups |
| Logo con texto horizontal | SVG o PNG transparente | Para cards finales |

**Ubicación:** `remotion/public/logo/`

---

## Screenshots de la App (Web)

Todos los screenshots van en **`remotion/public/screenshots/`**.

> [!tip] Cómo tomarlos
> Usá la app web en `localhost` con **datos realistas** (no vacíos). Navegador en modo responsive si es necesario. Resolución mínima: 1920x1080. Formato PNG.

### Por Video

#### Video 02 — Dashboard
| # | Archivo | Qué mostrar | Listo |
|---|---------|-------------|-------|
| 1 | `dashboard-full.png` | Dashboard completo con KPIs llenos, gráficos, eventos próximos | ⬜ |
| 2 | `dashboard-alerts.png` | Sección "Requieren atención" con alertas | ⬜ |
| 3 | `dashboard-chart.png` | Close-up del gráfico de barras comparativo | ⬜ |

#### Video 03 — Gestión de Clientes
| # | Archivo | Qué mostrar | Listo |
|---|---------|-------------|-------|
| 4 | `client-list.png` | Lista de clientes con búsqueda, varios clientes | ⬜ |
| 5 | `client-detail.png` | Detalle de un cliente con historial, contacto, eventos | ⬜ |

#### Video 04 — Calendario Inteligente
| # | Archivo | Qué mostrar | Listo |
|---|---------|-------------|-------|
| 6 | `calendar-view.png` | Vista mensual del calendario con varios eventos marcados | ⬜ |
| 7 | `calendar-day-detail.png` | Popup/detalle de un día con lista de eventos | ⬜ |

#### Video 05 — Cotizaciones en Segundos
| # | Archivo | Qué mostrar | Listo |
|---|---------|-------------|-------|
| 8 | `quick-quote.png` | Pantalla de cotización rápida con productos agregados | ⬜ |
| 9 | `quote-pdf.png` | PDF de cotización generado (puede ser screenshot del preview) | ⬜ |

#### Video 06 — Control de Pagos
| # | Archivo | Qué mostrar | Listo |
|---|---------|-------------|-------|
| 10 | `payments-tab.png` | Tab de pagos dentro de un evento con pagos registrados | ⬜ |
| 11 | `payment-success.png` | Pantalla de pago exitoso (opcional) | ⬜ |

#### Video 07 — Inventario y Equipamiento
| # | Archivo | Qué mostrar | Listo |
|---|---------|-------------|-------|
| 12 | `inventory-list.png` | Lista de inventario con stocks visibles | ⬜ |
| 13 | `low-stock-alert.png` | Sección de stock bajo en el dashboard | ⬜ |
| 14 | `event-equipment.png` | Tab de equipos asignados a un evento | ⬜ |

#### Video 08 — Staff y Equipos
| # | Archivo | Qué mostrar | Listo |
|---|---------|-------------|-------|
| 15 | `staff-list.png` | Lista de personal con roles | ⬜ |
| 16 | `staff-teams.png` | Equipos de trabajo formados | ⬜ |
| 17 | `event-staff.png` | Staff asignado a un evento específico | ⬜ |

#### Video 09 — Resumen de Evento
| # | Archivo | Qué mostrar | Listo |
|---|---------|-------------|-------|
| 18 | `event-summary-overview.png` | Tab "General" del resumen de evento | ⬜ |
| 19 | `event-financials.png` | Tab "Finanzas" con totales | ⬜ |
| 20 | `event-products.png` | Tab "Productos" con items | ⬜ |
| 21 | `event-contract.png` | Contrato generado (preview) | ⬜ |

#### Video 10 — Portal del Cliente
| # | Archivo | Qué mostrar | Listo |
|---|---------|-------------|-------|
| 22 | `client-portal.png` | Vista del portal que ve el cliente | ⬜ |
| 23 | `share-link.png` | Card de "Compartir portal" con link | ⬜ |

---

## Audio

| Asset | Formato | Notas |
|-------|---------|-------|
| Música de fondo (upbeat, moderna) | MP3 | Royalty-free, ~30 seg. Estilo corporativo/tech |
| Voiceover (opcional) | MP3/WAV | Narración en español neutro |

**Ubicación:** `remotion/public/audio/`

---

## Paleta de Colores

Basada en el design system existente (Tailwind). Confirmar estos valores:

| Token | Hex | Uso |
|-------|-----|-----|
| `--color-primary` | `var(--color-primary)` | Botones, gradientes, acentos |
| `--color-bg` | `var(--color-bg)` | Fondos |
| `--color-card` | `var(--color-card)` | Cards, paneles |
| `--color-text` | `var(--text)` | Texto principal |
| `--color-text-secondary` | `var(--text-secondary)` | Texto secundario |
| `--color-success` | `var(--success)` | Estados positivos |
| `--color-error` | `var(--error)` | Alertas, errores |
| `--color-warning` | `var(--warning)` | Warnings |
| `--color-info` | `var(--info)` | Info |

> [!todo] Pendiente
> Confirmar los valores hex exactos de la paleta para hardcodear en los videos (Remotion no tiene acceso a las CSS vars del proyecto web).

---

## Ver también

- [[01 - Plan de Videos Solennix]]
- [[MOC|Marketing Hub]]
