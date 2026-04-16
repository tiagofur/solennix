# 05 — Arquitectura Técnica iOS

**Última actualización:** 2026-04-16
**Versión de la app:** 1.0.4 (build 5)
**Estado:** Producción — App Store `https://apps.apple.com/mx/app/solennix/id6760874129`

---

## 1. Stack

| Componente | Versión / Valor |
|---|---|
| Swift | 5.9 |
| iOS deployment target | 17.0 |
| macOS deployment target (packages) | 14.0 (Sonoma) |
| Xcode requirement | 15.0+ |
| SwiftUI | sí — 100% declarativo, sin UIKit propio salvo UIAppearance |
| State framework | Observation (`@Observable`) — no `ObservableObject` / `@Published` |
| Persistencia local | SwiftData (`ModelContainer`) |
| Generación de proyecto | XcodeGen (`ios/project.yml`) |
| Gestión de paquetes | SPM únicamente, sin CocoaPods |
| Base URL API | `https://api.solennix.com/api` |
| Bundle ID | `com.solennix.app` |
| Development Team | `T5SKULSP2M` |

**Dependencias externas via SPM:**

| Paquete | Versión mínima | Usado en |
|---|---|---|
| `RevenueCat/purchases-ios-spm` | 5.0.0 | SolennixNetwork, SolennixFeatures |
| `google/GoogleSignIn-iOS` | 8.0.0 | SolennixNetwork |
| `getsentry/sentry-cocoa` | 8.43.0 | SolennixFeatures |

---

## 2. Estructura de paquetes SPM

```
ios/
├── project.yml                          # XcodeGen manifest
├── Packages/
│   ├── SolennixCore/                    # Modelos, caché, errores, rutas
│   │   └── Sources/SolennixCore/
│   │       ├── Models/                  # Event, Client, Product, InventoryItem,
│   │       │                            # Payment, User, PaginatedResponse, ...
│   │       ├── Cache/                   # CacheManager, CachedEvent, CachedClient,
│   │       │                            # CachedProduct, CachedInventoryItem,
│   │       │                            # CachedPayment, SolennixModelContainer
│   │       ├── Extensions/              # URL helpers, etc.
│   │       ├── APIError.swift
│   │       ├── Route.swift              # enum Route: Hashable (todos los destinos)
│   │       ├── SolennixEventAttributes.swift  # ActivityKit Live Activity
│   │       ├── SolennixNotificationNames.swift
│   │       ├── QuickQuoteTransferData.swift
│   │       ├── LegalURL.swift
│   │       └── EmptyResponse.swift
│   │
│   ├── SolennixNetwork/                 # HTTP, auth, suscripciones
│   │   └── Sources/SolennixNetwork/
│   │       ├── APIClient.swift          # actor — GET/POST/PUT/DELETE/upload
│   │       ├── APIClientEnvironmentKey.swift
│   │       ├── AuthManager.swift        # @Observable — sesión, tokens, biometría
│   │       ├── Endpoints.swift          # constantes de rutas API
│   │       ├── OfflineMutationQueue.swift  # actor — cola offline UserDefaults
│   │       ├── SubscriptionManager.swift   # @Observable — RevenueCat + StoreKit
│   │       ├── AppleSignInService.swift
│   │       ├── GoogleSignInService.swift
│   │       ├── KeychainHelper.swift
│   │       └── NetworkMonitor.swift     # @Observable — NWPathMonitor
│   │
│   ├── SolennixDesign/                  # Design tokens + componentes reutilizables
│   │   └── Sources/SolennixDesign/
│   │       ├── Colors.swift             # SolennixColors — adaptive dark/light
│   │       ├── Typography.swift
│   │       ├── Spacing.swift
│   │       ├── Shadows.swift
│   │       ├── Gradient.swift
│   │       └── Components/
│   │           ├── AdaptiveLayout.swift
│   │           ├── Avatar.swift
│   │           ├── CachedDataBanner.swift
│   │           ├── ConfirmDialog.swift
│   │           ├── EmptyStateView.swift
│   │           ├── InlineErrorBanner.swift
│   │           ├── PremiumButton.swift
│   │           ├── SkeletonView.swift
│   │           ├── SolennixTextField.swift
│   │           ├── StatusBadge.swift
│   │           ├── ToastOverlay.swift
│   │           └── UpgradeBannerView.swift
│   │
│   └── SolennixFeatures/               # Features completos: Views + ViewModels
│       └── Sources/SolennixFeatures/
│           ├── Auth/         Views + AuthViewModel
│           ├── Calendar/     Views + CalendarViewModel
│           ├── Clients/      Views + ClientFormVM + ClientListVM + QuickQuoteVM
│           ├── Common/       PlanLimitsManager, LiveActivityManager,
│           │                 SpotlightIndexer, SentryHelper, HapticsHelper,
│           │                 StoreReviewHelper, InlineFilterBar, QuickActionsFAB
│           ├── Dashboard/    Views + DashboardViewModel
│           ├── EventFormLinks/ Views + ViewModels
│           ├── Events/       Views + ViewModels + PDFGenerators/
│           │                 (Budget, Checklist, Contract, Equipment,
│           │                  Invoice, PaymentReport, ShoppingList)
│           ├── Inventory/    Views + ViewModels
│           ├── Onboarding/   Views + ViewModels
│           ├── Products/     Views + ViewModels
│           ├── Search/       SearchView + SearchViewModel
│           ├── Settings/     Views (About, BusinessSettings, ChangePassword,
│           │                  ContractDefaults, EditProfile, NotificationPrefs,
│           │                  Pricing, Settings, Subscription)
│           │                 ViewModels (BusinessSettingsVM, NotificationPrefsVM, SettingsVM)
│           └── Shared/       SafariView, helpers compartidos
│
├── Solennix/                           # App target principal
│   ├── SolennixApp.swift               # @main — DI root, init de todo
│   ├── AppDelegate.swift               # BGTask registration, APNS delegate
│   ├── ContentView.swift               # Router raíz (unknown/unauth/biometric/main)
│   ├── AuthFlowView.swift
│   ├── BackgroundTaskManager.swift     # BGAppRefreshTask
│   ├── Navigation/
│   │   ├── Route.swift                 # re-export + Tab + SidebarSection enums
│   │   ├── RouteDestination.swift      # switch Route → View
│   │   ├── CompactTabLayout.swift      # iPhone: 5 tabs con NavigationStack
│   │   ├── SidebarSplitLayout.swift    # iPad landscape: NavigationSplitView
│   │   ├── DeepLinkHandler.swift       # solennix:// scheme + Core Spotlight
│   │   └── MoreMenuView.swift
│   ├── Notifications/
│   │   ├── NotificationManager.swift   # @MainActor singleton
│   │   └── SolennixLiveActivityAttributes.swift
│   ├── Keyboard/
│   └── Widgets/
│
├── SolennixWidgetExtension/            # WidgetKit extension
├── SolennixLiveActivity/               # ActivityKit Live Activity UI
├── SolennixNotificationServiceExtension/  # UNNotificationServiceExtension
├── SolennixIntents/                    # App Intents / Siri
└── SolennixTests/                      # Unit tests (XCTest)
```

**Regla de dependencias:**

```
SolennixCore  ←  SolennixNetwork  ←  SolennixFeatures  ←  App target
SolennixCore  ←  SolennixDesign   ←  SolennixFeatures
```

`SolennixCore` no tiene dependencias externas. `SolennixNetwork` depende de `SolennixCore` + RevenueCat + GoogleSignIn. `SolennixFeatures` depende de los tres paquetes anteriores + Sentry + RevenueCat.

---

## 3. Capas y responsabilidades

```
┌─────────────────────────────────────────────────────────────┐
│  View (.swift)                                               │
│  SwiftUI View struct. Solo layout + bindings. No lógica.    │
│  Lee state via @Bindable / @Environment / computed props.   │
├─────────────────────────────────────────────────────────────┤
│  ViewModel (@Observable final class)                         │
│  @MainActor. Expone state como var properties. Llama a      │
│  APIClient para I/O. Gestiona loading/error/pagination.      │
│  Usa CacheManager para read-through / write-through.        │
├─────────────────────────────────────────────────────────────┤
│  APIClient (actor)                                           │
│  HTTP puro. get/post/put/delete/upload. Retry en GETs,      │
│  offline queue en mutaciones, 401 → token refresh.          │
├─────────────────────────────────────────────────────────────┤
│  CacheManager (@MainActor @Observable)                       │
│  SwiftData. Read-through para listas; write-through tras     │
│  fetch exitoso. Freshness por domain con timestamp.         │
├─────────────────────────────────────────────────────────────┤
│  Persistence: SwiftData ModelContainer                       │
│  Entidades: CachedClient, CachedEvent, CachedProduct,       │
│  CachedInventoryItem, CachedPayment.                        │
└─────────────────────────────────────────────────────────────┘
```

**Flujo de datos (caso de uso: cargar lista de eventos):**

1. View aparece → llama `viewModel.loadEvents()` vía `.task`.
2. ViewModel comprueba `CacheManager.getCachedEvents(maxAge: 1800)`. Si hay datos frescos, los muestra de inmediato (`isShowingCachedData = true`).
3. ViewModel llama `apiClient.getPaginated(Endpoint.events, params: ...)`.
4. `APIClient.buildRequest` adjunta Bearer token del Keychain y llama `URLSession`.
5. En 401, `APIClient` llama `AuthManager.refreshToken()` con `refreshTask` para colapsar intentos concurrentes; reintenta la request original con el nuevo token.
6. La respuesta se decodifica a `PaginatedResponse<Event>`. En error de red, intenta de nuevo hasta `maxRetries = 2` con backoff exponencial (solo en GETs).
7. ViewModel actualiza `events`, llama `cacheManager.cacheEvents(events)`, baja `isLoading`.
8. La View re-renderiza automáticamente por el `@Observable` macro.

**Flujo offline:**

- En pérdida de red durante una mutación (POST/PUT/DELETE), `APIClient` encola un `QueuedMutation` en `OfflineMutationQueue` (actor, persistido en `UserDefaults`).
- Al reconectar, `SolennixApp` llama `apiClient.flushQueuedMutations()` que reproduce las mutaciones en FIFO. Errores 4xx permanentes (excepto 429) descartan la mutación; errores de red la re-encolan.
- Los endpoints `/auth` y `/uploads` nunca se encolan.

---

## 4. Observabilidad y estado

**Patron `@Observable` (Observation framework, iOS 17+):**

Todos los managers y ViewModels usan `@Observable final class`. Ninguna clase usa `ObservableObject` / `@Published`. Las views consumen el estado directamente via `@State`, `@Environment`, o `@Bindable`.

**Inyección de dependencias:**

```swift
// En SolennixApp.body — managers inyectados vía .environment()
.environment(authManager)           // AuthManager
.environment(planLimitsManager)     // PlanLimitsManager
.environment(subscriptionManager)   // SubscriptionManager
.environment(\.apiClient, apiClient)  // APIClient via EnvironmentKey
.environment(toastManager)          // ToastManager
.environment(networkMonitor)        // NetworkMonitor
.environment(cacheManager)          // CacheManager (opcional)
.modelContainer(modelContainer)     // SwiftData ModelContainer
```

`APIClient` se pasa por `EnvironmentValues` (clave definida en `SolennixNetwork/APIClientEnvironmentKey.swift`). Los ViewModels reciben `apiClient` como parámetro de init en lugar de leerlo del environment directamente — esto mantiene los paquetes testables sin SwiftUI.

**Reglas de `@MainActor`:**

- Todos los métodos mutantes de ViewModels llevan `@MainActor`.
- `CacheManager` está anotado `@MainActor` a nivel de clase.
- `NotificationManager` es `@MainActor`.
- `BackgroundTaskManager` es `@MainActor`.
- `APIClient` es `actor` (no `@MainActor`) — las operaciones de red ocurren en el executor del actor.
- `AuthManager` es `@Observable` sin `@MainActor` de clase; sus mutaciones expuestas al UI son llamadas desde `@MainActor` contexts.

**Binding patterns:**

- `@Bindable(viewModel)` en views que necesitan two-way binding a propiedades del ViewModel.
- `@AppStorage` para preferencias persistidas en `UserDefaults` (appearance, hasSeenOnboarding, hasRequestedPushAuthorization).
- `@State` local para estado efímero de UI (sheet, alert triggers, animaciones).

---

## 5. Navegación

**Estructura:**

- iPhone (compact `horizontalSizeClass`): `CompactTabLayout` — `TabView` con 5 tabs (Inicio, Calendario, Eventos, Clientes, Más), cada uno con su propio `NavigationStack` y `NavigationPath` independiente.
- iPad landscape (regular + width > height): `SidebarSplitLayout` — `NavigationSplitView` con sidebar.
- iPad portrait: idem compact (tabs).

La detección es en `ContentView` via `@Environment(\.horizontalSizeClass)` y `GeometryReader`.

**`Route` enum** (definido en `SolennixCore/Route.swift`, re-exportado en `Solennix/Navigation/Route.swift`):

```
Route: Hashable {
  // Eventos
  eventList, eventDetail(id), eventForm(id?, clientId?, date?),
  eventChecklist(id), eventFinances(id), eventPayments(id),
  eventProducts(id), eventExtras(id), eventSupplies(id),
  eventEquipment(id), eventShoppingList(id), eventPhotos(id),
  eventContractPreview(id)

  // Clientes
  clientList, clientDetail(id), clientForm(id?), quickQuote

  // Productos
  productList, productDetail(id), productForm(id?)

  // Inventario
  inventoryList, inventoryDetail(id), inventoryForm(id?)

  // Herramientas
  search(query?), settings, eventFormLinks

  // Settings sub-rutas
  editProfile, changePassword, businessSettings, contractDefaults,
  pricing, subscription, notificationPreferences, about
}
```

`RouteDestination` (`ios/Solennix/Navigation/RouteDestination.swift`) resuelve cada `Route` a su vista concreta. Cada `NavigationStack` declara `.navigationDestination(for: Route.self) { RouteDestination(route: $0) }`.

**Pop-to-root:** Al re-tap de una tab activa, `CompactTabLayout` resetea el `NavigationPath` de esa tab.

**Deep links (`solennix://`):**

- `solennix://reset-password?token=TOKEN` → `DeepLinkAction.resetPassword(token:)` → inyecta `deepLinkResetToken` en `AuthFlowView`.

**Core Spotlight:** Indexación de clientes, eventos y productos via `SpotlightIndexer`. Al tap en un resultado, se publica `Notification.Name.spotlightNavigationRequested` con la `Route` correspondiente. `CompactTabLayout` / `SidebarSplitLayout` escuchan y navegan a Home tab + push route.

**Notificaciones push como deep link:** `NotificationManager.routeFromNotification` convierte el `userInfo` de un tap en push a una `Route` y la publica via `spotlightNavigationRequested`.

---

## 6. Networking

**`APIClient` — actor** (`ios/Packages/SolennixNetwork/Sources/SolennixNetwork/APIClient.swift`)

- `URLSession` configurada: `timeoutIntervalForRequest = 30`, `timeoutIntervalForResource = 60` (nota: P0-iOS-2 — el código actual tiene `waitsForConnectivity = true` pero la línea de `timeoutIntervalForResource` falta; ver Sección 14).
- `JSONDecoder` con `.convertFromSnakeCase`; `JSONEncoder` con `.convertToSnakeCase`.
- Idempotency key (`X-Idempotency-Key: UUID`) en POST/PUT/DELETE.

**Token handling:**

- `APIClient` lee el access token directamente de `KeychainHelper` (sin pasar por `AuthManager`) para evitar el ciclo de dependencia circular.
- En respuesta 401, `APIClient.attemptRefresh()` delega a `AuthManager.refreshToken()`. El `refreshTask: Task<Bool, Error>?` colapsa intentos concurrentes: solo un refresh ocurre a la vez; todos los waiters obtienen el mismo resultado.
- Los endpoints `/auth/*` (login, register, refresh, Google, Apple, forgot/reset password) están excluidos de la lógica de refresh para evitar loops infinitos.

**Retry:**

- Solo en GETs (`isIdempotent`): hasta `maxRetries = 2` intentos adicionales.
- Errores transitorios: `URLError` de tipo `.timedOut`, `.networkConnectionLost`, `.notConnectedToInternet`, `.cannotFindHost`, `.cannotConnectToHost`, `.dnsLookupFailed`.
- Errores de servidor 5xx también disparan retry en GETs.
- Backoff exponencial: 1s, 2s.

**Error mapping:**

```
URLError          → APIError.networkError(Spanish message)
HTTP 401          → APIError.unauthorized
HTTP 403/404      → APIError.serverError(statusCode, message)
HTTP 4xx          → APIError.serverError(statusCode, message)
HTTP 5xx          → APIError.serverError(statusCode, message)
JSONDecodeFailure → APIError.decodingError
```

Todos los `APIError` tienen `userFacingMessage` en español (ej. "Sin conexión a internet.", "Sesión expirada. Iniciá sesión de nuevo.").

**Offline mutation queue:**

- `OfflineMutationQueue` es un `actor` que persiste `[QueuedMutation]` como JSON en `UserDefaults["solennix.offlineMutationQueue"]`.
- `QueuedMutation` incluye: id, endpoint, method, bodyBase64, idempotencyKey, createdAt.
- La queue se reproduce en FIFO al reconectar o al login exitoso.
- Mutaciones 4xx permanentes (no 429) se descartan. Cualquier otro error detiene el replay y re-encola el restante.
- `/auth` y `/uploads` nunca se encolan.

**Upload:** `multipart/form-data` con boundary UUID. Soporta PNG y JPEG. Responde `UploadResponse { url, thumbnailUrl? }`.

---

## 7. Persistencia y caché

**SwiftData** es el único mecanismo de persistencia local. No hay SQLite directo, ni Core Data, ni GRDB.

**Schema** (`SolennixModelContainer`):

| Entidad SwiftData | Modelo de dominio | Campos clave |
|---|---|---|
| `CachedClient` | `Client` | id, name, phone, email, ... |
| `CachedEvent` | `Event` | id, clientId, eventDate, status, totalAmount, ... |
| `CachedProduct` | `Product` | id, name, price, ... |
| `CachedInventoryItem` | `InventoryItem` | id, ingredientName, currentStock, minimumStock, ... |
| `CachedPayment` | `Payment` | id, eventId, amount, paymentDate, ... |

**Creación del container** (`SolennixModelContainer.create()`):
1. Intenta `ModelConfiguration` persistente (`SolennixCache`).
2. Si falla, fallback a in-memory (`SolennixCacheFallback`).
3. Si ambos fallan, propaga el error — `SolennixApp.init` captura, reporta a Sentry y llama `fatalError`. (Nota: P0-iOS-3 pendiente — ver Sección 14.)

**CacheManager** (`@MainActor @Observable`):
- Operaciones: `cacheClients/Events/Products/InventoryItems/Payments` (replace-all), `getCached*` (fetch por dominio con freshness check), `clearAll`.
- Freshness: timestamp por dominio en `UserDefaults["solennix.cache.updatedAt.{domain}"]`. Los ViewModels pasan `maxAge: 1800` (30 min).
- Los ViewModels implementan read-through: muestran caché inmediatamente mientras la API carga, luego reemplazan con datos frescos.
- `isShowingCachedData: Bool` en los ViewModels de listas — la vista muestra `CachedDataBanner` cuando es verdadero.

**Background refresh** (`BackgroundTaskManager`):
- Tarea BGAppRefreshTask con identifier `com.solennix.app.refresh`.
- Se registra sincrónicamente en `AppDelegate.application(_:didFinishLaunchingWithOptions:)`.
- Al dispararse, hace fetch de events, clients, products, inventory en paralelo y actualiza: SwiftData cache, Spotlight index, widget data (WidgetKPIData + WidgetEventData via `WidgetDataSync`).
- Schedule mínimo: 30 minutos.

---

## 8. Notificaciones y push

**Registro APNS:**
- `AppDelegate.application(_:didRegisterForRemoteNotificationsWithDeviceToken:)` convierte el `Data` a hex string, lo guarda en `UserDefaults["pendingDeviceToken"]` y publica `Notification.Name.deviceTokenReceived`.
- `SolennixApp` escucha la notificación y llama `apiClient.post(Endpoint.registerDevice, body: ["token": token, "platform": "ios"])`.
- Si el usuario no está autenticado al recibir el token, el `pendingDeviceToken` se registra en el próximo login.

**Autorización:** Se solicita (`alert + badge + sound`) una sola vez, guardado en `@AppStorage("hasRequestedPushAuthorization")`. Se verifica en cada login.

**Categorías y acciones:**

| Categoría | Acción |
|---|---|
| `EVENT_CATEGORY` | `VIEW_EVENT` (foreground) |
| `PAYMENT_CATEGORY` | `VIEW_PAYMENT` (foreground) |
| `INVENTORY_CATEGORY` | `VIEW_INVENTORY` (foreground) |

**Recordatorios locales (NotificationManager):**
- Tres `ReminderType` por evento confirmado: `one_day` (−24h), `one_hour` (−1h), `thirty_minutes` (−30m).
- Identifier: `"{eventId}_{reminderType}"`.
- Sincronización (`syncUpcomingEventReminders`): cancela reminders de eventos no encontrados en el fetch de upcoming, reprograma los vigentes. Se invoca al foreground y al login.

**Push types recibidos del backend:**

```swift
enum PushNotificationType: String, Codable {
    case eventReminder    = "event_reminder"
    case paymentReceived  = "payment_received"
    case lowStock         = "low_stock"
    case eventConfirmed   = "event_confirmed"
    case eventCancelled   = "event_cancelled"
}
```

Tap en push → `routeFromNotification` → `Route` → publicado como `spotlightNavigationRequested` → `CompactTabLayout` navega.

**Live Activities (ActivityKit):**

- `SolennixEventAttributes` (en `SolennixCore`) define los atributos estáticos (clientName, eventType, location, guestCount) y el `ContentState` dinámico (status, startTime, elapsedMinutes, statusLabel).
- `SolennixLiveActivityView` proporciona la UI para Dynamic Island y Lock Screen widget.
- `LiveActivityManager` (en `SolennixFeatures/Common`) registra el push token de Live Activity en `Endpoint.registerLiveActivityToken` para actualizaciones remotas.
- El módulo está envuelto en `#if canImport(ActivityKit)` para compatibilidad macOS.

**Notification Service Extension** (`SolennixNotificationServiceExtension`, bundle `com.solennix.app.notifications`):
- Intercepta notificaciones remotas antes de mostrarlas — permite enriquecer con imágenes o descifrar contenido cifrado si se implementa.

**Widget Extension** (`SolennixWidgetExtension`, bundle `com.solennix.app.widgets`):
- Comparte datos con la app principal via `App Group: group.com.solennix.app`.
- `WidgetDataSync` (en el app target Widgets/) escribe eventos próximos y KPIs.
- Depende de SolennixCore, SolennixDesign, SolennixNetwork.

**BGTaskScheduler:**
- Task ID `com.solennix.app.refresh` declarado en `Info.plist` (`BGTaskSchedulerPermittedIdentifiers`).
- Registro en `AppDelegate` (requerido antes de que `didFinishLaunchingWithOptions` retorne).

---

## 9. Integraciones externas

### Google Sign-In
- SDK: `google/GoogleSignIn-iOS` 8.0.0.
- `GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: "43149798972-...")` en `SolennixApp.init`.
- `AppDelegate.application(_:open:options:)` delega a `GIDSignIn.sharedInstance.handle(url)`.
- `GoogleSignInService` (en SolennixNetwork) gestiona el flujo. `AuthManager.signInWithGoogle(idToken:fullName:)` envía el id_token al backend.
- `GoogleService-Info.plist` incluido como recurso del target.

### Sign in with Apple
- `AppleSignInService` en SolennixNetwork.
- `AuthManager.signInWithApple(identityToken:authorizationCode:fullName:email:)`.
- Entitlement: `com.apple.developer.applesignin: [Default]`.

### RevenueCat
- `SubscriptionManager` (@Observable) en SolennixNetwork.
- Configurado con `REVENUECAT_PUBLIC_API_KEY` leído de `Info.plist` (inyectado via `Config/Secrets.xcconfig` en build time).
- Entitlement pro: `"pro_access"`.
- Producto IDs: `solennix_premium_monthly`, `solennix_premium_yearly`.
- Fallback directo a StoreKit 2 si los offerings de RevenueCat no cargan (3 reintentos con delay).
- `setBackendPremiumStatus(true)` permite al backend forzar premium cuando el usuario compró por web/Stripe y RevenueCat aún no refleja el estado.

### Sentry
- SDK: `getsentry/sentry-cocoa` 8.43.0.
- `SentryHelper.configure(dsn:environment:releaseName:)` en `SolennixApp.init`.
- `releaseName = "ios@{version}+{build}"`.
- `SentryUserTrackingDelegate` implementa `UserTrackingDelegate` para asociar el usuario con sesiones de Sentry tras login.
- Captura errores de: SwiftData init, push registration, token refresh, background refresh, deep link failures.

### TipKit (Onboarding)
- `TipsHelper.configure()` en `SolennixApp.init`.
- `OnboardingTips.swift` define los tips contextuales.

### Core Spotlight
- `SpotlightIndexer` indexa clientes, eventos y productos con identifier format `solennix.{type}.{id}`.
- El índice se actualiza en cada background refresh.

### StoreKit (reviewes)
- `StoreReviewHelper` solicita review en momentos oportunos.

---

## 10. Build y distribución

**XcodeGen:**

El proyecto Xcode se genera a partir de `ios/project.yml` con `xcodegen generate`. **No commitear `Solennix.xcodeproj` — generarlo antes de abrir Xcode.** El directorio `Solennix.xcodeproj` está en el repo como snapshot pero `project.yml` es la fuente de verdad.

**Targets:**

| Target | Tipo | Bundle ID |
|---|---|---|
| Solennix | application | `com.solennix.app` |
| SolennixWidgetExtension | app-extension | `com.solennix.app.widgets` |
| SolennixNotificationServiceExtension | app-extension | `com.solennix.app.notifications` |
| SolennixTests | bundle.unit-test | `com.solennix.app.tests` |

**Schemes:**

- `Solennix` — Debug/Release; StoreKit config: `Solennix/SolennixProducts.storekit`; corre tests de `SolennixTests`.
- `SolennixWidgetExtension` — `askForAppToLaunch: true`.

**Secrets / Build config:**

- `Config/Secrets.xcconfig` provee `REVENUECAT_PUBLIC_API_KEY`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT` como variables de build setting.
- `Info.plist` los consume via `$(REVENUECAT_PUBLIC_API_KEY)` etc.
- `Secrets.xcconfig` NO está en control de versiones — se genera localmente o via CI secret.

**Firma:**

- `CODE_SIGN_STYLE: Automatic` en Debug y Release.
- `DEVELOPMENT_TEAM: T5SKULSP2M`.

**Versiones:**

- `MARKETING_VERSION: 1.0.4` → CFBundleShortVersionString.
- `CURRENT_PROJECT_VERSION: 5` → CFBundleVersion.

**Distribución:**

- App Store — Live en `https://apps.apple.com/mx/app/solennix/id6760874129`.
- `DEBUG_INFORMATION_FORMAT: dwarf-with-dsym` en todas las configs para simbolización Sentry.

**Entitlements principales (app):**

- `com.apple.developer.applesignin: [Default]`
- `com.apple.security.application-groups: [group.com.solennix.app]`

---

## 11. Convenciones

### Naming

| Artefacto | Convención | Ejemplo |
|---|---|---|
| View | `{Nombre}View.swift` | `EventDetailView.swift` |
| ViewModel | `{Nombre}ViewModel.swift` | `EventDetailViewModel.swift` |
| Manager singleton | `{Nombre}Manager.swift` | `CacheManager.swift` |
| Cache entity | `Cached{Nombre}.swift` | `CachedEvent.swift` |
| ViewModel property: lista | `events`, `clients` | `var events: [Event]` |
| Loading flag | `isLoading: Bool` | estándar en todos los VMs |
| Error flag | `errorMessage: String?` | estándar en todos los VMs |

### Idioma

- **UI copy:** español (es_MX). Strings en el código fuente directamente — no hay `Localizable.strings` todavía.
- **Código:** inglés — nombres de variables, funciones, comments técnicos.
- **Comments de dominio en Español** cuando describen comportamiento de negocio ("// Cotizado significa que el cliente aún no confirmó").

### `@MainActor`

- Todos los métodos mutantes de ViewModels llevan `@MainActor`.
- `P0-iOS-1`: `EventDetailViewModel.addPhotos` falta `@MainActor` — data race latente (ver Sección 14).
- No usar `DispatchQueue.main.async` — siempre `await MainActor.run { }` o `@MainActor`.

### Error handling

- Los ViewModels no hacen `fatalError` — siempre setean `errorMessage`.
- `APIClient` muestra toasts automáticamente para errores visibles al usuario; los VMs no necesitan toasts adicionales salvo casos especiales.
- Sentry captura errores inesperados (SwiftData, push registration, background tasks) via `SentryHelper.capture(error:context:)`.

### `@Observable` pattern

- No mezclar con `@Published` / `ObservableObject` en la misma clase.
- No usar `didSet` en propiedades de `@Observable` classes (P1-iOS-2) — usar computed properties o `.onChange` en la view.
- ViewModels como `final class` (no structs) para mantener identidad de referencia.

### PDF generation

Los PDFs se generan en `SolennixFeatures/Events/PDFGenerators/`:
- `BudgetPDFGenerator`
- `ChecklistPDFGenerator`
- `ContractPDFGenerator`
- `EquipmentListPDFGenerator`
- `InvoicePDFGenerator`
- `PaymentReportPDFGenerator`
- `ShoppingListPDFGenerator`

Usando UIKit (`UIGraphicsPDFRenderer` o similar) y son exportables via `ShareLink`.

### Plan limits

`PlanLimitsManager` (@Observable) expone:
- `canCreateEvent: Bool` — free tier: 3 eventos/mes
- `canCreateClient: Bool` — free tier: 50 clientes
- `canCreateCatalogItem: Bool` — free tier: 20 productos/insumos
- Views muestran `UpgradeBannerView` o `PremiumButton` cuando el límite se alcanza.

---

## 12. Testing

**Framework:** XCTest — target `SolennixTests` (iOS, bundle `com.solennix.app.tests`).

**Tests existentes:**

- `SolennixTests/NotificationManagerTests.swift` — 5 test cases:
  - `testExtractEventIdFromReminderIdentifier` — verifica parsing del identifier de notificación.
  - `testResolveEventDateUsesStartTimeWhenPresent` — verifica que se usa `startTime` del evento.
  - `testResolveEventDateFallsBackToNineAm` — fallback a 09:00 cuando no hay `startTime`.
  - `testRouteFromNotificationForEventReminder` — routeo de push a `Route.eventDetail`.
  - `testRouteFromNotificationForViewPaymentAction` — routeo de acción `VIEW_PAYMENT`.
  - `testRouteFromNotificationForLowStock` — routeo de `low_stock` a `Route.inventoryList`.

**Tests de paquetes:**

- `SolennixNetwork` declara `SolennixNetworkTests` en su `Package.swift` pero el directorio no se verifica en este audit — presumiblemente vacío.

**Limitaciones conocidas:**

- `SolennixWidgetExtension` y `SolennixLiveActivity` dependen de `ActivityKit` que no está disponible en macOS nativo — imposible correr `swift test` en macOS para paquetes que importen `ActivityKit`. Los tests del app target requieren simulator o device iOS.
- No hay UI tests (XCUITest) ni integration tests end-to-end.
- No hay mocking de `APIClient` — los tests existentes son de unidades puras (parsing, routing). ViewModels con lógica de negocio no están cubiertos.

**Cobertura real:** Baja — solo la capa de `NotificationManager`. Los ViewModels (lógica de filtrado, paginación, CSV export, métricas del dashboard) no tienen cobertura automatizada.

---

## 13. Inventario de features (para PRD/02)

Lista de todas las pantallas y capacidades visibles al usuario, agrupadas por área. Esta sección es la fuente de verdad para la matriz de paridad cross-platform.

### Auth

| Feature / Pantalla | Detalle |
|---|---|
| Login con email + contraseña | `LoginView` |
| Registro con email + contraseña | `RegisterView` |
| Sign in with Google | `LoginView` — botón nativo GIDSignIn |
| Sign in with Apple | `LoginView` — `SignInWithAppleButton` nativo |
| Recuperar contraseña (forgot password) | `ForgotPasswordView` |
| Reset de contraseña via deep link | `ResetPasswordView` — recibe token `solennix://reset-password?token=X` |
| Biometric unlock (Face ID / Touch ID) | `BiometricGateView` — opt-in, configurable en Settings |
| Onboarding (primera vez) | `OnboardingView` — slides `OnboardingPageView`, se muestra una sola vez |

### Dashboard / Inicio

| Feature / Pantalla | Detalle |
|---|---|
| KPI cards | Ventas netas del mes, efectivo cobrado, IVA cobrado, IVA pendiente |
| Gráfico de estado de eventos | `EventStatusChart` — distribución quoted/confirmed/completed/cancelled |
| Gráfico comparativo financiero | `FinancialComparisonChart` — tendencia de ingresos 6 meses |
| Eventos próximos | Lista de hasta 5 eventos confirmados futuros |
| Tarjeta de atención | `AttentionEventsCard` — eventos vencidos, pagos pendientes, sin confirmar en próximos 7-14 días |
| Modal de eventos pendientes | `PendingEventsModalView` |
| Cambio de estado de evento inline | Desde dashboard sin entrar al detalle |
| Checklist de onboarding | `OnboardingChecklistView` — "Agrega tu primer cliente", "Crea tu primer evento", etc. |

### Eventos

| Feature / Pantalla | Detalle |
|---|---|
| Lista de eventos | `EventListView` — paginación (20/página), infinite scroll |
| Filtros de estado | quoted / confirmed / completed / cancelled |
| Filtros avanzados | Por cliente, por rango de fechas |
| Búsqueda local | Por tipo de servicio, nombre de cliente, ubicación, ciudad |
| Exportar CSV | Genera CSV con eventos filtrados |
| Crear / editar evento | `EventFormView` — multi-step form |
| Detalle de evento | `EventDetailView` — muestra todos los datos del evento |
| Checklist del evento | `EventChecklistView` |
| Finanzas del evento | `EventFinancesDetailView` — desglose de costos, margen, IVA |
| Pagos del evento | `EventPaymentsDetailView` — registrar y ver pagos |
| Productos del evento | `EventProductsDetailView` — items del catálogo asignados |
| Extras del evento | `EventExtrasDetailView` |
| Insumos del evento | `EventSuppliesDetailView` |
| Equipamiento del evento | `EventEquipmentDetailView` |
| Lista de compras del evento | `EventShoppingListView` |
| Fotos del evento | `EventPhotosDetailView` — carga de imágenes |
| Vista previa de contrato | `EventContractPreviewView` |
| Exportar presupuesto PDF | `BudgetPDFGenerator` |
| Exportar checklist PDF | `ChecklistPDFGenerator` |
| Exportar contrato PDF | `ContractPDFGenerator` |
| Exportar lista de equipamiento PDF | `EquipmentListPDFGenerator` |
| Exportar factura PDF | `InvoicePDFGenerator` |
| Exportar reporte de pagos PDF | `PaymentReportPDFGenerator` |
| Exportar lista de compras PDF | `ShoppingListPDFGenerator` |
| Live Activity (Dynamic Island) | Progreso en tiempo real del evento activo |

### Clientes

| Feature / Pantalla | Detalle |
|---|---|
| Lista de clientes | `ClientListView` — búsqueda y filtrado |
| Detalle de cliente | `ClientDetailView` — historial de eventos, datos de contacto |
| Crear / editar cliente | `ClientFormView` |
| Cotización rápida | `QuickQuoteView` — crear cotización sin cliente previo |
| Hoja de cliente rápido | `QuickClientSheet` — crear cliente inline desde el form de evento |

### Productos / Catálogo

| Feature / Pantalla | Detalle |
|---|---|
| Lista de productos | `ProductListView` — búsqueda |
| Detalle de producto | `ProductDetailView` — precio, ingredientes/insumos |
| Crear / editar producto | `ProductFormView` |

### Inventario / Insumos

| Feature / Pantalla | Detalle |
|---|---|
| Lista de inventario | `InventoryListView` — con alertas de stock bajo |
| Detalle de insumo | `InventoryDetailView` |
| Crear / editar insumo | `InventoryFormView` |
| Alerta de stock bajo | Push notification tipo `low_stock` + badge en lista |

### Calendario

| Feature / Pantalla | Detalle |
|---|---|
| Vista de calendario mensual | `CalendarView` + `CalendarGridView` — eventos por día |
| Bloquear fecha | `BlockDateSheet` — marcar fecha como no disponible |
| Ver fechas bloqueadas | `BlockedDatesSheet` |

### Links de formulario de eventos

| Feature / Pantalla | Detalle |
|---|---|
| Gestión de links de formulario | `EventFormLinksView` — generar y compartir links públicos para que clientes completen datos |

### Búsqueda global

| Feature / Pantalla | Detalle |
|---|---|
| Búsqueda unificada | `SearchView` — busca clientes, eventos, productos, inventario simultáneamente |
| Búsqueda en System Search | Core Spotlight — indexa clientes, eventos, productos |

### Settings / Configuración

| Feature / Pantalla | Detalle |
|---|---|
| Settings principal | `SettingsView` — hub de configuración |
| Editar perfil | `EditProfileView` — nombre, foto de perfil, email |
| Cambiar contraseña | `ChangePasswordView` |
| Configuración del negocio | `BusinessSettingsView` — nombre del negocio, logo, dirección, RFC |
| Defaults del contrato | `ContractDefaultsView` — clausulas, depósito %, días de cancelación, % reembolso |
| Precios | `PricingView` — configuración de precios base |
| Suscripción | `SubscriptionView` — ver plan, comparar free vs pro, comprar |
| Preferencias de notificaciones | `NotificationPreferencesView` — activar/desactivar tipos de notificación |
| Acerca de | `AboutView` — versión, links legales |
| Desbloqueo biométrico | Opción en Settings — toggle Face ID / Touch ID |
| Apariencia | `@AppStorage("appearance")` — light / dark / system |
| Cerrar sesión | Desde SettingsView |

### Notificaciones

| Feature / Pantalla | Detalle |
|---|---|
| Recordatorio de evento (−24h) | Local — para eventos confirmados |
| Recordatorio de evento (−1h) | Local — para eventos confirmados |
| Recordatorio de evento (−30min) | Local — para eventos confirmados |
| Notificación de pago recibido | Local (al registrar pago) + push remoto |
| Alerta de stock bajo | Push remoto |
| Evento confirmado | Push remoto |
| Evento cancelado | Push remoto |

### Widgets (iOS Home Screen)

| Widget | Detalle |
|---|---|
| Eventos próximos | Lista de hasta 10 eventos confirmados/cotizados |
| KPIs | Ingresos del mes, eventos de la semana, conteo de stock bajo |

---

## 14. Debt conocido

Todos los items P0 e ítems P2/P3 relevantes a iOS del audit 2026-04-16 (referencia: `PRD/11_CURRENT_STATUS.md`).

### P0 — Críticos (bloquean producción o causan crashes)

**P0-iOS-1** — `EventDetailViewModel.swift:275`: `addPhotos` sin `@MainActor` muta estado `@Observable` desde un contexto async — data race de concurrencia en Swift. Todos los otros métodos mutantes de la clase tienen `@MainActor`. Fix: agregar `@MainActor` al signature del método.

**P0-iOS-2** — `APIClient.swift`: `URLSessionConfiguration.waitsForConnectivity = true` sin `timeoutIntervalForResource` explícito. El default de `timeoutIntervalForResource` es 7 días — una request offline o detrás de un captive portal puede quedar suspendida indefinidamente, bloqueando también el token refresh. Fix: añadir `config.timeoutIntervalForResource = 60`.

**P0-iOS-3** — `SolennixModelContainer.swift`: Si tanto persistent como in-memory SwiftData fallan (posible tras update de iOS que cambie el schema), el `fatalError` en `SolennixApp.init` crashea sin recovery. Fix: propagar el error al caller y mostrar un alert antes de terminar.

### P1 — Alto impacto

**P1-iOS-1** — `DashboardView`: `.onAppear` dispara `loadDashboard()` en cada aparición — flicker visible y 8 requests redundantes por cada round-trip de navegación. Fix: usar `.task` (auto-cancel) o gate con staleness check.

**P1-iOS-2** — `ClientListViewModel`, `ProductListViewModel`, `InventoryListViewModel`: anti-pattern `@Observable + didSet`. El macro `@Observable` reescribe el storage en Swift 5.9+ y no garantiza que `didSet` se ejecute — filtrado puede quedar stale tras cambio de searchQuery o sort. Fix: convertir a computed properties o usar `.onChange` en la view.

**P1-iOS-3** — `EventDetailViewModel.swift:79–81`: `canStartLiveActivity` aloca un `DateFormatter()` en cada acceso, y se lee en cada render del body. Fix: `private static let` formatter.

**P1-iOS-4** — `ContractTemplateTextView.swift:66`: `try! NSRegularExpression(...)`. Pattern seguro hoy, pero el `try!` es frágil ante futuros cambios. Fix: `try?` con fallback o `do/catch` con `fatalError` explícito y mensaje descriptivo.

### P2 — Medio impacto

**P2-iOS-1** — `EventDetailViewModel.removePhoto(at:)`: borra la foto localmente antes de confirmar el PUT. Si el PUT falla, `errorMessage` se setea pero la URL no se restaura → divergencia permanente entre UI y backend. Fix: snapshot del array, restore on error (mirror del patrón `softDeleteClient`).

**P2-iOS-2** — `APIClient.swift` multipart body: 5 force-unwraps `String.data(using: .utf8)!`. Riesgo técnicamente bajo pero unsafe. Fix: `Data(string.utf8)` (non-failable initializer).

**P2-iOS-3** — `DashboardViewModel`: 8 GETs secuenciales por load pese a que el endpoint agregado `/api/dashboard/kpis` ya existe en el backend. Con un RTT de 200ms, esto suma ~1.6s de latencia serial. Fix: migrar a los endpoints agregados.

### P3 — Bajo impacto / polish

**P3-iOS-1** — `EventDetailView` y otros: helpers `formatDateShort`, `parseDateComponents` allokan 2–3 `DateFormatter` por invocación del `body`. Fix: `private static let` a nivel de view.

**P3-iOS-2** — KPICard, AttentionEventsCard, EventStatusChart y otros: ~24 vistas con elementos interactivos (charts, status buttons) sin `accessibilityLabel`/`accessibilityValue`. Fix: pass de anotaciones VoiceOver.

