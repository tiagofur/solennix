# Solennix — Plan de Refactor del Calendario

## Resumen

Simplificar el Calendario a su función esencial (vista grilla mensual + gestión de disponibilidad) y eliminar la duplicación con la nueva sección Eventos. Unificar el bloqueo de fechas y limpiar el toolbar.

---

## Decisiones Aprobadas

| Decisión | Resultado |
|----------|-----------|
| Vista lista dentro del Calendario | Eliminar — la lista de eventos vive en la sección Eventos |
| Acciones del toolbar | Solo "Bloquear Fechas" + "Hoy" |
| Exportar CSV | Mover a la sección Eventos (no pertenece al calendario) |
| Bloqueo de fechas | Long-press para bloquear/desbloquear rápido + botón para gestionar todos los bloqueos |

---

## Estructura Final del Calendario

### Concepto

El Calendario es una **vista visual del mes** enfocada en 2 cosas:
1. **Ver de un vistazo** qué días tienen eventos y qué días están bloqueados
2. **Gestionar disponibilidad** (bloquear/desbloquear fechas)

La gestión detallada de eventos (buscar, filtrar, exportar, ver lista completa) se hace en la sección **Eventos**.

### Layout por Form Factor

#### Phone (iPhone, Android Phone, Web Mobile)

```
┌──────────────────────────┐
│ Toolbar: "Calendario"    │
│          [Bloquear] [Hoy]│
├──────────────────────────┤
│ ◀  Marzo 2026         ▶  │
├──────────────────────────┤
│ D  L  M  M  J  V  S     │
│          1  2  3  4  5   │
│ 6  7  8  9  10 11 12     │
│ 13 14 15 16 17 18 19     │
│ 20 21 22 23 24 25 26     │
│ 27 28 29 30 31           │
├──────────────────────────┤
│ Eventos del 15 de marzo  │  ← Panel de día seleccionado
│ ┌──────────────────────┐ │
│ │ 🎉 Boda García-López │ │
│ │ 15:00 · Confirmado   │ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │ 🎂 XV Años Martínez  │ │
│ │ 18:00 · Cotizado     │ │
│ └──────────────────────┘ │
│                          │
│ [Fecha bloqueada? info]  │  ← Si la fecha está bloqueada
└──────────────────────────┘
```

Todo en scroll vertical. Calendario arriba, eventos del día seleccionado abajo.

#### Tablet/Desktop (iPad, Android Tab, Web Desktop)

```
┌──────────────────────────────────────────────────────────┐
│ Toolbar: "Calendario"                   [Bloquear] [Hoy] │
├────────────────────────────┬─────────────────────────────┤
│                            │                             │
│  ◀  Marzo 2026          ▶  │  Eventos del 15 de marzo   │
│                            │                             │
│  D  L  M  M  J  V  S      │  🎉 Boda García-López      │
│           1  2  3  4  5    │  15:00 · Ana García         │
│  6  7  8  9  10 11 12      │  150 personas · Confirmado  │
│  13 14 15 16 17 18 19      │                             │
│  20 21 22 23 24 25 26      │  🎂 XV Años Martínez       │
│  27 28 29 30 31            │  18:00 · Laura Martínez     │
│                            │  80 personas · Cotizado     │
│                            │                             │
│                            │  [Fecha bloqueada? info]    │
│                            │                             │
└────────────────────────────┴─────────────────────────────┘
```

Split view: calendario a la izquierda (~50-60%), panel de eventos del día seleccionado a la derecha.

---

### Componentes del Calendario

#### 1. Toolbar / Header

**Contenido:**
- Título: "Calendario"
- Botón "Gestionar Bloqueos" (icono: lock / calendar.badge.minus) → abre panel/modal de gestión de bloqueos
- Botón "Hoy" → navega al mes actual y selecciona la fecha de hoy

**Lo que se REMUEVE del toolbar:**
- ~~Toggle vista calendario/lista~~ (ya no hay vista lista)
- ~~Botón crear evento~~ (ya está en el FAB)
- ~~Botón Quick Quote~~ (ya está en el FAB)
- ~~Botón exportar CSV~~ (se moverá a la sección Eventos)
- ~~Botón búsqueda~~ (ya está en el topbar global)

**Paridad:**

| Plataforma | Cambio en toolbar |
|------------|-------------------|
| iOS | Remover botón Quick Quote y crear evento. Agregar botón "Gestionar Bloqueos". Mantener "Hoy" |
| Android | Remover toggle vista calendario/lista. Remover SegmentedButton. Agregar botón "Gestionar Bloqueos". Mantener "Hoy" |
| Web | Remover toggle vista, exportar CSV, botón crear evento. Renombrar título de "Eventos" a "Calendario". Remover subtítulo. Agregar botón "Gestionar Bloqueos". Mantener "Hoy" |

#### 2. Navegación de Mes

**Contenido:**
- Flecha izquierda (mes anterior)
- Nombre del mes + año: "Marzo 2026"
- Flecha derecha (mes siguiente)

**Interacción:**
- Swipe horizontal para cambiar de mes (iOS y Android nativo)
- Click en flechas en todas las plataformas
- Web: swipe no necesario, solo flechas

**Paridad:** Ya es consistente en las 3 plataformas. Sin cambios.

#### 3. Grilla del Calendario (Mes)

**Headers de días:** D, L, M, M, J, V, S (abreviatura de 1 letra en phones, nombre corto en tablets)

**Cada celda de día muestra:**
- Número del día
- Dots de estado de eventos (hasta 3 dots de colores):
  - Gris: Cotizado
  - Azul: Confirmado
  - Verde: Completado
  - Rojo: Cancelado
- Background especial si está bloqueado: fondo rojo/naranja suave + texto tachado

**Estados visuales de una celda:**
- Normal: texto negro, fondo blanco
- Hoy: borde primario (dorado), texto bold
- Seleccionado: fondo primario (dorado), texto blanco
- Bloqueado: fondo rojo suave, texto tachado
- Otro mes: texto gris claro
- Con eventos: dots de colores debajo del número

**Interacciones:**
- Tap: selecciona el día → muestra eventos de ese día en el panel inferior/lateral
- Long-press: abre diálogo de bloquear/desbloquear esa fecha

**Paridad:** Ya es consistente. Verificar que los colores de dots sean idénticos.

#### 4. Panel de Eventos del Día Seleccionado

**Ubicación:**
- Phone: debajo del calendario, scroll vertical
- Tablet/Desktop: panel lateral derecho (split view)

**Contenido cuando hay eventos:**
- Header: "Eventos del [fecha formateada]" (ej: "Eventos del 15 de marzo")
- Lista de event cards, cada uno mostrando:
  - Tipo de servicio / nombre del evento
  - Hora de inicio
  - Nombre del cliente
  - Número de personas (solo en tablet/desktop, espacio limitado en phone)
  - Badge de estado (Cotizado, Confirmado, Completado, Cancelado)
- Cada card es tocable → navega al detalle del evento

**Contenido cuando NO hay eventos:**
- Icono de calendario vacío
- Texto: "No hay eventos para este día"
- NO mostrar botón "Crear evento" aquí (ya está en el FAB)

**Contenido cuando la fecha está bloqueada:**
- Icono de candado
- Texto: "Fecha bloqueada"
- Rango de fechas del bloqueo (si es rango)
- Razón (si se proporcionó)
- Botón "Desbloquear" (texto, no prominente)

**Cambios necesarios:**
- **iOS**: Ya funciona bien. Verificar que muestre nombre del cliente y pax en iPad
- **Android**: Ya funciona bien. Sin cambios
- **Web**: Renombrar de "Eventos" a eventos del día seleccionado. Ajustar layout

#### 5. Bloqueo de Fechas — Diálogo de Long-Press

**Al hacer long-press en una fecha NO bloqueada:**
- Título: "Bloquear Fecha"
- Fecha seleccionada mostrada
- Campo opcional: "Fecha fin" (para bloquear un rango) — default: misma fecha
- Campo opcional: "Razón" (texto libre, ej: "Vacaciones", "Mantenimiento")
- Botones: "Cancelar" | "Bloquear"

**Al hacer long-press en una fecha BLOQUEADA:**
- Título: "Fecha Bloqueada"
- Rango de fechas mostrado
- Razón (si existe)
- Botones: "Cancelar" | "Desbloquear"

**Paridad:**

| Plataforma | Estado actual | Cambio |
|------------|---------------|--------|
| iOS | Long-press funciona, solo fecha individual | AGREGAR campo "Fecha fin" para rangos |
| Android | Long-press funciona, soporta rangos | Ya completo |
| Web | Click para bloquear (no long-press), modal con rangos | AGREGAR long-press/right-click para bloqueo rápido |

#### 6. Gestión de Bloqueos — Panel/Modal (NUEVO para iOS y Web)

**Accesible desde:** Botón "Gestionar Bloqueos" en toolbar

**Contenido:**
- Título: "Fechas Bloqueadas"
- Lista de todos los bloqueos activos:
  - Rango de fechas (o fecha individual)
  - Razón (si existe)
  - Botón eliminar/desbloquear por cada uno
- Botón "Agregar Bloqueo" → abre formulario de nuevo bloqueo con fecha inicio, fecha fin, razón
- Estado vacío: "No hay fechas bloqueadas"

**Implementación por plataforma:**

| Plataforma | Tipo de componente |
|------------|-------------------|
| iOS (iPhone) | Sheet (.sheet modifier) |
| iOS (iPad) | Popover o sheet |
| Android (Phone) | BottomSheet (Material3) |
| Android (Tablet) | BottomSheet o Dialog |
| Web (Desktop) | Modal/Dialog |
| Web (Mobile) | Bottom drawer o modal |

**Paridad:**

| Plataforma | Estado actual | Cambio |
|------------|---------------|--------|
| iOS | No tiene gestión centralizada | CREAR componente BlockedDatesSheet |
| Android | Ya tiene BottomSheet con lista de bloqueos | Verificar funcionalidad completa |
| Web | Tiene UnavailableDatesModal pero solo para crear | EXPANDIR para listar y gestionar todos los bloqueos |

---

## Lo que se ELIMINA del Calendario

| Elemento | Razón | Se mueve a |
|----------|-------|------------|
| Vista lista de eventos | Duplica la sección Eventos | Sección Eventos (tab propio) |
| Toggle calendario/lista | Ya no hay vista lista | Eliminado |
| Botón crear evento (toolbar) | Ya está en el FAB | FAB global |
| Botón Quick Quote (toolbar) | Ya está en el FAB | FAB global |
| Botón exportar CSV | No pertenece al calendario | Sección Eventos |
| Botón búsqueda (toolbar) | Ya está en topbar | Topbar global |
| Filtros de estado (chips) | Eran para la vista lista | Sección Eventos |
| Subtítulo "Gestiona tu agenda..." (Web) | Confuso con sección Eventos | Eliminado |

---

## Lo que se AGREGA al Calendario

| Elemento | Plataforma | Descripción |
|----------|------------|-------------|
| Botón "Gestionar Bloqueos" | Todas | En toolbar, abre panel de gestión de bloqueos |
| Panel de gestión de bloqueos | iOS, Web | Lista todos los bloqueos, permite agregar/eliminar (Android ya lo tiene) |
| Soporte de rangos en long-press | iOS | Agregar campo "Fecha fin" al diálogo de bloqueo por long-press |
| Long-press para bloqueo rápido | Web | Agregar interacción de long-press/right-click en celdas del calendario |

---

## Resumen de Cambios por Plataforma

### iOS

| Cambio | Archivo(s) |
|--------|------------|
| Eliminar vista lista y toggle | CalendarView.swift (remover sección list, segmented control) |
| Remover botón Quick Quote y crear evento del toolbar | CalendarView.swift |
| Agregar botón "Gestionar Bloqueos" al toolbar | CalendarView.swift |
| Crear panel BlockedDatesSheet | Nuevo: BlockedDatesSheet.swift |
| Agregar campo "Fecha fin" al diálogo de bloqueo por long-press | CalendarView.swift (bloqueo dialog) |
| Limpiar CalendarViewModel (remover lógica de lista, filtros, búsqueda) | CalendarViewModel.swift |

### Android

| Cambio | Archivo(s) |
|--------|------------|
| Eliminar vista lista y SegmentedButton toggle | CalendarScreen.kt (remover ListContent, segmented button) |
| Remover lógica de búsqueda y filtros de lista | CalendarScreen.kt, CalendarViewModel.kt |
| Agregar botón "Gestionar Bloqueos" al TopAppBar | CalendarScreen.kt |
| Verificar que el BottomSheet de bloqueos funcione bien | CalendarScreen.kt (ya existe) |
| Limpiar código de vista lista (search, chips, pagination) | CalendarScreen.kt |

### Web

| Cambio | Archivo(s) |
|--------|------------|
| Eliminar vista lista y toggle | CalendarView.tsx (remover list view, toggle) |
| Renombrar título "Eventos" → "Calendario", eliminar subtítulo | CalendarView.tsx |
| Remover botones: exportar CSV, crear evento, toggle vista | CalendarView.tsx |
| Mover exportar CSV a la sección Eventos (EventList.tsx) | EventList.tsx (AGREGAR), CalendarView.tsx (REMOVER) |
| Agregar botón "Gestionar Bloqueos" | CalendarView.tsx |
| Expandir UnavailableDatesModal para listar todos los bloqueos | UnavailableDatesModal.tsx |
| Agregar interacción long-press/right-click para bloqueo rápido | CalendarView.tsx (evento onContextMenu o long-press) |
| Limpiar código de vista lista (search, filters, pagination) | CalendarView.tsx |

---

## Notas para Claude Code

1. **Este refactor SIMPLIFICA** — estás quitando más de lo que agregas. Menos código = menos bugs.
2. **No borrar código todavía** — Primero implementa los cambios, luego limpia el código muerto. Así puedes revertir si algo sale mal.
3. **La vista lista se MUEVE, no se pierde** — La funcionalidad de lista de eventos con filtros, búsqueda y exportación CSV ahora vive en la sección Eventos (EventList). Si EventList aún no está implementado, crearlo con esas funcionalidades migradas.
4. **Web: long-press** — En web, long-press se simula con `onContextMenu` (right-click) o `onPointerDown` con timer de 500ms. Ambos son válidos, right-click es más descubrible en desktop.
5. **Verificar que el FAB** siga funcionando en la pantalla de Calendario (debería, si se implementó correctamente en el refactor de navegación).
6. **Hacer commit** después de cada cambio lógico.
