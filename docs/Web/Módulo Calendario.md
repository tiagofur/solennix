---
tags:
  - web
  - calendario
  - dominio
aliases:
  - Web Calendario
  - CalendarView Web
date: 2026-04-27
updated: 2026-04-27
status: active
---

# Módulo Calendario — Web

> [!abstract] Resumen
> Vista mensual interactiva con eventos coloreados por status, fechas bloqueadas, context menu (right-click) y creación de eventos con fecha pre-llenada. Construido sobre `react-day-picker`.

> [!warning] Gap conocido
> **Status filter eliminado en FASE 7C** — iOS y Android aún lo tienen. Ver [[../../PRD/21_CALENDAR_PARITY_AUDIT|Audit de Paridad]] gap G4.

---

## Archivos

| Archivo | Ruta | Líneas |
|---------|------|:------:|
| **CalendarView** | `web/src/pages/Calendar/CalendarView.tsx` | 750 |
| **UnavailableDatesModal** | `web/src/pages/Calendar/components/UnavailableDatesModal.tsx` | 283 |
| **i18n es** | `web/src/i18n/locales/es/calendar.json` | 61 |
| **i18n en** | `web/src/i18n/locales/en/calendar.json` | 61 |
| **Tests** | `web/src/pages/Calendar/CalendarView.test.tsx` | 442 |

---

## Features

| # | Feature | Estado | Detalle |
|:-:|---------|:------:|---------|
| 1 | Grid mensual (`react-day-picker`) | ✅ | Celdas 45px, día 32px círculo, locale-aware |
| 2 | Navegación prev/next | ✅ | Built-in DayPicker + reset de selección |
| 3 | Botón "Hoy" | ✅ | `premium-gradient`, `CalendarDays` icon |
| 4 | Selección de fecha (single) | ✅ | `mode="single"`, blue filled circle |
| 5 | Status dots (hasta 3 por status) | ✅ | 5px círculos coloreados, deduplicados por status |
| 6 | Overflow "+N" badge | ✅ | `+N más` cuando events > unique statuses |
| 7 | Right-click → abrir modal bloqueos | ✅ | `onContextMenu` en cada celda |
| 8 | Cards de evento | ✅ | Grid responsivo con nombre, servicio, status, hora, pax, ubicación, teléfono, monto |
| 9 | Event count badge | ✅ | Número junto al heading de fecha seleccionada |
| 10 | Crear evento (link) | ✅ | 2 ubicaciones: empty state + bottom de cards |
| 11 | Fechas bloqueadas visual | ✅ | Strikethrough, gray, `surface-alt` background |
| 12 | Info panel fecha bloqueada | ✅ | Lock icon + rango + razón + botón desbloquear |
| 13 | Confirmación desbloqueo | ✅ | Modal hand-rolled con confirm/cancel |
| 14 | Modal gestionar bloqueos | ✅ | CRUD completo: listar, agregar rango, eliminar |
| 15 | Botón toolbar "Gestionar Bloqueos" | ✅ | Outlined con Lock icon |
| 16 | Error handling + retry | ✅ | Banner con AlertTriangle + botón reintentar |
| 17 | Loading state | ✅ | Overlay semi-transparente con spinner |
| 18 | Keyboard navigation | ✅ | Enter/Space en cards, focus-visible ring |
| 19 | i18n (es/en) | ✅ | react-i18next + date-fns locale |
| 20 | Empty states (3 tipos) | ✅ | Sin fecha / sin eventos / fecha bloqueada |
| 21 | Multi-day block ranges | ✅ | `start_date` + `end_date` model |
| 22 | Query cache management | ✅ | React Query invalidation per month |
| 23 | ~~Status filter~~ | ❌ REMOVED | Eliminado en FASE 7C — ver nota arriba |

---

## Servicio API

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `getByDateRange(from, to)` | GET `/api/events?start=&end=` | Eventos en rango |
| `getDates(from, to)` | GET `/api/unavailable-dates` | Fechas bloqueadas en rango |
| `addDates(data)` | POST `/api/unavailable-dates` | Bloquear rango de fechas |
| `removeDate(id)` | DELETE `/api/unavailable-dates/:id` | Desbloquear fecha |

---

## Arquitectura

```
CalendarView.tsx
├── Estado: React Query (events + unavailable dates)
├── Grid: react-day-picker (DayPicker mode="single")
├── Right panel: event cards / blocked info / empty state
├── Modals:
│   ├── UnavailableDatesModal (CRUD bloqueos)
│   └── Unblock confirmation (inline modal)
└── Cache: queryKeys.events.dateRange(start, end)
```

---

## Gaps vs iOS/Android

| Gap | Referencia |
|-----|-----------|
| Status filter eliminado | [[../../PRD/21_CALENDAR_PARITY_AUDIT#❌ Gaps de Paridad\|G4]] |
| Sin plan limits guard al crear | [[../../PRD/21_CALENDAR_PARITY_AUDIT#❌ Gaps de Paridad\|G7]] |
| Sin Quick Quote | Exclusivo iOS — baja prioridad |

---

## Relaciones

- [[Módulo Eventos]] — Eventos mostrados en el calendario
- [[Capa de Servicios]] — `unavailableDatesService`
- [[Componentes Compartidos]] — react-day-picker como base
- [[Hooks Personalizados]] — `usePlanLimits`, `useEventsByDateRange`
- [[../../PRD/21_CALENDAR_PARITY_AUDIT|Audit de Paridad Calendario]]

#web #calendario #dominio
