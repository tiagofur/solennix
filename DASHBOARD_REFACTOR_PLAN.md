# Solennix — Plan de Refactor del Dashboard

## Resumen

Unificar el Dashboard en las 6 plataformas para lograr paridad total. El Dashboard es la primera pantalla que ve el usuario al abrir la app — debe ser informativo, accionable y consistente.

---

## Decisiones Aprobadas

| Decisión | Resultado |
|----------|-----------|
| Quick Actions en Dashboard | Solo 2: Nuevo Evento + Nuevo Cliente |
| Banner "Eventos que requieren atención" | Sí, agregar a iOS y Web (Android ya lo tiene) |
| Orden de secciones (phone scroll) | Alertas primero: Saludo → Alertas → KPIs → Quick Actions → Charts → Stock → Eventos |

---

## Estructura Final del Dashboard

### Orden de secciones (scroll vertical en phones, layout adaptivo en tablets/desktop)

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

### 1. HEADER — Saludo + Fecha

**Contenido:**
- Saludo: "Hola, [Nombre]" (usar primer nombre del usuario)
- Fecha: formato largo localizado. Ej: "Sábado, 28 de marzo de 2026"
- Sin iconos de acción (búsqueda ya está en topbar, cotización rápida en FAB)

**Paridad:**

| Aspecto | iPhone | iPad | Android Phone | Android Tab | Web Desktop | Web Mobile |
|---------|--------|------|---------------|-------------|-------------|------------|
| Saludo | ✓ | ✓ | ✓ (AGREGAR) | ✓ | ✓ | ✓ |
| Fecha | ✓ | ✓ | ✓ (AGREGAR) | ✓ | ✓ | ✓ |
| Botones acción | ✗ Remover | ✗ Remover | ✗ Remover | ✗ Remover | ✗ Remover | ✗ Remover |

**Cambios necesarios:**
- **iOS**: Remover botones Quick Quote y Search del header (ya viven en FAB y topbar)
- **Android Phone**: Agregar saludo y fecha (actualmente solo aparecen en tablet)
- **Android Tablet**: Remover botones Quick Quote y Search del header
- **Web**: Remover los 3 iconos de acción del header (Quick Quote, Search, Refresh). El refresh puede ser pull-to-refresh o un botón sutil

---

### 2. ONBOARDING CHECKLIST (condicional)

**Mostrar solo si:** el usuario no ha completado la configuración inicial.
**Criterios de completitud:** tiene al menos 1 cliente, 1 producto, y 1 evento.

**Contenido:**
- Progreso visual (barra o pasos)
- Checklist con items:
  - ☐ Configura tu negocio (nombre, logo, datos)
  - ☐ Agrega tu primer cliente
  - ☐ Crea tu primer producto/servicio
  - ☐ Crea tu primer evento
- Cada item es tocable y navega a la sección correspondiente

**Paridad:**

| Plataforma | Estado actual | Cambio |
|------------|---------------|--------|
| iOS | ✓ Existe | Verificar criterios coincidan |
| Android | ✗ Flujo separado | AGREGAR componente inline en Dashboard |
| Web | ✓ Existe | Verificar criterios coincidan |

---

### 3. PLAN LIMITS BANNER (condicional)

**Mostrar solo si:** usuario está en plan básico/gratuito y se acerca al límite.
**Contenido:** Mensaje breve + botón "Actualizar Plan"

**Paridad:** Ya existe en las 3 plataformas. Solo verificar consistencia del mensaje y estilo.

---

### 4. ALERTAS — Eventos que Requieren Atención (NUEVO en iOS y Web)

**Este es el widget más importante del Dashboard para el organizador de eventos.**

**Mostrar si:** hay eventos que necesitan acción inmediata del usuario.

**Criterios (tomar lógica de Android y expandir):**
1. **Pago pendiente**: Eventos confirmados con fecha dentro de los próximos 7 días que NO están completamente pagados
2. **Evento vencido**: Eventos con fecha ya pasada que siguen en estado "Cotizado" o "Confirmado" (no se marcaron como completados)
3. **Sin confirmar**: Eventos cotizados con fecha dentro de los próximos 14 días que no han sido confirmados por el cliente

**Diseño del widget:**
- Título: "Requieren atención" con badge de cantidad (ej: "3")
- Icono de alerta (amarillo/naranja)
- Lista de eventos, cada uno mostrando:
  - Nombre del evento / tipo de servicio
  - Fecha del evento
  - Razón de la alerta (badge): "Pago pendiente" | "Evento vencido" | "Sin confirmar"
  - Monto pendiente (si aplica)
- Cada item es tocable → navega al detalle del evento
- Si no hay alertas: NO mostrar el widget (no mostrar "todo bien", simplemente omitir)

**Paridad:**

| Plataforma | Estado actual | Cambio |
|------------|---------------|--------|
| iOS | ✗ No existe | CREAR widget completo |
| Android | ✓ Existe (PendingEventsBanner) | Ajustar criterios, agregar "Sin confirmar" |
| Web | ✗ No existe | CREAR widget completo |

**Archivos a modificar:**
- **iOS**: Crear componente `AttentionEventsCard` en Dashboard/Views/, agregar al DashboardView, agregar lógica al DashboardViewModel
- **Android**: Actualizar PendingEventsBanner para agregar criterio "Sin confirmar" (14 días)
- **Web**: Crear componente `AttentionEventsCard` en Dashboard.tsx o componente separado, agregar lógica al Dashboard
- **Backend**: Verificar que el endpoint de dashboard ya devuelva la info necesaria. Si no, agregar campo `attention_events` o crear endpoint `/api/dashboard/attention`

---

### 5. KPI CARDS (8 tarjetas)

Los 8 KPIs ya son idénticos en las 3 plataformas. Solo hay que unificar detalles:

| # | KPI | Icono | Color | Subtítulo |
|---|-----|-------|-------|-----------|
| 1 | Ventas Netas | dollarsign / TrendingUp | Verde | "Eventos confirmados y completados" |
| 2 | Cobrado (mes) | banknote / DollarSign | Naranja/Dorado | "Este mes" |
| 3 | IVA Cobrado | percent / FileCheck | Azul | "Proporcional al % pagado" |
| 4 | IVA Pendiente | exclamationmark / AlertTriangle | Azul/Rojo | "Por cobrar" |
| 5 | Eventos del Mes | calendar / Calendar | Naranja | Cantidad |
| 6 | Stock Bajo | archivebox / Package | Naranja (si hay) / Verde (si no) | "X ítems bajos" o "Todo en orden" |
| 7 | Clientes | person.2 / Users | Azul | "Total" |
| 8 | Cotizaciones Pendientes | doc.text.badge.clock / FileText | Naranja | "Pendientes de confirmar" |

**Layout por form factor:**

| Form Factor | Layout KPIs |
|-------------|-------------|
| iPhone | Scroll horizontal (2 visibles, deslizar para ver más) |
| Android Phone | Scroll horizontal (2 visibles) |
| Web Mobile | Grid 2 columnas |
| iPad | Grid 4 columnas |
| Android Tablet | Grid 4 columnas |
| Web Desktop | Grid 4 columnas |

**Cambios necesarios:**
- Unificar subtítulos entre plataformas (Web tiene los mejores, con links a secciones)
- **Agregar links en subtítulos a iOS y Android** como tiene Web: "Eventos del Mes" → link "Ver calendario", "Stock Bajo" → link "Ver inventario", etc. (solo en tablets, en phones queda muy pequeño)
- Unificar nombres exactos de KPIs entre plataformas (Android dice "Ventas del Mes", iOS dice "Ventas Netas", Web dice "Ventas netas" — usar "Ventas Netas" en todas)

---

### 6. QUICK ACTIONS (2 botones)

**Solo 2 acciones — las más frecuentes:**

| # | Acción | Icono | Color acento |
|---|--------|-------|-------------|
| 1 | Nuevo Evento | plus.circle / Plus | Dorado (primary) |
| 2 | Nuevo Cliente | person.badge.plus / UserPlus | Azul (info) |

**Layout:**
- Phones: 2 botones en fila horizontal, ancho igual
- Tablets/Desktop: 2 botones en fila horizontal, ancho fijo (no llenar toda la pantalla)

**Cambios necesarios:**
- **iOS iPhone**: Ya tiene 2 — verificar que sean estos exactos
- **iOS iPad**: Reducir de 4 a 2 (remover Quick Quote y Search)
- **Android Phone**: Ya tiene 2 — verificar
- **Android Tablet**: Reducir de 4 a 2
- **Web**: Reducir de 4 a 2 (remover Quick Quote y Search)

---

### 7. CHARTS (2 gráficos)

**Chart 1: Distribución de Eventos por Estado**
- Tipo: Barra horizontal segmentada (stacked bar)
- Segmentos: Cotizado (gris), Confirmado (azul), Completado (verde), Cancelado (rojo)
- Mostrar: conteo y porcentaje por segmento
- Leyenda debajo

**Chart 2: Comparación Financiera**
- Tipo: Barras horizontales comparativas
- Barras: Ventas Netas (verde), Cobrado Real (dorado), IVA por Cobrar (rojo)
- Tooltip con montos formateados en MXN

**Layout:**

| Form Factor | Layout Charts |
|-------------|---------------|
| Phones | Apilados (uno debajo del otro) |
| Tablets/Desktop | Side by side (2 columnas) |

**Estado actual:** Ya son consistentes entre plataformas. Solo verificar colores y labels idénticos.

---

### 8. ALERTAS DE STOCK BAJO

**Mostrar si:** hay items de inventario con stock actual ≤ stock mínimo.

**Contenido:**
- Título: "Inventario Crítico" con badge de cantidad
- Link "Ver todo" → navega a Inventario
- Lista de items: nombre, stock actual / stock mínimo, unidad
- Si no hay items bajos: NO mostrar sección

**Layout:**

| Form Factor | Layout |
|-------------|--------|
| Phones | Lista vertical, 1 columna |
| Tablets/Desktop | Grid 2 columnas |

**Paridad:** Ya existe en las 3 plataformas. Verificar estilo consistente.

---

### 9. PRÓXIMOS EVENTOS (hasta 5)

**Contenido por cada evento:**
- Date box: día y mes (formato compacto)
- Nombre del evento / tipo de servicio
- Nombre del cliente
- Número de personas (pax)
- Badge de estado: Cotizado | Confirmado | Completado | Cancelado
- Dropdown para cambiar estado inline (Web y Android lo tienen, iOS debería tenerlo)

**Si no hay eventos:** Mostrar empty state con icono + "No hay eventos próximos" + botón "Crear evento"

**Cambio necesario:**
- **iOS**: Agregar dropdown/menú para cambiar estado inline como tienen Android y Web

---

## Layout Adaptivo (Phone vs Tablet/Desktop)

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

Todo en scroll vertical, ancho completo.

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
│  1   │  2   │  3   │  4                         │
├──────┼──────┼──────┼──────┤                     │
│ KPI  │ KPI  │ KPI  │ KPI  │                     │
│  5   │  6   │  7   │  8   │                     │
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

Stock Bajo y Próximos Eventos side-by-side en tablets, apilados en phone.

---

## Resumen de Cambios por Plataforma

### iOS

| Cambio | Archivo(s) |
|--------|------------|
| Remover botones Quick Quote y Search del header | DashboardView.swift |
| Agregar saludo en todas las variantes (ya existe) | Verificar |
| Reducir Quick Actions de 4 a 2 en iPad | DashboardView.swift |
| CREAR widget "Alertas de Atención" | Nuevo: AttentionEventsCard.swift + lógica en ViewModel |
| Mover sección Alertas arriba de KPIs | DashboardView.swift (reordenar) |
| Agregar dropdown cambio de estado en Próximos Eventos | UpcomingEventsSection en DashboardView |
| Agregar links en subtítulos de KPIs (iPad) | KPICard.swift |

### Android

| Cambio | Archivo(s) |
|--------|------------|
| Agregar saludo y fecha en Phone (no solo tablet) | DashboardScreen.kt |
| Remover botones Quick Quote y Search del header tablet | DashboardScreen.kt |
| Reducir Quick Actions de 4 a 2 en tablet | DashboardScreen.kt |
| Agregar criterio "Sin confirmar 14 días" a PendingEvents | DashboardViewModel.kt |
| Mover PendingEventsBanner arriba de KPIs | DashboardScreen.kt (reordenar) |
| Agregar Onboarding Checklist inline | Nuevo componente o reutilizar existente |
| Unificar nombre "Ventas del Mes" → "Ventas Netas" | DashboardScreen.kt |

### Web

| Cambio | Archivo(s) |
|--------|------------|
| Remover 3 iconos de acción del header | Dashboard.tsx |
| Reducir Quick Actions de 4 a 2 | Dashboard.tsx |
| CREAR widget "Alertas de Atención" | Dashboard.tsx o nuevo componente |
| Reordenar: Alertas arriba de KPIs | Dashboard.tsx |
| Verificar nombre KPIs consistentes | Dashboard.tsx |

### Backend (si es necesario)

| Cambio | Archivo(s) |
|--------|------------|
| Verificar que /api/dashboard devuelva eventos para alertas | handler/dashboard.go |
| Si no existe: agregar campo attention_events al response | handler/dashboard.go, model/ |
| Lógica: pago pendiente (7 días), vencido, sin confirmar (14 días) | service/ o handler/ |

---

## Notas para Claude Code

1. **Leer este archivo** antes de empezar
2. **Priorizar el widget de Alertas** — es el único componente completamente nuevo para iOS y Web
3. **El reorden de secciones** es simple pero importante — las alertas urgentes van arriba de los KPIs
4. **No romper nada existente** — los KPIs y charts ya funcionan bien, solo se reorganizan
5. **Backend**: verificar primero si el endpoint de dashboard ya tiene la data de eventos próximos con sus pagos. Si sí, la lógica de "requiere atención" puede ser client-side. Si no, crear endpoint.
6. **Hacer commit** después de cada cambio lógico
