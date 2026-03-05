# Plan de Implementación: Solennix Mobile

> Última actualización: 2026-02-25  
> Estimación total: **7-9 semanas** (1 desarrollador full-time)

---

## Resumen de Fases

| Fase | Nombre                    | Duración | Acumulado  |
| ---- | ------------------------- | -------- | ---------- |
| 0    | Setup del Proyecto        | 3-4 días | 3-4 días   |
| 1    | Auth + Navegación Shell   | 3-4 días | 6-8 días   |
| 2    | Dashboard + Clientes      | 5-6 días | 11-14 días |
| 3    | Eventos (Form + Summary)  | 7-8 días | 18-22 días |
| 4    | Catálogo + Inventario     | 4-5 días | 22-27 días |
| 5    | Calendario + PDFs         | 4-5 días | 26-32 días |
| 6    | Settings + Subscripciones | 3-4 días | 29-36 días |
| 7    | Polish + Testing          | 5-6 días | 34-42 días |
| 8    | Release                   | 2-3 días | 36-45 días |

---

## Fase 0: Setup del Proyecto

**Objetivo:** Proyecto funcional que compila, con toda la infraestructura base lista.

### Tareas

- [ ] Inicializar proyecto Expo con TypeScript:
  ```bash
  npx create-expo-app@latest mobile --template expo-template-blank-typescript
  ```
- [ ] Configurar estructura de carpetas (`src/`, `screens/`, `services/`, etc.)
- [ ] Instalar dependencias core:
  - Navigation: `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`, `react-native-screens`, `react-native-safe-area-context`
  - Storage: `expo-secure-store`
  - PDF: `expo-print`, `expo-sharing`
  - Forms: `react-hook-form`, `@hookform/resolvers`, `zod`
  - State: `zustand`
  - Icons: `lucide-react-native`, `react-native-svg`
  - Dates: `date-fns`
  - Styling: `nativewind`, `tailwindcss`
- [ ] Copiar archivos reutilizables de `web/src/`:
  - `types/supabase.ts` → copia directa
  - `lib/finance.ts` → copia directa
  - `lib/errorHandler.ts` → copia directa
  - `hooks/useToast.ts` → copia directa
  - `hooks/usePlanLimits.ts` → copia directa
  - Todos los `services/*.ts` → copia directa
- [ ] Adaptar `lib/api.ts`:
  - `localStorage` → `expo-secure-store` (async)
  - `window.dispatchEvent` → callback pattern
  - Métodos de token `async`
- [ ] Adaptar `contexts/AuthContext.tsx`:
  - SecureStore async
  - Callback-based logout en lugar de DOM events
- [ ] Crear `navigation/RootNavigator.tsx` con auth check básico
- [ ] Configurar ESLint + Prettier
- [ ] Configurar Jest + React Native Testing Library

### Criterio de Aceptación

App compila, muestra pantalla de login, puede hacer login contra backend local, navega a un tab vacío.

---

## Fase 1: Auth + Navegación Shell

**Objetivo:** Flujo de auth completo y estructura de navegación funcional.

### Tareas

- [ ] **LoginScreen**: formulario email + password con React Hook Form + Zod
  - Copiar lógica de validación de `web/src/pages/Login.tsx`
  - Loading state, error display
  - Botón "¿Olvidaste tu contraseña?" → ForgotPassword
  - Botón "Crear cuenta" → Register
- [ ] **RegisterScreen**: formulario name + email + password + confirm
  - Copiar validación de `web/src/pages/Register.tsx`
  - Auto-login después de registro exitoso
- [ ] **ForgotPasswordScreen**: campo de email, envía reset link
- [ ] **MainTabs.tsx**: bottom tab bar con 5 tabs
  - Iconos: Home, Calendar, PlusCircle, Users, Menu (de lucide)
  - Tab central (➕) como botón destacado
  - Badges opcionales (ej. eventos pendientes)
- [ ] Crear stacks vacíos para cada tab con placeholder screens
- [ ] Implementar theme system (light/dark):
  - Detectar preferencia del sistema con `useColorScheme()`
  - Toggle manual persistido en SecureStore
  - `src/theme/colors.ts` con paletas light/dark
- [ ] Componentes shared base:
  - `LoadingSpinner` — ActivityIndicator estilizado
  - `EmptyState` — ilustración + título + descripción + action button
  - `Toast` / `ToastContainer` — notificaciones bottom-positioned

### Criterio de Aceptación

Login → ver tabs → logout → volver a login. Register funcional. Theme toggle persiste entre sesiones.

---

## Fase 2: Dashboard + Clientes

**Objetivo:** Pantalla principal con datos reales y CRUD completo de clientes.

### Tareas

- [ ] **DashboardScreen**:
  - KPI cards en ScrollView horizontal: eventos del mes, ventas netas, cobros, stock bajo
  - `KPICard` component reutilizable
  - Gráfica de barras con `victory-native` (status de eventos)
  - Lista de eventos próximos (max 5) con `eventService.getUpcoming()`
  - Alertas de stock bajo con `inventoryService.getAll()` filtrado
  - Pull-to-refresh (`RefreshControl`)
  - Plan upgrade banner cuando límites se acercan
- [ ] **ClientListScreen**:
  - `FlatList` con search bar en header
  - Cards de cliente (nombre, teléfono, total de eventos, total gastado)
  - Pull-to-refresh
  - Sort dropdown (nombre, fecha, gasto)
  - `SwipeableRow` con acción delete
  - Empty state cuando no hay clientes
  - FAB "Nuevo Cliente"
- [ ] **ClientFormScreen**:
  - React Hook Form + Zod validation
  - Campos: name*, phone*, email, address, city, notes
  - Modo crear / editar basado en route params
  - Loading state + error handling
  - Plan limits check (`usePlanLimits`)
- [ ] **ClientDetailScreen**:
  - Info del cliente en header card
  - Botones: editar, llamar (tel:), email (mailto:)
  - Historial de eventos en FlatList
  - Cada evento navega a EventSummaryScreen
- [ ] **ConfirmDialog** component:
  - Modal nativo con título, descripción, botones cancelar/confirmar
  - Variante destructiva (rojo) para deletes
- [ ] **UpgradeBanner** adaptado a mobile
- [ ] **SearchScreen**:
  - Barra de búsqueda con `searchService.searchAll()`
  - Resultados agrupados por tipo (clientes, eventos, productos, inventario)
  - SectionList con headers por tipo
  - Cada resultado navega a la pantalla de detalle correspondiente

### Criterio de Aceptación

Dashboard muestra datos reales del backend. CRUD completo de clientes funcional. Búsqueda global retorna resultados correctos y navega a detalle.

---

## Fase 3: Eventos — Formulario y Resumen

**Objetivo:** Feature más compleja — crear/editar eventos con wizard multi-step y ver resumen completo.

### Tareas

- [ ] **EventFormScreen** — wizard multi-step:
  - Step indicator/progress bar en header
  - Navegación entre steps con botones Anterior/Siguiente
  - FormProvider envolviendo todos los steps
- [ ] **Step 1 — EventGeneralInfo**:
  - Picker de cliente (bottom sheet con búsqueda)
  - Botón "Crear cliente rápido" → `QuickClientModal`
  - Date picker nativo (`@react-native-community/datetimepicker`)
  - Time pickers para inicio y fin
  - Service type selector (chips o bottom sheet)
  - Número de personas (input numérico)
  - Location y city (text inputs)
- [ ] **Step 2 — EventProducts**:
  - Lista de productos del catálogo para seleccionar
  - Por cada producto añadido: quantity, unit_price, discount
  - Subtotal por línea calculado en tiempo real
  - Botón "+" para agregar más productos
  - Swipe para eliminar producto de la lista
- [ ] **Step 3 — EventExtras**:
  - Líneas ad-hoc dinámicas: description, cost, price, exclude_utility toggle
  - Agregar/eliminar extras
- [ ] **Step 4 — EventFinancials**:
  - Resumen de totales (subtotal, descuento, IVA, total)
  - Input de descuento
  - Toggle "Requiere factura" → activa cálculo de IVA
  - Términos de contrato: deposit_percent, cancellation_days, refund_percent
  - Defaults del usuario precargados
  - Botón "Crear Cotización" / "Guardar Cambios"
- [ ] **QuickClientModal**: bottom sheet para crear cliente inline sin salir del form
- [ ] **EventSummaryScreen** con tabs internos:
  - **Tab Resumen**: info general, status con color, financials, datos del cliente
  - **Tab Ingredientes**: lista de compras calculada (productos × ingredientes × cantidad)
  - **Tab Contrato**: vista de términos contractuales
  - **Tab Pagos**: lista de pagos + botón agregar pago (modal/bottom sheet)
- [ ] Cambio de status: dropdown → opciones según status actual
  - `quoted` → `confirmed`, `cancelled`
  - `confirmed` → `completed`, `cancelled`
  - Confirmar con dialog
- [ ] Auto-confirm: primer pago cambia status de `quoted` a `confirmed`
- [ ] Plan limits check: max 3 eventos/mes en plan básico

### Criterio de Aceptación

Crear evento completo con cliente, productos, extras y financials. Ver resumen con todos los tabs. Cambiar status. Agregar pagos desde resumen.

---

## Fase 4: Catálogo + Inventario

**Objetivo:** Gestión completa de productos con recetas e inventario con tracking de stock.

### Tareas

- [ ] **Tab "Catálogo"** con top tabs: Productos | Inventario
  - Usando `@react-navigation/material-top-tabs` o segmented control
- [ ] **ProductListScreen**:
  - FlatList con cards (nombre, categoría, precio, badge activo/inactivo)
  - Filtro por categoría (chips horizontales)
  - Search bar
  - Pull-to-refresh
  - FAB "Nuevo Producto"
- [ ] **ProductFormScreen**:
  - Campos: name*, category*, base_price\*, recipe (textarea), is_active toggle
  - Sección "Ingredientes":
    - Lista de ingredientes vinculados (inventory items)
    - Picker de inventario (bottom sheet con búsqueda)
    - Quantity required por ingrediente
    - Agregar/eliminar ingredientes
  - Plan limits check (max 20 items catálogo en básico)
- [ ] **InventoryListScreen**:
  - FlatList con cards (nombre, stock actual, stock mínimo, unidad, tipo)
  - Badges de stock por color:
    - 🟢 Verde: stock > mínimo
    - 🟡 Amarillo: stock ≤ mínimo × 1.5
    - 🔴 Rojo: stock ≤ mínimo
  - Filtro por tipo (ingredient/equipment) con chips
  - Search bar
  - FAB "Nuevo Item"
- [ ] **InventoryFormScreen**:
  - Campos: ingredient_name*, current_stock*, minimum_stock*, unit*, unit_cost, type (ingredient/equipment)
  - Plan limits check

### Criterio de Aceptación

CRUD completo de productos con ingredientes vinculados. CRUD de inventario con badges de stock. Filtros y búsqueda funcionales.

---

## Fase 5: Calendario + PDFs

**Objetivo:** Vista calendario y generación/compartir de documentos PDF.

### Tareas

- [ ] **CalendarScreen** con `react-native-calendars`:
  - Vista mes con dots/markers en días con eventos
  - Color de dot según status del evento (quoted=amarillo, confirmed=azul, completed=verde, cancelled=rojo)
  - Al tocar un día: mostrar lista de eventos de ese día debajo del calendario
  - Cada evento en lista navega a EventSummaryScreen
  - Toggle vista lista (todos los eventos del mes en FlatList)
  - Botón "Nuevo Evento" → EventFormScreen
- [ ] **PDF Generation** con `expo-print`:
  - `generateBudgetPDF()` — Presupuesto/cotización
    - HTML template con header (logo, business name), datos del evento, tabla de productos y extras, totales
  - `generateContractPDF()` — Contrato
    - HTML template con términos, cláusulas de depósito/cancelación/reembolso
  - `generateShoppingListPDF()` — Lista de compras
    - HTML template con tabla de ingredientes: nombre, cantidad total, unidad, costo unitario
  - `generateInvoicePDF()` — Factura
    - HTML template con desglose fiscal (subtotal, IVA, total)
  - Todos los templates: branding del usuario, formato MXN, fechas en español
- [ ] Integrar `expo-sharing` para share sheet:
  - Botones "Compartir PDF" en EventSummaryScreen
  - Permite enviar por WhatsApp, email, AirDrop, etc.
- [ ] Reutilizar `finance.ts` para todos los cálculos en los PDFs

### Criterio de Aceptación

Calendario muestra eventos con colores por status. Navegar de día → evento. Generar y compartir los 4 tipos de PDF desde EventSummary.

---

## Fase 6: Settings + Subscripciones

**Objetivo:** Configuración de usuario/negocio y flujo de upgrade de plan.

### Tareas

- [ ] **SettingsScreen** con secciones:
  - **Perfil**: nombre, email (read-only)
  - **Negocio**: business_name, logo_url (image picker futuro), brand_color (color picker), show_business_name_in_pdf toggle
  - **Contrato defaults**: deposit_percent, cancellation_days, refund_percent (inputs numéricos)
  - **Plan**: muestra plan actual (Basic/Pro), uso actual vs límites, botón "Upgrade" → PricingScreen
  - **App**: toggle dark mode, versión de la app
  - **Sesión**: botón "Cerrar sesión" con confirmación
  - Usar `SectionList` o scroll con headers
- [ ] **PricingScreen** con RevenueCat:
  - Integrar `react-native-purchases` SDK
  - Configurar offerings en RevenueCat dashboard (separado del setup de la app)
  - Mostrar comparación Basic vs Pro con lista de features
  - Botón de compra → RevenueCat purchase flow → in-app purchase nativo
  - Listener de purchase success → refrescar estado del plan desde backend
  - Manejar restore purchases
- [ ] Backend: verificar que webhook RevenueCat funciona end-to-end:
  - RevenueCat → `POST /api/subscriptions/webhook/revenuecat` → actualiza plan del usuario
  - Polling de `/api/subscriptions/status` como fallback

### Criterio de Aceptación

Editar perfil y branding se refleja en PDFs. Ver plan actual con uso. Flujo de upgrade completo en sandbox (TestFlight/Internal Testing).

---

## Fase 7: Polish + Testing

**Objetivo:** App estable, pulida y con test coverage adecuado.

### Tareas

- [ ] **Pending events**: lógica inline en Dashboard — banner para eventos confirmados con fecha pasada que necesitan cierre
- [ ] **Onboarding simplificado**: 3 pasos (agregar cliente → producto → evento), tooltip o inline cards en Dashboard
- [ ] **Performance**:
  - `React.memo` en componentes de lista
  - `FlatList` optimizado: `getItemLayout`, `keyExtractor`, `windowSize`, `removeClippedSubviews`
  - Lazy loading de screens con `React.lazy` o `@react-navigation/lazy`
- [ ] **Offline handling**:
  - Detectar estado de red con `@react-native-community/netinfo`
  - Mostrar banner "Sin conexión" cuando offline
  - Último dato cargado persiste en estado (no se limpia al perder conexión)
- [ ] **Unit tests**:
  - Servicios: mock `api.ts`, verificar calls correctos
  - Hooks: `usePlanLimits`, `useToast`
  - Lib: `finance.ts` (cálculos), `errorHandler.ts`
  - Auth context: login/logout/refresh flows
- [ ] **Screen tests** con React Native Testing Library:
  - LoginScreen: validación, submit, error handling
  - ClientListScreen: render, search, delete
  - EventFormScreen: wizard navigation, validation per step
  - DashboardScreen: render KPIs, upcoming events
- [ ] **E2E tests** con Maestro:
  - Flow 1: Login → Dashboard visible
  - Flow 2: Crear cliente → verificar en lista
  - Flow 3: Crear evento completo (4 steps) → ver resumen
  - Flow 4: Agregar pago → status cambia a confirmed
- [ ] **Assets**:
  - App icon (1024×1024) con branding Solennix
  - Splash screen
  - Adaptive icon (Android)
- [ ] **app.config.ts**:
  - Bundle identifier: `com.solennix.mobile`
  - Version: `1.0.0`
  - Permissions mínimas declaradas
  - Splash screen y icon configurados

### Criterio de Aceptación

Test suite passing. 0 crashes en flujos principales. App icon y splash screen configurados. Performance aceptable en dispositivo real de gama media.

---

## Fase 8: Release

**Objetivo:** App publicada en App Store y Play Store.

### Tareas

- [ ] Build con EAS Build:
  ```bash
  eas build --platform ios
  eas build --platform android
  ```
- [ ] Submit a TestFlight (iOS) y Google Play Internal Testing (Android)
- [ ] QA manual en dispositivos reales:
  - Al menos 1 iPhone (iOS 16+)
  - Al menos 1 Android (API 24+ / Android 7+)
  - Verificar todos los flujos principales
  - Verificar PDFs se generan y comparten correctamente
  - Verificar light/dark mode
- [ ] Fix bugs encontrados en QA
- [ ] Configurar RevenueCat production keys y verificar webhook
- [ ] App Store submission:
  - Screenshots (6.5" y 5.5" iPhone)
  - Description en español
  - Privacy policy URL
  - Age rating
- [ ] Play Store submission:
  - Feature graphic
  - Screenshots (phone)
  - Content rating questionnaire
  - Data safety section
- [ ] Submit para review
- [ ] Monitorear primera semana post-launch:
  - Crash reports (Sentry o EAS crashes)
  - RevenueCat dashboard (purchases)
  - User feedback en stores

### Criterio de Aceptación

App aprobada y publicada en ambas tiendas. Webhook de RevenueCat funcional en producción. Crash-free rate >99.5% en primera semana.

---

## Dependencias entre Fases

```
Fase 0 (Setup)
  │
  ▼
Fase 1 (Auth + Nav)
  │
  ├──────────────────┐
  ▼                  ▼
Fase 2 (Dashboard)  Fase 4 (Catálogo)
  │                  │
  ▼                  │
Fase 3 (Eventos) ◄──┘
  │
  ├──────────────────┐
  ▼                  ▼
Fase 5 (Calendar)   Fase 6 (Settings)
  │                  │
  └────────┬─────────┘
           ▼
     Fase 7 (Polish)
           │
           ▼
     Fase 8 (Release)
```

> **Nota:** Fases 2 y 4 pueden ejecutarse en paralelo si hay más de un desarrollador. Fase 3 depende de ambas (eventos usan productos del catálogo y datos de clientes). Fases 5 y 6 pueden ejecutarse en paralelo.

---

## Checklist Pre-Release

- [ ] Todos los servicios consumen el API correctamente
- [ ] Auth flow completo (login, register, forgot password, logout, 401 handling)
- [ ] CRUD funcional: clientes, eventos, productos, inventario, pagos
- [ ] Event wizard multi-step funcional con cálculos financieros correctos
- [ ] Calendario muestra eventos y navega a detalle
- [ ] 4 PDFs se generan y comparten correctamente
- [ ] Settings: editar perfil, branding, contract defaults
- [ ] Plan limits respetados (básico vs pro)
- [ ] RevenueCat: purchase flow y webhook funcionales
- [ ] Dark/light mode funcional
- [ ] Empty states en todas las listas
- [ ] Error handling en todas las pantallas
- [ ] Pull-to-refresh en todas las listas
- [ ] Loading states en todas las operaciones async
- [ ] Tests unitarios passing
- [ ] E2E tests passing
- [ ] No console.log en producción
- [ ] App icon y splash screen
- [ ] Bundle size <30MB
