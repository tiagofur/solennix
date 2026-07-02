---
tags:
  - prd
  - dashboard
  - refactor
  - plan
aliases:
  - Dashboard Refactor Plan
  - Plan Dashboard
date: 2026-04-05
updated: 2026-04-27
status: planned
---

# 🏗️ Plan de Refactor del Dashboard

> [!abstract] Resumen
> Unificar el Dashboard en las 6 plataformas (iPhone, iPad, Android Phone, Android Tab, Web Desktop, Web Mobile) para lograr paridad total. El Dashboard es la primera pantalla que ve el usuario — debe ser informativo, accionable y consistente.

> [!info] Estado
> Plan aprobado. Pendiente de ejecución. Las decisiones de este documento son vinculantes para el sprint correspondiente.

---

## Decisiones Aprobadas

| Decisión | Resultado |
|----------|-----------|
| Quick Actions en Dashboard | Solo 2: Nuevo Evento + Nuevo Cliente |
| Banner "Eventos que requieren atención" | Sí, agregar a iOS y Web (Android ya lo tiene) |
| Orden de secciones (phone scroll) | Alertas primero: Saludo → Alertas → KPIs → Quick Actions → Charts → Stock → Eventos |

---

## Estructura Final del Dashboard

### Orden de secciones

```
┌─────────────────────────────────────────────────┐
│ 1. HEADER — Saludo + Fecha                      │
├─────────────────────────────────────────────────┤
│ 2. ONBOARDING CHECKLIST (solo si no completado) │
├─────────────────────────────────────────────────┤
│ 3. PLAN LIMITS BANNER (solo si plan básico)     │
├─────────────────────────────────────────────────┤
│ 4. ALERTAS — Eventos que requieren atención     │
├─────────────────────────────────────────────────┤
│ 5. KPI CARDS (8 tarjetas)                       │
├─────────────────────────────────────────────────┤
│ 6. QUICK ACTIONS (2 botones)                    │
├─────────────────────────────────────────────────┤
│ 7. CHARTS (Status + Financiero)                 │
├─────────────────────────────────────────────────┤
│ 8. ALERTAS DE STOCK BAJO                        │
├─────────────────────────────────────────────────┤
│ 9. PRÓXIMOS EVENTOS (hasta 5)                   │
└─────────────────────────────────────────────────┘
```

---

### 1. Header — Saludo + Fecha

| Aspecto | iPhone | iPad | Android Phone | Android Tab | Web Desktop | Web Mobile |
|---------|:------:|:----:|:-------------:|:-----------:|:-----------:|:----------:|
| Saludo | ✅ | ✅ | 🚧 AGREGAR | ✅ | ✅ | ✅ |
| Fecha | ✅ | ✅ | 🚧 AGREGAR | ✅ | ✅ | ✅ |
| Botones acción | 🗑️ Remover | 🗑️ Remover | 🗑️ Remover | 🗑️ Remover | 🗑️ Remover | 🗑️ Remover |

### 2. Onboarding Checklist (condicional)

Mostrar solo si el usuario no completó la configuración inicial (≥1 cliente, ≥1 producto, ≥1 evento).

| Plataforma | Estado | Cambio |
|------------|:------:|--------|
| iOS | ✅ Existe | Verificar criterios |
| Android | ❌ No existe | CREAR componente inline |
| Web | ✅ Existe | Verificar criterios |

### 3. Plan Limits Banner (condicional)

Ya existe en las 3 plataformas. Verificar consistencia del mensaje y estilo.

### 4. Alertas — Eventos que Requieren Atención 🔴

> [!important] Widget más importante del Dashboard para el organizador

**Criterios:**
1. **Pago pendiente**: Eventos confirmados con fecha ≤ 7 días, NO completamente pagados
2. **Evento vencido**: Eventos con fecha pasada en estado "Cotizado" o "Confirmado"
3. **Sin confirmar**: Eventos cotizados con fecha ≤ 14 días, no confirmados

| Plataforma | Estado | Cambio |
|------------|:------:|--------|
| iOS | ❌ No existe | CREAR widget completo |
| Android | ✅ `PendingEventsBanner` | Agregar criterio "Sin confirmar" |
| Web | ❌ No existe | CREAR widget completo |

### 5. KPI Cards (8 tarjetas)

| # | KPI | Icono | Color |
|---|-----|-------|-------|
| 1 | Ventas Netas | TrendingUp | Verde |
| 2 | Cobrado (mes) | DollarSign | Naranja/Dorado |
| 3 | IVA Cobrado | FileCheck | Azul |
| 4 | IVA Pendiente | AlertTriangle | Rojo |
| 5 | Eventos del Mes | Calendar | Naranja |
| 6 | Stock Bajo | Package | Naranja/Verde |
| 7 | Clientes | Users | Azul |
| 8 | Cotizaciones Pendientes | FileText | Naranja |

> [!note] Unificaciones pendientes
> - Nombres: Android dice "Ventas del Mes" → usar "Ventas Netas" en todas
> - Subtítulos: Web tiene los mejores, con links a secciones → replicar en iOS/Android tablets

### 6. Quick Actions (2 botones)

| # | Acción | Icono | Color |
|---|--------|-------|-------|
| 1 | Nuevo Evento | Plus | Dorado (primary) |
| 2 | Nuevo Cliente | UserPlus | Azul (info) |

> [!warning] Reducir de 4 a 2 en iPad/Android Tablet/Web
> Remover Quick Quote y Search de Quick Actions en todas las plataformas.

### 7. Charts (2 gráficos)

- **Chart 1**: Distribución de Eventos por Estado (stacked bar)
- **Chart 2**: Comparación Financiera (barras horizontales)

Ya consistentes entre plataformas. Verificar colores y labels idénticos.

### 8. Alertas de Stock Bajo

Ya existe en las 3 plataformas. Verificar estilo consistente.

### 9. Próximos Eventos (hasta 5)

| Plataforma | Cambio pendiente |
|------------|-----------------|
| iOS | Agregar dropdown/menú para cambiar estado inline |
| Android | ✅ Completo |
| Web | ✅ Completo |

---

## Layout Adaptivo

### Phone (iPhone, Android Phone, Web Mobile <1024px)

```
┌──────────────────────┐
│ Header (saludo+fecha)│
├──────────────────────┤
│ [Onboarding]         │  ← condicional
├──────────────────────┤
│ [Plan Limits]        │  ← condicional
├──────────────────────┤
│ [Alertas Atención]   │  ← condicional
├──────────────────────┤
│ KPIs ←scroll horiz→  │
├──────────────────────┤
│ [Evento] [Cliente]   │  ← quick actions
├──────────────────────┤
│ Chart: Status        │
├──────────────────────┤
│ Chart: Financiero    │
├──────────────────────┤
│ Stock Bajo (lista)   │
├──────────────────────┤
│ Próximos Eventos     │
└──────────────────────┘
```

### Tablet/Desktop (iPad, Android Tab, Web Desktop ≥1024px)

```
┌─────────────────────────────────────────────────┐
│ Header (saludo + fecha)                         │
├─────────────────────────────────────────────────┤
│ [Onboarding Checklist - full width]             │
├─────────────────────────────────────────────────┤
│ [Plan Limits Banner - full width]               │
├─────────────────────────────────────────────────┤
│ [Alertas de Atención - full width]              │
├─────────────────────────────────────────────────┤
│ KPI  │ KPI  │ KPI  │ KPI                        │
├──────┼──────┼──────┼──────┤                     │
│ KPI  │ KPI  │ KPI  │ KPI  │                     │
├──────────────┼─────────────┤                    │
│ [Evento]     │ [Cliente]   │ ← quick actions    │
├──────────────┼─────────────┤                    │
│ Chart:       │ Chart:      │                    │
│ Status       │ Financiero  │                    │
├──────────────┼─────────────┤                    │
│ Stock Bajo   │ Próximos    │                    │
│ (2-col grid) │ Eventos     │                    │
└──────────────┴─────────────┘
```

---

## Cambios por Plataforma

### iOS

| Cambio | Archivo(s) |
|--------|-----------|
| Remover botones Quick Quote y Search del header | `DashboardView.swift` |
| Reducir Quick Actions de 4 a 2 en iPad | `DashboardView.swift` |
| CREAR widget "Alertas de Atención" | Nuevo: `AttentionEventsCard.swift` + lógica en ViewModel |
| Mover Alertas arriba de KPIs | `DashboardView.swift` (reordenar) |
| Agregar dropdown estado en Próximos Eventos | `UpcomingEventsSection` |
| Agregar links en subtítulos de KPIs (iPad) | `KPICard.swift` |

### Android

| Cambio | Archivo(s) |
|--------|-----------|
| Agregar saludo y fecha en Phone | `DashboardScreen.kt` |
| Remover botones del header tablet | `DashboardScreen.kt` |
| Reducir Quick Actions de 4 a 2 en tablet | `DashboardScreen.kt` |
| Agregar criterio "Sin confirmar 14 días" | `DashboardViewModel.kt` |
| Agregar Onboarding Checklist inline | Nuevo componente |
| Unificar "Ventas del Mes" → "Ventas Netas" | `DashboardScreen.kt` |

### Web

| Cambio | Archivo(s) |
|--------|-----------|
| Remover 3 iconos de acción del header | `Dashboard.tsx` |
| Reducir Quick Actions de 4 a 2 | `Dashboard.tsx` |
| CREAR widget "Alertas de Atención" | Nuevo componente |
| Reordenar: Alertas arriba de KPIs | `Dashboard.tsx` |

### Backend

| Cambio | Archivo(s) |
|--------|-----------|
| Verificar que `/api/dashboard` devuelva data para alertas | `handler/dashboard.go` |
| Si no existe: agregar campo `attention_events` | `handler/dashboard.go`, `model/` |

---

## Relaciones

- [[11_CURRENT_STATUS|Estado Actual]] — Implementación actual del Dashboard
- [[02_FEATURES|Catálogo de Features]] — Features del Dashboard
- [[09_ROADMAP|Roadmap Maestro]] — Sprint planning
- [[../Web/Módulo Admin|Web: Módulo Admin]] — Dashboard Web actual

#prd #dashboard #refactor #plan
