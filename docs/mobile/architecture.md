# Arquitectura: Solennix Mobile

> Última actualización: 2026-02-25

## 1. Stack Tecnológico

| Capa           | Tecnología                            | Versión   |
| -------------- | ------------------------------------- | --------- |
| Framework      | React Native (New Architecture)       | 0.79+     |
| Tooling        | Expo (managed workflow)               | SDK 53    |
| Navigation     | React Navigation                      | 7.x       |
| State (global) | Zustand                               | 5.x       |
| Forms          | React Hook Form + Zod                 | 7.x / 4.x |
| HTTP Client    | `ApiClient` class (copiada de web)    | -         |
| Secure Storage | `expo-secure-store`                   | -         |
| Charts         | `victory-native`                      | -         |
| Calendar       | `react-native-calendars`              | -         |
| PDF            | `expo-print` + `expo-sharing`         | -         |
| Icons          | `lucide-react-native`                 | -         |
| Styling        | NativeWind (Tailwind CSS for RN)      | 4.x       |
| Subscriptions  | `react-native-purchases` (RevenueCat) | -         |
| Testing (unit) | Jest + React Native Testing Library   | -         |
| Testing (E2E)  | Maestro                               | -         |
| Date utils     | date-fns                              | 4.x       |

---

## 2. Estructura del Proyecto

```
mobile/
├── app.json                        # Expo config
├── app.config.ts                   # Expo config dinámico
├── package.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── nativewind-env.d.ts
├── tailwind.config.ts
├── App.tsx                         # Entry point
│
├── src/
│   ├── navigation/                 # Navegación (React Navigation)
│   │   ├── RootNavigator.tsx       # Auth check → AuthStack | MainTabs
│   │   ├── AuthStack.tsx           # Login, Register, ForgotPassword
│   │   ├── MainTabs.tsx            # Bottom tab navigator (5 tabs)
│   │   ├── HomeStack.tsx           # Dashboard → Event detail flows
│   │   ├── CalendarStack.tsx       # Calendar → Event flows
│   │   ├── ClientStack.tsx         # Client list → detail → form
│   │   ├── CatalogStack.tsx        # Products + Inventory tabs → forms
│   │   └── ProfileStack.tsx        # Settings → Pricing → Edit profile
│   │
│   ├── screens/                    # Pantallas (equivalente a pages/)
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   ├── home/
│   │   │   └── DashboardScreen.tsx
│   │   ├── calendar/
│   │   │   └── CalendarScreen.tsx
│   │   ├── events/
│   │   │   ├── EventFormScreen.tsx         # Multi-step wizard
│   │   │   ├── EventSummaryScreen.tsx      # Detail con tabs internos
│   │   │   └── components/                 # Sub-componentes de steps
│   │   │       ├── EventGeneralInfo.tsx
│   │   │       ├── EventProducts.tsx
│   │   │       ├── EventExtras.tsx
│   │   │       ├── EventFinancials.tsx
│   │   │       ├── Payments.tsx
│   │   │       └── QuickClientModal.tsx
│   │   ├── clients/
│   │   │   ├── ClientListScreen.tsx
│   │   │   ├── ClientFormScreen.tsx
│   │   │   └── ClientDetailScreen.tsx
│   │   ├── products/
│   │   │   ├── ProductListScreen.tsx
│   │   │   └── ProductFormScreen.tsx
│   │   ├── inventory/
│   │   │   ├── InventoryListScreen.tsx
│   │   │   └── InventoryFormScreen.tsx
│   │   ├── search/
│   │   │   └── SearchScreen.tsx
│   │   └── settings/
│   │       ├── SettingsScreen.tsx
│   │       └── PricingScreen.tsx
│   │
│   ├── components/                 # Componentes UI compartidos
│   │   ├── ConfirmDialog.tsx       # Modal de confirmación
│   │   ├── EmptyState.tsx          # Estado vacío con ilustración
│   │   ├── LoadingSpinner.tsx      # Indicador de carga
│   │   ├── Toast.tsx               # Notificaciones toast
│   │   ├── ToastContainer.tsx      # Container fijo para toasts
│   │   ├── UpgradeBanner.tsx       # Banner de upgrade de plan
│   │   ├── SearchBar.tsx           # Barra de búsqueda reutilizable
│   │   ├── SwipeableRow.tsx        # Row con swipe actions
│   │   └── KPICard.tsx             # Card de métricas del dashboard
│   │
│   ├── services/                   # Servicios API (copiados de web)
│   │   ├── clientService.ts
│   │   ├── eventService.ts
│   │   ├── productService.ts
│   │   ├── inventoryService.ts
│   │   ├── paymentService.ts
│   │   ├── searchService.ts
│   │   ├── eventPaymentService.ts
│   │   └── subscriptionService.ts  # Adaptado para RevenueCat
│   │
│   ├── lib/                        # Utilidades core
│   │   ├── api.ts                  # HTTP client (adaptado: SecureStore)
│   │   ├── errorHandler.ts         # Manejo de errores (copiado)
│   │   ├── finance.ts              # Cálculos financieros (copiado)
│   │   └── pdfGenerator.ts         # Generación PDF (reescrito: HTML→expo-print)
│   │
│   ├── hooks/                      # Custom hooks
│   │   ├── usePagination.ts        # Adaptado para infinite scroll
│   │   ├── usePlanLimits.ts        # Límites de plan (copiado)
│   │   └── useToast.ts             # Zustand toast store (copiado)
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx          # Auth context (adaptado: SecureStore)
│   │
│   ├── schemas/                    # Validaciones Zod (extraídas de forms)
│   │   ├── clientSchema.ts
│   │   ├── eventSchema.ts
│   │   ├── productSchema.ts
│   │   ├── inventorySchema.ts
│   │   ├── paymentSchema.ts
│   │   └── authSchema.ts
│   │
│   ├── types/
│   │   ├── supabase.ts             # Tipos DB (copiado directo de web)
│   │   └── navigation.ts           # Tipos de React Navigation
│   │
│   └── theme/                      # Sistema de diseño
│       ├── colors.ts               # Paleta de colores (light/dark)
│       ├── spacing.ts              # Escala de spacing
│       └── typography.ts           # Tipografías y tamaños
│
├── assets/                         # Assets estáticos
│   ├── icon.png                    # App icon (1024x1024)
│   ├── splash.png                  # Splash screen
│   └── adaptive-icon.png           # Android adaptive icon
│
└── tests/
    ├── setup.ts                    # Test setup (mocks)
    ├── mocks/
    │   ├── handlers.ts             # MSW handlers (copiado de web)
    │   └── server.ts               # MSW server
    └── __tests__/
        ├── services/               # Service tests
        ├── hooks/                  # Hook tests
        ├── screens/                # Screen tests
        └── lib/                    # Utility tests
```

---

## 3. Navegación

### Árbol de Navegación

```
RootNavigator (conditional)
│
├── AuthStack (cuando no hay token)
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── ForgotPasswordScreen
│
└── MainTabs (cuando hay token — 5 tabs)
    │
    ├── 🏠 Inicio (HomeStack)
    │   ├── DashboardScreen
    │   ├── EventSummaryScreen
    │   └── EventFormScreen
    │
    ├── 📅 Calendario (CalendarStack)
    │   ├── CalendarScreen
    │   ├── EventSummaryScreen
    │   └── EventFormScreen
    │
    ├── ➕ Nuevo Evento (acción directa → EventFormScreen en HomeStack)
    │
    ├── 👥 Clientes (ClientStack)
    │   ├── ClientListScreen
    │   ├── ClientDetailScreen
    │   ├── ClientFormScreen
    │   └── EventSummaryScreen (desde historial del cliente)
    │
    └── ☰ Más (ProfileStack)
        ├── SettingsScreen (links a sub-secciones)
        ├── ProductListScreen
        ├── ProductFormScreen
        ├── InventoryListScreen
        ├── InventoryFormScreen
        ├── PricingScreen
        └── SearchScreen
```

### Justificación de los 5 Tabs

| Tab                  | Motivo                                                                           |
| -------------------- | -------------------------------------------------------------------------------- |
| **Inicio**           | Acceso rápido a KPIs y eventos próximos — la vista que el usuario revisa primero |
| **Calendario**       | La vista más consultada en campo — "¿qué tengo esta semana?"                     |
| **➕ (FAB central)** | Crear evento es la acción primaria del negocio                                   |
| **Clientes**         | Segundo recurso más consultado — buscar info de contacto en sitio                |
| **Más**              | Agrupa features menos frecuentes: catálogo, inventario, búsqueda, configuración  |

---

## 4. Código Reutilizable de la Web

### Copia Directa (sin cambios)

| Archivo Web                            | Destino Mobile                     | Razón                                                     |
| -------------------------------------- | ---------------------------------- | --------------------------------------------------------- |
| `web/src/types/supabase.ts`            | `src/types/supabase.ts`            | Tipos puros de TypeScript, sin dependencias de plataforma |
| `web/src/lib/finance.ts`               | `src/lib/finance.ts`               | Cálculos puros, sin DOM ni APIs web                       |
| `web/src/lib/errorHandler.ts`          | `src/lib/errorHandler.ts`          | Solo usa `console`, funciona en RN                        |
| `web/src/services/clientService.ts`    | `src/services/clientService.ts`    | Depende solo de `api.ts`                                  |
| `web/src/services/eventService.ts`     | `src/services/eventService.ts`     | Depende solo de `api.ts`                                  |
| `web/src/services/productService.ts`   | `src/services/productService.ts`   | Depende solo de `api.ts`                                  |
| `web/src/services/inventoryService.ts` | `src/services/inventoryService.ts` | Depende solo de `api.ts`                                  |
| `web/src/services/paymentService.ts`   | `src/services/paymentService.ts`   | Depende solo de `api.ts`                                  |
| `web/src/services/searchService.ts`    | `src/services/searchService.ts`    | Depende solo de `api.ts`                                  |
| `web/src/hooks/usePlanLimits.ts`       | `src/hooks/usePlanLimits.ts`       | Depende de services + AuthContext                         |
| `web/src/hooks/useToast.ts`            | `src/hooks/useToast.ts`            | Zustand store puro                                        |

### Adaptación Menor (cambios pequeños)

| Archivo Web                        | Cambios Necesarios                                                                                                                                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/src/lib/api.ts`               | Reemplazar `localStorage.getItem/setItem` → `await SecureStore.getItemAsync/setItemAsync`. Eliminar `window.dispatchEvent('auth:logout')` → usar callback pattern o EventEmitter de RN. Hacer métodos de token `async`. |
| `web/src/contexts/AuthContext.tsx` | Usar `SecureStore` (async) en lugar de `localStorage`. Eliminar `window.addEventListener('auth:logout')` → suscripción al callback del ApiClient. Adaptar `useEffect` para carga async del token.                       |
| `web/src/hooks/usePagination.ts`   | Adaptar para infinite scroll: agregar `loadMore()`, `hasMore`, `isLoadingMore` en lugar de page numbers.                                                                                                                |

### Reescritura (lógica diferente)

| Archivo Web                               | Destino Mobile                        | Cambio                                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `web/src/lib/pdfGenerator.ts`             | `src/lib/pdfGenerator.ts`             | Reescribir usando HTML templates → `expo-print` → `expo-sharing`. Mantener misma interfaz `generateBudgetPDF()`, etc., pero internamente generar HTML en lugar de usar jsPDF. |
| `web/src/services/subscriptionService.ts` | `src/services/subscriptionService.ts` | Reemplazar Stripe checkout → RevenueCat SDK calls.                                                                                                                            |

### Código Nuevo (no existe en web)

| Archivo                           | Propósito                                                      |
| --------------------------------- | -------------------------------------------------------------- |
| `src/navigation/*.tsx`            | Toda la navegación es nueva (React Navigation vs React Router) |
| `src/components/SwipeableRow.tsx` | Patrón nativo: swipe-to-delete/edit                            |
| `src/components/KPICard.tsx`      | Card optimizada para mobile                                    |
| `src/schemas/*.ts`                | Validaciones Zod extraídas de los forms (en web están inline)  |
| `src/types/navigation.ts`         | Tipado de React Navigation params                              |
| `src/theme/*.ts`                  | Sistema de diseño nativo (en web usa Tailwind config)          |

---

## 5. Flujo de Autenticación

```
┌──────────────┐
│  App Launch   │
└──────┬───────┘
       ▼
┌──────────────────┐     No token    ┌──────────────┐
│ SecureStore.get   │────────────────►│  AuthStack    │
│ ('auth_token')    │                 │  (Login)      │
└──────┬───────────┘                 └──────┬───────┘
       │ Has token                          │ Login success
       ▼                                    │ Store token
┌──────────────────┐                        │
│ GET /api/auth/me  │◄──────────────────────┘
└──────┬───────────┘
       │ 200 OK          401 Unauthorized
       ▼                       ▼
┌──────────────┐     ┌──────────────────┐
│  MainTabs    │     │ Clear token →     │
│  (App)       │     │ AuthStack         │
└──────────────┘     └──────────────────┘
```

### Manejo de 401 en Requests

```typescript
// api.ts adaptado
class ApiClient {
  private onUnauthorized?: () => void;

  setOnUnauthorized(callback: () => void) {
    this.onUnauthorized = callback;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (response.status === 401) {
      await SecureStore.deleteItemAsync("auth_token");
      this.onUnauthorized?.(); // Trigger navigation to login
      throw new Error("Unauthorized");
    }
    // ... rest of handling
  }
}
```

---

## 6. Comunicación con Backend

La app mobile se conecta al **mismo backend Go** que la web. No hay cambios en el backend necesarios.

### Variable de Entorno

```
API_URL=https://api.solennix.com/api   # producción
API_URL=http://192.168.x.x:8080/api      # desarrollo local
```

> En desarrollo, usar la IP local en lugar de `localhost` porque el emulador no resuelve `localhost` al host.

### API Surface Utilizada

Todas las rutas del backend se consumen tal cual. Ver referencia completa en:

- [`backend/internal/router/router.go`](../../backend/internal/router/router.go)
- [API Route Reference en CLAUDE.md](../../CLAUDE.md)

La única diferencia es **subscripciones**: mobile usa RevenueCat en lugar de Stripe, pero el backend ya soporta ambos webhooks.

---

## 7. Generación de PDFs

### Web (actual)

```
jsPDF + jspdf-autotable → Blob → download
```

### Mobile (nuevo)

```
HTML string → expo-print (WebView render) → PDF file → expo-sharing (Share Sheet)
```

### Interfaz Consistente

```typescript
// Misma interfaz que en web, diferente implementación
export async function generateBudgetPDF(
  event,
  products,
  extras,
  user,
): Promise<void> {
  const html = buildBudgetHTML(event, products, extras, user);
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
}
```

Los templates HTML reutilizarán:

- `finance.ts` para todos los cálculos financieros
- Branding del usuario (logo_url, business_name, brand_color)
- Formato MXN para moneda
- Fechas en locale español

---

## 8. Esquema de Dependencias

```
expo-secure-store ──► lib/api.ts ──► services/*.ts ──► screens/*.tsx
                         │                                    │
                         ▼                                    ▼
                   contexts/AuthContext.tsx           components/*.tsx
                         │                                    │
                         ▼                                    ▼
                   navigation/RootNavigator.tsx        hooks/*.ts
                                                             │
                                                             ▼
                                                       lib/finance.ts
                                                       types/supabase.ts
```
