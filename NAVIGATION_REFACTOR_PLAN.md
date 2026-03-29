# Solennix — Plan de Refactor de Navegación

## Resumen Ejecutivo

Reestructurar la navegación de Solennix en las 6 plataformas para lograr paridad total, eliminar redundancias y seguir el principio: **Navegación = Secciones (sustantivos), Acciones = Botones/FABs (verbos)**.

---

## Decisiones Aprobadas

| Decisión | Resultado |
|----------|-----------|
| ¿Eventos como tab principal en phones? | ✅ Sí — tab propio en bottom bar |
| ¿Qué hacer con Cotización/Cotización Rápida? | ✅ Remover del sidebar — pasan a ser botones contextuales |
| ¿Dónde vive la búsqueda? | ✅ Topbar siempre (barra en desktop, icono en phone) |
| ¿Contenido del menú "Más"? | ✅ Mínimo: solo Productos, Inventario, Configuración |

---

## Arquitectura Final de Navegación

### Bottom Tab Bar (iPhone, Android Phone, Web Mobile)

```
┌─────────┬────────────┬──────────┬──────────┬─────────┐
│  Inicio │ Calendario │ Eventos  │ Clientes │   Más   │
│  🏠     │  📅        │  🎉      │  👥      │   •••   │
└─────────┴────────────┴──────────┴──────────┴─────────┘
```

| # | Tab | Icono | Ruta | Descripción |
|---|-----|-------|------|-------------|
| 1 | Inicio | house.fill / Home | /dashboard | Dashboard con KPIs y resumen |
| 2 | Calendario | calendar / DateRange | /calendar | Vista calendario con eventos |
| 3 | **Eventos** | party.popper / Celebration | /events | **NUEVO** — Lista de todos los eventos |
| 4 | Clientes | person.2.fill / People | /clients | Gestión de clientes |
| 5 | Más | ellipsis / Menu | /more | Productos, Inventario, Config |

### Menú "Más" (Solo Phones — 3 items)

| Sección | Item | Icono | Ruta |
|---------|------|-------|------|
| Catálogo | Productos | shippingbox / Package | /products |
| Catálogo | Inventario | archivebox / Boxes | /inventory |
| Configuración | Configuración | gearshape / Settings | /settings |

**Removidos de "Más":** Eventos (ahora es tab), Buscar (ahora en topbar), Cotización (ahora es botón), Cotización Rápida (ahora es botón).

### Sidebar (iPad, Android Tablet, Web Desktop)

```
┌──────────────────────┐
│  🟡 Solennix         │
├──────────────────────┤
│  📊 Inicio           │  ← /dashboard
│  📅 Calendario       │  ← /calendar
│  🎉 Eventos          │  ← /events
│  👥 Clientes         │  ← /clients
│  📦 Productos        │  ← /products
│  📥 Inventario       │  ← /inventory
│                      │
│                      │
├──────────────────────┤
│  ⚙️ Configuración    │  ← /settings
└──────────────────────┘
```

| # | Sección | Icono iOS | Icono Android/Web | Ruta |
|---|---------|-----------|-------------------|------|
| 1 | Inicio | house.fill | LayoutDashboard | /dashboard |
| 2 | Calendario | calendar | Calendar | /calendar |
| 3 | Eventos | calendar.badge.clock | PartyPopper/Celebration | /events |
| 4 | Clientes | person.2.fill | Users/People | /clients |
| 5 | Productos | shippingbox.fill | Package/Inventory2 | /products |
| 6 | Inventario | archivebox.fill | Boxes/Widgets | /inventory |
| — | *(separador)* | | | |
| 7 | Configuración | gearshape.fill | Settings | /settings |

**Removidos del sidebar:** ~~Cotización~~, ~~Cotización Rápida~~, ~~Buscar~~.

### Búsqueda Global (Topbar — Todas las plataformas)

| Plataforma | Implementación |
|------------|----------------|
| Web Desktop | Barra de búsqueda visible en topbar + Cmd+K/Ctrl+K |
| iPad | searchable() en NavigationStack + Cmd+K |
| Android Tablet | SearchBar en TopAppBar |
| iPhone | Icono 🔍 en navigation bar → expande a barra + Core Spotlight |
| Android Phone | Icono 🔍 en TopAppBar → expande a SearchBar |
| Web Mobile | Icono 🔍 en header → expande a barra |

### Acciones Rápidas (FAB + Botones Contextuales)

Las acciones "Nuevo Evento" y "Cotización Rápida" ya NO son items de navegación. Son acciones accesibles desde:

| Ubicación | Phones | Tablets/Desktop |
|-----------|--------|-----------------|
| Sección Eventos | FAB flotante con menú expandible | Botones en header de la página ("+ Nuevo Evento" y "⚡ Cotización Rápida") |
| Dashboard | Cards de acciones rápidas | Cards de acciones rápidas |
| Calendario | Al tocar una fecha → opciones de crear | Al tocar una fecha → opciones de crear |
| Clientes (detalle) | Botón "Crear Evento para este cliente" | Botón "Crear Evento para este cliente" |

**FAB (Phones):**
- Botón flotante dorado "+" en esquina inferior derecha
- Al presionar: menú expandible con 2 opciones:
  - **Nuevo Evento** — Crear evento completo con cliente y fecha
  - **Cotización Rápida** — Presupuesto sin registrar cliente
- Se oculta en: Configuración, menú Más
- Animación: rotación 45° al abrir (se convierte en ✕)

---

## Implementación por Plataforma

### FASE 1: iOS (iPhone + iPad)

#### 1.1 Modificar Tab enum y SidebarSection
**Archivo:** `ios/Solennix/Navigation/Route.swift` (o donde estén los enums Tab y SidebarSection)

**Tab enum (iPhone) — ANTES:**
```swift
enum Tab: Hashable {
    case home, calendar, clients, more
}
```

**Tab enum — DESPUÉS:**
```swift
enum Tab: Hashable {
    case home, calendar, events, clients, more
}
```

**SidebarSection (iPad) — ANTES:**
```swift
enum SidebarSection {
    case dashboard, calendar, events, quote, quickQuote, clients, products, inventory, search, settings
}
```

**SidebarSection — DESPUÉS:**
```swift
enum SidebarSection {
    case dashboard, calendar, events, clients, products, inventory, settings
}
```

#### 1.2 Actualizar CompactTabLayout.swift
- Agregar tab "Eventos" (icono: `calendar.badge.clock`, label: "Eventos")
- Ruta al hacer tap: navegar a EventListView
- Mantener NavigationStack independiente para este tab
- Orden: home, calendar, events, clients, more

#### 1.3 Actualizar MoreMenuView.swift
- Eliminar sección "Eventos" (ya tiene tab propio)
- Eliminar "Buscar" (pasa a topbar)
- Eliminar "Cotización Rápida" (pasa a FAB/botones)
- Quedan solo: Productos, Inventario, Configuración
- Reorganizar en 2 secciones: "Catálogo" (Productos, Inventario) y "Configuración"

#### 1.4 Actualizar SidebarSplitLayout.swift
- Eliminar items: .quote, .quickQuote, .search
- Mantener solo: dashboard, calendar, events, clients, products, inventory + settings (abajo)

#### 1.5 Agregar FAB para acciones rápidas (iPhone)
- Crear componente `QuickActionsFAB.swift` reutilizable
- Botón flotante "+" que al presionar muestra menú con:
  - "Nuevo Evento" → navega a EventFormView
  - "Cotización Rápida" → navega a QuickQuoteView
- Mostrar en: Dashboard, Calendar, Events, Clients
- Ocultar en: Settings, More, formularios

#### 1.6 Agregar búsqueda en topbar
- iPhone: agregar `.searchable()` modifier a NavigationStacks principales
- iPad: agregar barra de búsqueda en el topbar del NavigationSplitView
- Mantener Core Spotlight existente

#### 1.7 Agregar botones contextuales en sección Eventos (iPad)
- En EventListView (cuando es iPad/regular): mostrar toolbar con botones:
  - "Nuevo Evento" (botón primario dorado)
  - "Cotización Rápida" (botón secundario)

---

### FASE 2: Android (Phone + Tablet)

#### 2.1 Modificar TopLevelDestination
**Archivo:** `android/app/src/main/java/com/creapolis/solennix/ui/navigation/TopLevelDestination.kt`

**ANTES:** home, calendar, clients, more (4 tabs)
**DESPUÉS:** home, calendar, events, clients, more (5 tabs)

Agregar:
```kotlin
EVENTS(
    titleResId = "Eventos",
    icon = Icons.Default.Celebration, // o CalendarMonth
    route = "events"
)
```

#### 2.2 Modificar SidebarSection
**Archivo:** `android/app/src/main/java/com/creapolis/solennix/ui/navigation/SidebarSection.kt`

**ANTES:** dashboard, calendar, cotizacion, cotizacionRapida, clients, products, inventory, search, settings (9 items)
**DESPUÉS:** dashboard, calendar, events, clients, products, inventory, settings (7 items)

Eliminar: cotizacion, cotizacionRapida, search

#### 2.3 Actualizar CompactBottomNavLayout.kt
- Agregar tab "Eventos" con icono y ruta
- Actualizar MoreMenuScreen: eliminar Cotización, Cotización Rápida, Buscar
- Quedan en Más: Productos, Inventario, Configuración

#### 2.4 Actualizar AdaptiveNavigationRailLayout.kt
- Actualizar items del NavigationRail según nuevo SidebarSection
- 7 items en lugar de 9

#### 2.5 Agregar FAB con acciones rápidas (Phone)
- Crear composable `QuickActionsFAB` con Material3 ExtendedFloatingActionButton
- Menú expandible con: "Nuevo Evento" y "Cotización Rápida"
- Mostrar en pantallas principales, ocultar en settings/more

#### 2.6 Agregar búsqueda en topbar
- Phone: icono de búsqueda en TopAppBar → SearchBar expandible
- Tablet: SearchBar visible en TopAppBar

#### 2.7 Botones contextuales en Eventos (Tablet)
- En EventListScreen cuando isWideScreen: botones en TopAppBar
  - "Nuevo Evento" (FilledButton)
  - "Cotización Rápida" (OutlinedButton)

#### 2.8 Crear EventListScreen si no existe
- Verificar si ya existe una pantalla de lista de eventos
- Si no, crear en `android/feature/events/ui/EventListScreen.kt`
- Con filtros: Todos, Próximos, Pasados, Borradores

---

### FASE 3: Web (Desktop + Mobile)

#### 3.1 Crear página EventList
**Archivo nuevo:** `web/src/pages/Events/EventList.tsx`
- Lista de eventos con filtros (Todos, Próximos, Pasados, Borradores)
- Tabla/cards con: nombre, fecha, cliente, monto, estado
- Búsqueda inline
- Botones: "Nuevo Evento" y "Cotización Rápida" en el header

#### 3.2 Agregar ruta /events
**Archivo:** `web/src/App.tsx`
- Agregar ruta: `/events` → EventList
- Mantener rutas existentes: `/events/new`, `/events/:id/edit`, `/events/:id/summary`

#### 3.3 Actualizar sidebar en Layout.tsx
**Archivo:** `web/src/components/Layout.tsx`

**ANTES (menuItems):**
```typescript
Dashboard, Calendario, Cotización, Cotización Rápida, Clientes, Productos, Inventario, Configuración
```

**DESPUÉS:**
```typescript
const menuItems = [
  { label: "Inicio", href: "/dashboard", icon: LayoutDashboard },
  { label: "Calendario", href: "/calendar", icon: Calendar },
  { label: "Eventos", href: "/events", icon: PartyPopper },
  { label: "Clientes", href: "/clients", icon: Users },
  { label: "Productos", href: "/products", icon: Package },
  { label: "Inventario", href: "/inventory", icon: Boxes },
];
// Configuración va separado abajo
const bottomItems = [
  { label: "Configuración", href: "/settings", icon: Settings },
];
```

Eliminar: Cotización (/events/new), Cotización Rápida (/cotizacion-rapida)

#### 3.4 Agregar bottom tab bar para Web Mobile
**Archivo:** `web/src/components/Layout.tsx` (o nuevo `BottomTabBar.tsx`)

Para pantallas < 1024px (breakpoint lg):
- Ocultar sidebar
- Mostrar bottom tab bar fijo con 5 tabs: Inicio, Calendario, Eventos, Clientes, Más
- "Más" abre un menú/drawer con: Productos, Inventario, Configuración
- FAB flotante para acciones rápidas

#### 3.5 Actualizar CommandPalette.tsx
- Agregar "Eventos" a las opciones de navegación
- Mantener "Nuevo Evento" y "Cotización Rápida" como acciones rápidas

#### 3.6 Agregar FAB para Web Mobile
- Componente flotante visible solo en < 1024px
- Misma funcionalidad: Nuevo Evento + Cotización Rápida

#### 3.7 Agregar botones en header de EventList (Desktop)
- "Nuevo Evento" (botón primario) → navega a /events/new
- "Cotización Rápida" (botón secundario) → navega a /cotizacion-rapida

---

## Orden de Implementación Recomendado

Sugiero implementar por plataforma completa, no por feature cruzada. Así puedes probar cada plataforma de forma independiente:

```
FASE 1: Web (más rápida de iterar)
  1.1 Crear EventList page
  1.2 Agregar ruta /events
  1.3 Actualizar sidebar menuItems
  1.4 Agregar bottom tab bar mobile
  1.5 Agregar FAB mobile
  1.6 Actualizar CommandPalette
  1.7 Verificar responsive

FASE 2: iOS
  2.1 Modificar Tab enum (agregar .events)
  2.2 Actualizar CompactTabLayout (5 tabs)
  2.3 Simplificar MoreMenuView (3 items)
  2.4 Actualizar SidebarSplitLayout (remover quote/quickQuote/search)
  2.5 Agregar QuickActionsFAB
  2.6 Agregar .searchable() en NavigationStacks
  2.7 Botones contextuales en EventListView (iPad)

FASE 3: Android
  3.1 Modificar TopLevelDestination (5 tabs)
  3.2 Actualizar SidebarSection (7 items)
  3.3 Actualizar CompactBottomNavLayout + MoreMenuScreen
  3.4 Actualizar AdaptiveNavigationRailLayout
  3.5 Agregar QuickActionsFAB composable
  3.6 Agregar SearchBar en TopAppBar
  3.7 Botones contextuales en EventListScreen (tablet)
```

---

## Archivos Afectados (Resumen)

### iOS
| Archivo | Cambio |
|---------|--------|
| `ios/Packages/SolennixCore/Sources/SolennixCore/Route.swift` | Modificar Tab y SidebarSection enums |
| `ios/Solennix/Navigation/CompactTabLayout.swift` | Agregar tab Eventos (5 tabs) |
| `ios/Solennix/Navigation/MoreMenuView.swift` | Reducir a 3 items |
| `ios/Solennix/Navigation/SidebarSplitLayout.swift` | Remover quote/quickQuote/search |
| **NUEVO** `ios/Packages/SolennixFeatures/.../Common/QuickActionsFAB.swift` | FAB reutilizable |
| `ios/Packages/SolennixFeatures/.../Events/Views/EventListView.swift` | Agregar toolbar con botones (iPad) |
| `ios/Packages/SolennixFeatures/.../Dashboard/Views/DashboardView.swift` | Agregar .searchable() |

### Android
| Archivo | Cambio |
|---------|--------|
| `.../navigation/TopLevelDestination.kt` | Agregar EVENTS (5 tabs) |
| `.../navigation/SidebarSection.kt` | Reducir a 7 items |
| `.../navigation/CompactBottomNavLayout.kt` | 5 tabs + MoreMenu simplificado |
| `.../navigation/AdaptiveNavigationRailLayout.kt` | 7 items en rail |
| **NUEVO** `.../ui/components/QuickActionsFAB.kt` | FAB reutilizable |
| `.../feature/events/ui/EventListScreen.kt` | Agregar topbar buttons (tablet) |

### Web
| Archivo | Cambio |
|---------|--------|
| **NUEVO** `web/src/pages/Events/EventList.tsx` | Nueva página de lista de eventos |
| `web/src/App.tsx` | Agregar ruta /events |
| `web/src/components/Layout.tsx` | Actualizar menuItems, agregar bottom tabs mobile |
| **NUEVO** `web/src/components/BottomTabBar.tsx` | Bottom tabs para móvil |
| **NUEVO** `web/src/components/QuickActionsFAB.tsx` | FAB para móvil |
| `web/src/components/CommandPalette.tsx` | Agregar "Eventos" a navegación |

---

## Verificación Post-Implementación

Después de implementar cada fase, verificar:

- [ ] Bottom tabs muestran 5 items en phones (Inicio, Calendario, Eventos, Clientes, Más)
- [ ] Sidebar muestra 6+1 items en tablet/desktop (6 secciones + Config abajo)
- [ ] Menú "Más" tiene exactamente 3 items (Productos, Inventario, Config)
- [ ] "Cotización" y "Cotización Rápida" NO aparecen en navegación principal
- [ ] FAB funciona en phones (muestra menú con Nuevo Evento + Cotización Rápida)
- [ ] Botones contextuales aparecen en header de Eventos en tablet/desktop
- [ ] Búsqueda está en topbar de todas las plataformas
- [ ] Web mobile tiene bottom tab bar (no sidebar hamburger)
- [ ] Todas las rutas existentes siguen funcionando
- [ ] Deep links no se rompen
- [ ] Navegación a "Nuevo Evento" funciona desde: FAB, Dashboard, Calendario, Detalle de Cliente
- [ ] Navegación a "Cotización Rápida" funciona desde: FAB, Dashboard

---

## Notas para Claude Code

1. **Leer este archivo primero** antes de empezar cualquier implementación
2. **Implementar por plataforma** (Web → iOS → Android), no por feature cruzada
3. **Hacer commit después de cada fase** según la regla de auto-commit del CLAUDE.md
4. **Actualizar PRD** después de completar: `FEATURES.md` (tabla de paridad), `CURRENT_STATUS.md`
5. **No romper rutas existentes** — /events/new, /events/:id, etc. deben seguir funcionando
6. **Web Mobile es un cambio grande** — actualmente usa sidebar hamburger, debe cambiar a bottom tab bar
