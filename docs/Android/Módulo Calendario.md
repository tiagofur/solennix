---
tags:
  - android
  - calendario
  - dominio
aliases:
  - Android Calendario
  - CalendarScreen Android
date: 2026-04-27
updated: 2026-04-27
status: active
---

# Módulo Calendario — Android

> [!abstract] Resumen
> Calendario mensual con `LazyVerticalGrid`, status dots, gestión de fechas bloqueadas via bottom sheet + dialogs, status filter chips y layout adaptivo phone/tablet. Faltan: crear evento desde calendario y loading state UI.

> [!warning] Gaps conocidos
> - **Sin crear evento** desde calendario (gap G1)
> - **Loading state sin UI** — campo existe en state pero no se renderiza (gap G2)
> - **Status dots por evento** en vez de por status — inconsistente con overflow (gap G6)
>
> Ver [[../../PRD/21_CALENDAR_PARITY_AUDIT|Audit de Paridad]].

---

## Archivos

| Archivo | Ruta | Líneas |
|---------|------|:------:|
| **CalendarScreen** | `feature/calendar/ui/CalendarScreen.kt` | 1232 |
| **CalendarViewModel** | `feature/calendar/viewmodel/CalendarViewModel.kt` | 274 |
| **Strings es** | `feature/calendar/src/main/res/values/strings.xml` | — |
| **Strings en** | `feature/calendar/src/main/res/values-en/strings.xml` | — |

---

## Features

| # | Feature | Estado | Detalle |
|:-:|---------|:------:|---------|
| 1 | Grid mensual (`LazyVerticalGrid`) | ✅ | 7 columnas, aspect-ratio 1f |
| 2 | Navegación prev/next | ✅ | Arrow IconButtons + month/year label |
| 3 | Botón "Hoy" | ✅ | `OutlinedButton` en header |
| 4 | Day cell visual states (4 estados) | ✅ | Selected / Today / Blocked / Default |
| 5 | Status dots (hasta 3) | ⚠️ | Por evento, NO por status — ver gap G6 |
| 6 | Overflow "+N" badge | ✅ | 8sp, localizado, fórmula por status |
| 7 | Long-press + haptic | ✅ | `combinedClickable` + `HapticFeedback` |
| 8 | Cards de evento | ✅ | Status bar + nombre + servicio + hora + pax + monto |
| 9 | **Status filter chips** | ✅ | 5 `FilterChip`: Todos/Cotizados/Confirmados/Completados/Cancelados |
| 10 | BlockDateDialog | ✅ | `AlertDialog` con razón opcional |
| 11 | UnblockDateDialog | ✅ | `AlertDialog` con razón existente |
| 12 | AddDateRangeDialog | ✅ | 2 DatePickers + validación end >= start |
| 13 | ManageUnavailableDatesSheet | ✅ | `ModalBottomSheet` con lista + delete + add range |
| 14 | Delete confirmation | ✅ | `AlertDialog` por card |
| 15 | Layout adaptivo phone/tablet | ✅ | `isWideScreen` → Row vs LazyColumn, 480dp max tablet |
| 16 | Loading state | ⚠️ | `isLoading` existe en `CalendarUiState` pero **no se consume en UI** |
| 17 | Error handling (Snackbar) | ✅ | 3 typed errors → `SnackbarHost` |
| 18 | Empty states | ✅ | Sin eventos / sin bloqueos |
| 19 | Event click navigation | ✅ | `onEventClick: (String) -> Unit` callback |
| 20 | Search button | ✅ | External callback via top bar |
| 21 | Lifecycle refresh | ✅ | `LifecycleResumeEffect` |
| 22 | Client name resolution | ✅ | Combined flow → map lookup, "Cliente" fallback |
| 23 | i18n (es/en) | ✅ | Full dual-language string resources |
| 24 | **Crear evento** | ❌ | Sin FAB ni botón de creación — ver gap G1 |
| 25 | Retry en error | ❌ | String existe, sin UI action — ver gap G5 |
| 26 | Accesibilidad day cells | ⚠️ | Parcial — icons con description, day cells sin ella |

---

## Layout Adaptivo

```
Tablet (isWideScreen):
┌─────────────────────┬────────────────────────────┐
│   Calendar Grid     │     Selected Date Events    │
│   (max 480dp)       │     (Surface fill)          │
│                     │                             │
└─────────────────────┴────────────────────────────┘

Phone:
┌─────────────────────┐
│   Calendar Grid     │
│   (280dp height)    │
├─────────────────────┤
│   Date Header       │
│   Events / Empty    │
└─────────────────────┘
```

---

## Discrepancia Dots vs Overflow

> [!warning] Bug de consistencia visual
> Los dots se renderizan con `eventsOnDate.take(3)` (primeros 3 eventos), pero el overflow se calcula con `groupBy { it.status }.values.size` (statuses únicos).
>
> **Ejemplo**: 5 eventos todos "confirmed" → 1 dot azul + "+4 mas" ✅ correcto
> **Pero**: 5 eventos de 5 statuses distintos → `take(3)` muestra 3 dots, overflow = 2, total visual = 5 ✅ también correcto
> **Problema**: 4 eventos (2 quoted + 2 confirmed) → `take(3)` muestra 3 dots, overflow = 2 (deduplicado = 2), total visual = 5 ❌ deberían ser 4
>
> **Fix**: cambiar `eventsOnDate.take(3)` por deduplicar por status como iOS/Web.

---

## Gaps vs Web/iOS

| Gap | Prioridad | Referencia |
|-----|:---------:|-----------|
| Sin crear evento desde calendario | 🔴 Alta | [[../../PRD/21_CALENDAR_PARITY_AUDIT#🔴 Alta Prioridad\|G1]] |
| Loading state sin UI | 🔴 Alta | [[../../PRD/21_CALENDAR_PARITY_AUDIT#🔴 Alta Prioridad\|G2]] |
| Sin botón Retry | 🟡 Media | [[../../PRD/21_CALENDAR_PARITY_AUDIT#🟡 Media Prioridad\|G5]] |
| Dots por evento vs status | 🟡 Media | [[../../PRD/21_CALENDAR_PARITY_AUDIT#🟡 Media Prioridad\|G6]] |
| Sin plan limits guard | 🟡 Media | [[../../PRD/21_CALENDAR_PARITY_AUDIT#🟡 Media Prioridad\|G7]] |
| Accesibilidad parcial | 🟢 Baja | [[../../PRD/21_CALENDAR_PARITY_AUDIT#🟢 Baja Prioridad\|G10]] |
| Sin pull-to-refresh | 🟢 Baja | [[../../PRD/21_CALENDAR_PARITY_AUDIT#🟢 Baja Prioridad\|G11]] |

---

## Relaciones

- [[Módulo Eventos]] — Eventos mostrados en calendario
- [[Navegación]] — Destino principal en bottom nav
- [[Manejo de Estado]] — `StateFlow<CalendarUiState>`
- [[Componentes Compartidos]] — `StatusBadge`, `SolennixSectionTopAppBar`
- [[../../PRD/21_CALENDAR_PARITY_AUDIT|Audit de Paridad Calendario]]

#android #calendario #dominio
