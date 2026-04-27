---
tags:
  - ios
  - calendario
  - dominio
aliases:
  - iOS Calendario
  - CalendarView iOS
date: 2026-04-27
updated: 2026-04-27
status: active
---

# Módulo Calendario — iOS

> [!abstract] Resumen
> Calendario mensual nativo SwiftUI con `LazyVGrid`, status dots por día, gestión de fechas bloqueadas via sheets, creación de eventos desde toolbar y Quick Quote. Layout adaptivo iPad/iPhone.

> [!bug] Bug conocido
> **Syntax error en CalendarViewModel.swift líneas 232-235** — código huérfano duplicado que genera compile error. Ver [[../../PRD/21_CALENDAR_PARITY_AUDIT#🔴 Alta Prioridad|G3]].

---

## Archivos

| Archivo | Ruta | Rol |
|---------|------|-----|
| **CalendarView** | `SolennixFeatures/Calendar/Views/CalendarView.swift` | Vista principal |
| **CalendarGridView** | `SolennixFeatures/Calendar/Views/CalendarGridView.swift` | Grid de días |
| **CalendarViewModel** | `SolennixFeatures/Calendar/ViewModels/CalendarViewModel.swift` | Estado y lógica |
| **BlockDateSheet** | `SolennixFeatures/Calendar/Views/BlockDateSheet.swift` | Sheet bloquear fecha |
| **BlockedDatesSheet** | `SolennixFeatures/Calendar/Views/BlockedDatesSheet.swift` | Sheet gestionar bloqueos + AddBlockSheet anidado |

---

## Features

| # | Feature | Estado | Detalle |
|:-:|---------|:------:|---------|
| 1 | Grid mensual (`LazyVGrid`) | ✅ | 7 columnas flexibles, locale-aware weekday headers |
| 2 | Navegación prev/next | ✅ | Chevrons con animación `.easeInOut(0.25)` |
| 3 | Botón "Hoy" (toolbar) | ✅ | `.subheadline`, semibold, primary color |
| 4 | Selección de fecha (single) | ✅ | Círculo filled primary + blanco |
| 5 | Status dots (hasta 3 por status) | ✅ | `HStack` de 6x6pt circles, deduplicados por status |
| 6 | Overflow "+N" badge | ✅ | 8pt font, localizado |
| 7 | Long-press (0.5s) + haptic | ✅ | Bloquear/desbloquear según estado |
| 8 | Cards de evento | ✅ | NavigationLink → EventDetail |
| 9 | **Status filter (Menu)** | ✅ | 5 opciones con checkmark en activo |
| 10 | Alert desbloquear fecha | ✅ | Native Alert con Cancel/Destructive |
| 11 | BlockDateSheet | ✅ | Fecha inicio (read-only) + end DatePicker + razón |
| 12 | BlockedDatesSheet | ✅ | Lista de bloqueos + delete + empty state |
| 13 | AddBlockSheet (nested) | ✅ | Dos DatePickers + validación end >= start |
| 14 | **Crear evento (Menu)** | ✅ | NavigationLink con fecha pre-llenada |
| 15 | **Quick Quote** | ✅ | Sheet con `QuickQuoteView` |
| 16 | Loading state | ✅ | `ProgressView` `.controlSize(.large)` |
| 17 | Pull-to-refresh | ✅ | `.refreshable` modifier |
| 18 | Error handling | ✅ | 3 typed errors → native Alert |
| 19 | iPad split layout | ✅ | HStack: grid (max 560pt) + Divider + events |
| 20 | iPhone single column | ✅ | ScrollView vertical stack |
| 21 | Plan limits guard | ✅ | `.disabled` cuando `canCreateEvent == false` |
| 22 | Accesibilidad | ✅ | Labels en toolbar buttons, reduceMotion check |
| 23 | Client name resolution | ✅ | `clientMap` dictionary O(1) lookup |
| 24 | Empty states | ✅ | Sin eventos / sin bloqueos |

---

## Layout Adaptivo

```
iPad (sizeClass == .regular, landscape):
┌─────────────────────┬────────────────────┐
│   Calendar Grid     │    Events List     │
│   (max 560pt)       │    (scrollable)    │
│                     │                    │
└─────────────────────┴────────────────────┘

iPhone:
┌─────────────────────┐
│   Calendar Grid     │
│                     │
├─────────────────────┤
│   Selected Date     │
│   Events / Empty    │
└─────────────────────┘
```

---

## Toolbar Actions

| Botón | Icon | Acción |
|-------|------|--------|
| Crear | `plus` | Menu: Nuevo Evento + Quick Quote |
| Filtrar | `line.3.horizontal.decrease.circle` | Menu con 5 status options |
| Bloqueos | `lock` | Present `BlockedDatesSheet` |
| Hoy | Text "Hoy" | `goToToday()` |

---

## Gaps vs Web/Android

| Gap | Referencia |
|-----|-----------|
| Syntax error CalendarViewModel | [[../../PRD/21_CALENDAR_PARITY_AUDIT#🔴 Alta Prioridad\|G3]] |
| Sin botón Retry en error | [[../../PRD/21_CALENDAR_PARITY_AUDIT#🟡 Media Prioridad\|G5]] |
| Sin event count badge | [[../../PRD/21_CALENDAR_PARITY_AUDIT#🟢 Baja Prioridad\|G9]] |

---

## Relaciones

- [[Módulo Eventos]] — Eventos mostrados en calendario
- [[Navegación]] — Tab principal + NavigationLink routes
- [[Manejo de Estado]] — CalendarViewModel `@Observable`
- [[Capa de Red]] — API client para events + unavailable dates
- [[../../PRD/21_CALENDAR_PARITY_AUDIT|Audit de Paridad Calendario]]

#ios #calendario #dominio
