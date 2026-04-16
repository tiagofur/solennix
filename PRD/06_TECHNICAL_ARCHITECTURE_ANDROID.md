# 06 — Arquitectura Técnica Android

> **Fecha de auditoría:** 2026-04-16  
> **Estado:** Producción — versionCode 2, versionName 1.0  
> **App ID:** `com.solennix.app`  
> **Namespace Gradle:** `com.creapolis.solennix`

---

## 1. Stack

### Versiones clave

| Componente | Versión |
|---|---|
| Kotlin | 2.1.0 |
| Android Gradle Plugin | 8.13.2 |
| Compose BOM | 2024.12.01 |
| Min SDK | 26 (Android 8.0) |
| Target/Compile SDK | 35 (Android 15) |
| Java compatibility | 17 |
| Ktor Client | 3.0.3 |
| Hilt | 2.53.1 |
| Room | 2.6.1 |
| Kotlinx Serialization | 1.7.3 |
| Navigation Compose | 2.8.5 |
| Lifecycle / ViewModel | 2.8.7 |
| Coil 3 | 3.0.4 |
| Firebase BOM | 33.9.0 |
| RevenueCat | 8.10.1 |
| WorkManager | 2.10.0 |
| Paging 3 | 3.3.4 |
| Glance (widgets) | 1.1.1 |
| Vico (charts) | 2.0.0-alpha.28 |
| Biometric | 1.2.0-alpha05 |
| DataStore | 1.1.1 |
| Play Billing | 7.1.1 |
| JUnit 5 | 5.11.3 |
| MockK | 1.13.13 |
| Turbine | 1.2.0 |

### Plugins Gradle

- `com.android.application` / `com.android.library`
- `org.jetbrains.kotlin.android`
- `org.jetbrains.kotlin.plugin.compose` (Compose Compiler)
- `org.jetbrains.kotlin.plugin.serialization`
- `com.google.dagger.hilt.android`
- `com.google.devtools.ksp` (2.1.0-1.0.29)
- `de.mannodermaus.android-junit5`
- `com.google.gms.google-services`
- `androidx.baselineprofile`

Catálogo de versiones centralizado en `android/gradle/libs.versions.toml`.

---

## 2. Multi-module (módulos Gradle)

### Árbol de módulos

```
Solennix (root)
├── :app                      — Application shell, MainActivity, NavHost, DI entry
├── :core
│   ├── :core:model           — Entidades de dominio (data classes @Serializable, sin dependencia Android)
│   ├── :core:network         — Ktor Client, AuthManager, ApiService, Endpoints, NetworkMonitor
│   ├── :core:database        — Room database, DAOs, entities, migrations
│   ├── :core:data            — Repositories (offline-first), PlanLimitsManager, AppSearchIndexer
│   └── :core:designsystem    — SolennixTheme, componentes compartidos, tokens de diseño
├── :feature
│   ├── :feature:auth         — Login, Register, ForgotPassword, ResetPassword, BiometricGate
│   ├── :feature:dashboard    — Dashboard KPIs, OnboardingScreen
│   ├── :feature:events       — EventList, EventDetail, sub-screens de evento, generadores de PDF
│   ├── :feature:clients      — ClientList, ClientDetail, ClientForm, QuickQuote
│   ├── :feature:products     — ProductList, ProductDetail, ProductForm, DemandForecastChart
│   ├── :feature:inventory    — InventoryList, InventoryDetail, InventoryForm
│   ├── :feature:calendar     — CalendarScreen (vista mensual de eventos)
│   ├── :feature:search       — SearchScreen (búsqueda cross-entidad)
│   └── :feature:settings     — Settings, EditProfile, BusinessSettings, ContractDefaults,
│                               NotificationPreferences, SubscriptionScreen, EventFormLinks,
│                               About, Privacy, Terms, ChangePassword
├── :widget                   — Glance widgets: UpcomingEvents, KPI, QuickActions
└── :baselineprofile          — Baseline Profile para Google Play (benchmark-macro-junit4)
```

### Grafo de dependencias

```
:app ──────────────────────────► :feature:*
:app ──────────────────────────► :core:*
:feature:* ────────────────────► :core:data
:feature:* ────────────────────► :core:model
:feature:* ────────────────────► :core:network  (algunos, ej. auth, settings)
:feature:* ────────────────────► :core:designsystem
:core:data ────────────────────► :core:database
:core:data ────────────────────► :core:network
:core:data ────────────────────► :core:model
:core:network ─────────────────► :core:model
:core:database ────────────────► :core:model
:widget ────────────────────────► :core:database  (acceso directo, sin Hilt)
:widget ────────────────────────► :core:model
```

La regla es: los módulos `:feature` NO dependen entre sí. Toda la lógica compartida vive en `:core`.

### Qué contiene cada módulo

| Módulo | Contenido principal |
|---|---|
| `:core:model` | Data classes: `Event`, `Client`, `Product`, `InventoryItem`, `Payment`, `User`, `SubscriptionStatus`, `QuickQuoteTransferData`, extensiones de formateo de moneda/fecha |
| `:core:network` | `KtorClient` (OkHttp engine, SSL pinning, retry, bearer auth), `AuthManager` (tokens en `EncryptedSharedPreferences`), `ApiService` (wrapError, métodos tipados), `Endpoints` (constantes de rutas), `NetworkMonitor`, `EventDayNotificationManager` |
| `:core:database` | `SolennixDatabase` v6, 6 DAOs, 7 entidades `Cached*`, `SyncStatus` enum, `JsonConverters`, `MIGRATION_4_5` + `MIGRATION_5_6` |
| `:core:data` | Repositories offline-first (`OfflineFirstClientRepository`, etc.), `PlanLimitsManager`, `LocalCacheManager`, `AppSearchIndexer`, `RemotePagingSource`, `ImageCompressor`, DI modules |
| `:core:designsystem` | `SolennixTheme`, `SolennixColorScheme`, tokens (Color, Typography, Spacing, Elevation, Shape, Gradient), componentes: `SolennixTopAppBar`, `SolennixTextField`, `KPICard`, `StatusBadge`, `Avatar`, `EmptyState`, `SkeletonLoading`, `SwipeRevealActions`, `QuickActionsFAB`, `UpgradeBanner`, `UpgradePlanDialog`, `PremiumButton`, componentes adaptive |
| `:widget` | `UpcomingEventsWidget`, `KpiWidget`, `QuickActionsWidget` con sus receivers; `WidgetAuthProvider` para acceso directo a Room sin Hilt |

---

## 3. Capas y responsabilidades

### Flujo de datos

```
UI (Composable Screen)
  │  collectAsStateWithLifecycle()
  ▼
ViewModel (@HiltViewModel, viewModelScope)
  │  emite StateFlow<UiState>  +  SharedFlow<UiEvent>
  ▼
Repository (interface en :core:data)
  │
  ├─► Room DAO (Flow<List<Entity>>) — fuente de verdad local
  │     └── entity.asExternalModel() → modelo de dominio
  │
  └─► ApiService (Ktor) — acceso remoto
        └── response → entity.asEntity() → DAO.insert/update
```

### Patrón offline-first

Los repositories (ej. `OfflineFirstEventRepository`) siguen este contrato:

1. `getEvents(): Flow<List<Event>>` — lee directamente desde Room, emite cambios en tiempo real.
2. `syncEvents()` — llama a la API, persiste en Room. Lo invoca `SyncWorker`.
3. Escrituras locales: marca la entity con `SyncStatus.PENDING_INSERT/UPDATE/DELETE`, persiste en Room inmediatamente. `SyncWorker.syncPendingChanges()` sube al servidor cuando hay conectividad.

### UiState en ViewModels

Cada ViewModel expone:
- `uiState: StateFlow<T>` con sealed class de estado (Loading / Success / Error)
- `uiEvent: SharedFlow<UiEvent>` para eventos one-shot (snackbar, navegación)
- Propiedades `mutableStateOf` para campos de formulario

Patrón de ejemplo en `AuthViewModel`:
```kotlin
var isLoading by mutableStateOf(false)
var errorMessage by mutableStateOf<String?>(null)
val authState: StateFlow<AuthManager.AuthState> = authManager.authState
private val _loginSuccess = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
```

### Paging 3

Los listados grandes (eventos, clientes) soportan paginación remota vía `RemotePagingSource` en `:core:data`. Los repositories exponen variantes `getEventsRemotePaging(sort, order, status, query): Flow<PagingData<Event>>` que cargan directamente desde la API.

---

## 4. DI con Hilt

### Módulos registrados

| Módulo Hilt | Ubicación | Alcance | Provee |
|---|---|---|---|
| `NetworkModule` | `:core:network` `di/NetworkModule.kt` | `SingletonComponent` | `EncryptedSharedPreferences`, `AuthManager`, `KtorClient`, `ApiService`, `NetworkMonitor` |
| `DatabaseModule` | `:core:database` `di/DatabaseModule.kt` | `SingletonComponent` | `SolennixDatabase`, todos los DAOs |
| `DataModule` | `:core:data` `di/DataModule.kt` | `SingletonComponent` | Bindings de interfaces `*Repository` → implementaciones `OfflineFirst*` |
| `DataStoreModule` | `:core:data` `di/DataStoreModule.kt` | `SingletonComponent` | `DataStore<Preferences>` para preferencias de usuario |

### Entry points especiales

- `SolennixMessagingService` usa `@EntryPoint` + `EntryPointAccessors` para inyectar `SettingsRepository` y `AuthManager` en el `FirebaseMessagingService` (que no es inyectable directamente).
- `SyncWorker` usa `@HiltWorker` + `@AssistedInject` para inyección en WorkManager.
- Los widgets (`UpcomingEventsWidget`, `KpiWidget`, `QuickActionsWidget`) NO usan Hilt — acceden a Room vía `SolennixDatabase.getInstance(context)` (singleton manual), y verifican autenticación vía `WidgetAuthProvider` que lee `EncryptedSharedPreferences` directamente.

### Scopes utilizados

- `@Singleton`: todos los managers, repositories, DAOs, Ktor client
- `@HiltViewModel`: todos los ViewModels de features
- `@ActivityRetainedScoped`: no se usa explícitamente — todo es Singleton o ViewModel

---

## 5. Navegación

### Estructura general

La navegación usa **Compose Navigation 2.8.5** con dos NavHosts distintos dependiendo del estado de autenticación, gestionado por `MainNavHost.kt`.

```
MainActivity
  └── MainNavHost
        ├── [Unknown]     → CircularProgressIndicator (splash)
        ├── [Unauthenticated] → AuthNavHost
        │     ├── "login"
        │     ├── "register"
        │     ├── "forgot"
        │     └── "reset-password?token={token}"  (+ deeplink solennix://reset-password)
        ├── [BiometricLocked] → BiometricGateScreen
        └── [Authenticated]
              ├── Compact (phone) → CompactBottomNavLayout
              │     Bottom bar: HOME, CALENDAR, EVENTS, CLIENTS, MORE
              │     NavHost con ~30 rutas de string
              └── Wide (tablet/foldable) → AdaptiveNavigationRailLayout
                    (actualmente redirige a CompactBottomNavLayout — pendiente)
```

### Rutas de navegación (string-based)

Las rutas son strings, no type-safe serialized objects (no usa la API de rutas tipadas de Navigation 2.8+). Se pasan args como query params o path segments:

| Ruta | Screen |
|---|---|
| `home` | DashboardScreen |
| `calendar` | CalendarScreen |
| `events` | EventListScreen |
| `clients` | ClientListScreen |
| `more` | MoreMenuScreen |
| `search?query={query}` | SearchScreen |
| `event_detail/{eventId}` | EventDetailScreen |
| `event_form?eventId={eventId}` | EventFormScreen |
| `event_checklist/{eventId}` | EventChecklistScreen |
| `event_finances/{eventId}` | EventFinancesScreen |
| `event_payments/{eventId}` | EventPaymentsScreen |
| `event_products/{eventId}` | EventProductsScreen |
| `event_extras/{eventId}` | EventExtrasScreen |
| `event_equipment/{eventId}` | EventEquipmentScreen |
| `event_supplies/{eventId}` | EventSuppliesScreen |
| `event_shopping/{eventId}` | EventShoppingListScreen |
| `event_photos/{eventId}` | EventPhotosScreen |
| `event_contract/{eventId}` | EventContractPreviewScreen |
| `client_detail/{clientId}` | ClientDetailScreen |
| `client_form?clientId={clientId}` | ClientFormScreen |
| `quick_quote?clientId={clientId}` | QuickQuoteScreen |
| `product_detail/{productId}` | ProductDetailScreen |
| `product_form?productId={productId}` | ProductFormScreen |
| `products` | ProductListScreen |
| `inventory_detail/{itemId}` | InventoryDetailScreen |
| `inventory_form?itemId={itemId}` | InventoryFormScreen |
| `inventory` | InventoryListScreen |
| `settings` | SettingsScreen |
| `edit_profile` | EditProfileScreen |
| `change_password` | ChangePasswordScreen |
| `business_settings` | BusinessSettingsScreen |
| `contract_defaults` | ContractDefaultsScreen |
| `notification_preferences` | NotificationPreferencesScreen |
| `pricing` | SubscriptionScreen |
| `event_form_links` | EventFormLinksScreen |
| `about` | AboutScreen |
| `privacy` | PrivacyScreen |
| `terms` | TermsScreen |

### Deep links

Scheme `solennix://` registrado en `AndroidManifest.xml` con `autoVerify=true` para reset-password.

`parseAppDeepLinkRoute()` en `MainNavHost.kt` mapea:
- `solennix://event/{id}` → `event_detail/{id}`
- `solennix://event/{id}/{action}` → `event_{action}/{id}` (checklist, finances, payments, products, extras, equipment, supplies, shopping, photos, contract)
- `solennix://client/{id}` → `client_detail/{id}`
- `solennix://product/{id}` → `product_detail/{id}`
- `solennix://inventory/{id}` → `inventory_detail/{id}`
- `solennix://new-event` → `event_form?eventId=`
- `solennix://calendar`, `solennix://settings`, `solennix://pricing`
- `solennix://search?query={q}`
- `solennix://quick-quote?clientId={id}`

### Back stack

- `popUpTo(startDestinationId) { inclusive = false }` + `launchSingleTop = true` en navegación de bottom bar (evita acumulación).
- `popBackStack()` para retroceder desde pantallas detail/form.

---

## 6. Networking

### Ktor Client

Archivo: `android/core/network/src/main/java/com/creapolis/solennix/core/network/KtorClient.kt`

Engine: **OkHttp** con timeouts de 30s (connect/read/write).

Plugins instalados:
- `ContentNegotiation` con `kotlinx-serialization-json` (`ignoreUnknownKeys=true`, `isLenient=true`, `coerceInputValues=true`)
- `HttpRequestRetry`: máximo 3 reintentos, retry en HTTP 5xx y en `ConnectException`/`SocketTimeoutException`, backoff exponencial
- `Auth` (bearer): `loadTokens` lee de `EncryptedSharedPreferences`; `refreshTokens` delega a `AuthManager.refreshAndGetTokens()` con Mutex para evitar race conditions; `sendWithoutRequest = true`
- `Logging`: nivel HEADERS en debug

Base URL: `BuildConfig.API_BASE_URL` inyectado en `defaultRequest`.

### SSL Pinning

`buildCertificatePinner()` en `KtorClient.kt` construye un `CertificatePinner` de OkHttp a partir de `BuildConfig.SSL_PINS` (comma-separated `sha256/<base64>=` pins). Si está vacío (debug), se loguea warning y no se pina. Release builds requieren mínimo 2 pins (verificado en `app/build.gradle.kts`).

### AuthManager

Archivo: `android/core/network/src/main/java/com/creapolis/solennix/core/network/AuthManager.kt`

- Tokens almacenados en `EncryptedSharedPreferences` (AES256-GCM / AES256-SIV, clave maestra AES256_GCM).
- Estado: `AuthState.Unknown | Authenticated | Unauthenticated | BiometricLocked` expuesto como `StateFlow`.
- Token refresh: `refreshMutex: Mutex` garantiza un solo refresh concurrente. Client dedicado `refreshHttpClient` (sin el plugin `Auth` para evitar ciclos). En 4xx del servidor llama `clearTokens()` → estado `Unauthenticated`. En error transitorio devuelve `null` (la sesión se preserva).
- Biométrico: si `biometric_enabled=true` en prefs y `BiometricManager.BIOMETRIC_SUCCESS`, pasa a `BiometricLocked`.
- FCM token: `storeFcmToken()` / `getFcmToken()` en mismas prefs.

### ApiService y error model

Archivo: `android/core/network/src/main/java/com/creapolis/solennix/core/network/ApiService.kt`

`wrapError {}` traduce excepciones de Ktor a `SolennixException`:
- `ResponseException` (4xx/5xx) → `SolennixException.Server(code, message)` o `.Auth` si 401
- `IOException` → `SolennixException.Network`
- Cualquier otra → `SolennixException.Unknown`

Métodos genéricos tipados: `get<T>(endpoint, params, TypeInfo)`, `post<T>`, `put<T>`, `delete`, `upload` (multipart).

### Endpoints

Archivo: `android/core/network/src/main/java/com/creapolis/solennix/core/network/Endpoints.kt`

Objeto singleton con constantes y funciones para: auth (register, login, logout, refresh, forgot-password, reset-password, me, change-password, google, apple), clients, events (con sub-recursos: products, extras, items, equipment, supplies, photos), equipment-conflicts/suggestions, supply-suggestions, products (con ingredients), inventory, payments, unavailable-dates, search, upload, profile, subscription status, event-form-links, devices (register/unregister FCM).

---

## 7. Persistencia

### Room Database

Archivo: `android/core/database/src/main/java/com/creapolis/solennix/core/database/SolennixDatabase.kt`

- Nombre: `solennix-database`
- Versión actual: **6**
- `exportSchema = true` (schemas exportados desde v6)
- `@TypeConverters(JsonConverters::class)` para serializar listas/objetos embebidos como JSON

### Entidades (tablas)

| Clase | Tabla | Notas |
|---|---|---|
| `CachedClient` | `clients` | `sync_status: SyncStatus` |
| `CachedEvent` | `events` | Incluye campos financieros, `sync_status` |
| `CachedProduct` | `products` | |
| `CachedInventoryItem` | `inventory_items` | |
| `CachedPayment` | `payments` | |
| `CachedEventProduct` | `event_products` | `product_name TEXT` añadida en v6 |
| `CachedEventExtra` | `event_extras` | |

Enum `SyncStatus`: `SYNCED | PENDING_INSERT | PENDING_UPDATE | PENDING_DELETE`

### Migraciones

| Migración | Cambio |
|---|---|
| 4→5 | No-op (bump de versión sin cambio de schema) |
| 5→6 | `ALTER TABLE event_products ADD COLUMN product_name TEXT` |

### DAOs

- `ClientDao` — CRUD + Flow<List<CachedClient>>, count
- `EventDao` — CRUD + Flow por filtros, upcoming, count por mes, pending sync
- `ProductDao` — CRUD + Flow, active count
- `InventoryDao` — CRUD + Flow
- `PaymentDao` — CRUD + Flow por evento
- `EventItemDao` — CRUD para `CachedEventProduct` y `CachedEventExtra`

Todos los queries de lectura devuelven `Flow<T>` para reactividad automática.

### DataStore

`DataStoreModule` provee `DataStore<Preferences>` para preferencias de UI (tema, onboarding, etc.). `SettingsRepositoryImpl` abstrae el acceso.

---

## 8. Notificaciones y background work

### FCM

- `SolennixMessagingService` extiende `FirebaseMessagingService`, declarado en `AndroidManifest.xml`.
- `onNewToken`: guarda token en `EncryptedSharedPreferences` vía `AuthManager.storeFcmToken()`, luego llama a `SettingsRepository.registerFcmToken(token)` si el usuario está autenticado (endpoint `devices/register`).
- `onMessageReceived`: soporta mensajes con `notification` payload (título/body directo) y mensajes `data-only` (extrae `title`/`body` del mapa). Construye deep link desde campo `deeplink` o desde `type`+`id`.
- Canal de notificaciones: `solennix_notifications` ("Notificaciones Generales", `IMPORTANCE_DEFAULT`).

### Notificaciones de día de evento

`EventDayNotificationManager` en `:core:network`: canal `event_day` con `IMPORTANCE_HIGH`. Muestra notificaciones persistentes (ongoing) para eventos confirmados del día. Se invoca desde `SyncWorker` post-sync.

### WorkManager

`SyncWorker` en `:app` (anotado `@HiltWorker`):
- Sync periódico cada **15 minutos** con `PeriodicWorkRequestBuilder`, constraints: `CONNECTED` + `BATTERY_NOT_LOW`, backoff exponencial.
- One-time sync expedited disponible vía `requestImmediateSync()`.
- Secuencia: subir cambios pendientes (PENDING_INSERT/UPDATE/DELETE) → descargar eventos/clientes/productos/inventario → verificar eventos del día → indexar para búsqueda local.
- Máximo 3 reintentos con `Result.retry()`.

### Quick Settings Tile

`NewEventTileService` declarado en `AndroidManifest.xml` con permiso `BIND_QUICK_SETTINGS_TILE` — tile de acceso rápido para crear evento desde el panel de notificaciones.

### App Shortcuts

`android:shortcuts` en Manifest apunta a `@xml/shortcuts` — accesos directos estáticos/dinámicos desde el ícono de la app.

### Glance Widgets

Tres widgets declarados en `AndroidManifest.xml`:

| Widget | Receiver | Descripción |
|---|---|---|
| Eventos próximos | `UpcomingEventsWidgetReceiver` | Lista de próximos eventos desde Room |
| KPIs | `KpiWidgetReceiver` | Métricas clave (ingresos, eventos del mes) |
| Acciones rápidas | `QuickActionsWidgetReceiver` | Botones para nuevo evento, quick quote |

Los widgets leen directamente de Room vía `SolennixDatabase.getInstance(context)` sin Hilt. `WidgetAuthProvider` verifica si el usuario tiene sesión activa antes de mostrar datos.

---

## 9. Integraciones externas

### Google Sign-In

- Librería: `androidx.credentials` + `credentials-play-services-auth` + `com.google.android.libraries.identity.googleid`
- Flujo: `GoogleSignInButton` en `:feature:auth` invoca `AuthViewModel.loginWithGoogle()`, que obtiene el `id_token` de Google y lo envía al backend en `POST auth/google`.
- Resultado: el backend devuelve `AuthResponse` con `access_token` + `refresh_token` + `user`.

### Apple Sign-In

- Librería: Sign In with Apple SDK para Android (Min API 26).
- `AppleSignInButton` en `:feature:auth`. Envío del `id_token` al backend en `POST auth/apple`.
- Estado: funcional para usuarios existentes; nuevos usuarios tienen bug en backend (P0-BE-1, ver PRD/11).

### Firebase Cloud Messaging (FCM)

- Firebase BOM 33.9.0, `firebase-messaging` + `firebase-analytics`.
- `google-services` plugin aplicado en `:app`.
- Token registrado en backend vía `devices/register` al autenticarse o al rotar token.
- Token eliminado en logout vía `devices/unregister`.

### RevenueCat

- SDK 8.10.1, inicializado en `SolennixApp.onCreate()` con `BuildConfig.REVENUECAT_API_KEY`.
- `BillingManager` en `:feature:settings` gestiona offerings, purchase, restore, customer info.
- Entitlement: `pro_access` (alineado con iOS).
- Planes: Basic (3 eventos/mes, 50 clientes, 20 productos), Pro (20/500/100), Premium (ilimitado).
- Si `REVENUECAT_API_KEY` está vacío (debug), `BillingManager` expone `BillingState.Error` — la app no crashea.
- En login exitoso, `AuthViewModel` también llama `Purchases.logIn(userId)` para asociar el usuario.

### Play Billing (directo)

- `billing-ktx` 7.1.1 en el catálogo, disponible para flujos de billing nativos si se requiere alternativa a RevenueCat.

### Coil 3

- `coil-compose` + `coil-network-ktor3` — carga de imágenes en UI, fetcher Ktor compartido con el cliente autenticado.
- Configurado en `SolennixApp.newImageLoader()` con `crossfade=true`.

### Biometric

- `androidx.biometric` 1.2.0-alpha05. `AuthManager.isBiometricAvailable()` verifica `BIOMETRIC_STRONG`. `BiometricGateScreen` muestra prompt y llama `authManager.unlockWithBiometric()` o `failedBiometric()`.

---

## 10. Build y distribución

### Variantes

- `debug` — sin minificación, sin signing config requerido, `REVENUECAT_API_KEY` puede estar vacío, SSL pinning desactivado.
- `release` — `isMinifyEnabled=true`, `isShrinkResources=true`, ProGuard, signing obligatorio.

### Signing

Credenciales resueltas en orden:
1. Variables de entorno CI: `SOLENNIX_KEYSTORE_FILE`, `SOLENNIX_KEYSTORE_PASSWORD`, `SOLENNIX_KEY_ALIAS`, `SOLENNIX_KEY_PASSWORD`
2. Archivo `android/key.properties` (gitignored)

Si faltan, `assembleRelease`/`bundleRelease` fallan con `GradleException` explícito.

### BuildConfig fields

- `REVENUECAT_API_KEY: String` — inyectado en `app/build.gradle.kts`
- `API_BASE_URL: String` — definido en `core/network/build.gradle.kts`
- `API_HOST: String` — para SSL pinning
- `SSL_PINS: String` — comma-separated, para `CertificatePinner`

### Fail-fast en release

`missingReleaseSecrets` en `app/build.gradle.kts` verifica en `doFirst` de tasks `assembleRelease`/`bundleRelease`:
1. Signing config presente
2. `REVENUECAT_API_KEY` no vacío
3. `SOLENNIX_SSL_PINS` con mínimo 2 pins

### Baseline Profile

`:baselineprofile` con `benchmark-macro-junit4` + `uiautomator`. Plugin `androidx.baselineprofile` aplicado en `:app`. `profileinstaller` incluido para distribución del perfil con la APK.

---

## 11. Convenciones

### Nomenclatura de archivos

| Tipo | Sufijo | Ejemplo |
|---|---|---|
| Screen Composable | `Screen.kt` | `EventDetailScreen.kt` |
| ViewModel | `ViewModel.kt` | `EventDetailViewModel.kt` |
| Repository interface | `Repository.kt` | `EventRepository.kt` |
| Repository impl | sufijo `Impl` o `OfflineFirst` | `OfflineFirstEventRepository` |
| Room Entity | `Cached*.kt` | `CachedEvent.kt` |
| Room DAO | `*Dao.kt` | `EventDao.kt` |
| Hilt Module | `*Module.kt` | `NetworkModule.kt` |

### Idioma

- UI (strings en pantalla): **español** (ej. "Eventos del Día", "Cotización Rápida")
- Código (nombres de clases, funciones, variables): **inglés**
- Comentarios de código: mix (muchos en español explicando reglas de negocio LATAM)

### Package layout

```
com.creapolis.solennix
  ├── (app) — MainActivity, SolennixApp, MainNavHost
  ├── service/  — FirebaseMessagingService, TileService
  ├── sync/     — SyncWorker
  └── ui/navigation/ — NavHosts, layouts, TopLevelDestination

com.creapolis.solennix.core.{module}/
  ├── di/       — Hilt modules
  ├── entity/   — Room entities (en :database)
  ├── dao/      — Room DAOs (en :database)
  ├── repository/ — interfaces + impls (en :data)
  └── ...

com.creapolis.solennix.feature.{name}/
  ├── ui/       — Composable screens
  ├── viewmodel/ — ViewModels
  └── pdf/      — PDF generators (en :events, :clients)

com.creapolis.solennix.widget/ — Glance widgets
```

### Manejo de errores

- `SolennixException` sealed class con variantes Network, Server, Auth, Unknown
- ViewModels capturan excepciones y emiten a `errorMessage` o `UiEvent.ShowSnackbar`
- `UiEventSnackbarHandler` en `:core:designsystem` maneja la presentación de snackbars
- Errores de límite de plan: `LimitCheckResult.LimitReached` → muestra `UpgradePlanDialog`

### Otros patrones

- `asExternalModel()` / `asEntity()` — extensiones de conversión entre Room entities y domain models, co-locadas con la entity
- `runCatchingApi {}` — helper en `:core:network` que wrappea `SolennixException`
- Imagen comprimida antes de upload: `ImageCompressor` en `:core:data`
- `LocalNavScopes` en designsystem para acceso a scopes de composición

---

## 12. Testing

### Infraestructura

- JUnit 5 (`junit-jupiter-api/engine/params`) via plugin `android-junit5`
- MockK 1.13.13 para mocking de Kotlin
- Turbine 1.2.0 para testing de Flows/StateFlows
- `kotlinx-coroutines-test` 1.9.0 + `TestCoroutineDispatcher`
- `ktor-client-mock` para tests de networking
- `hilt-android-testing` para tests con DI

### Tests existentes

| Archivo | Tipo | Qué testea |
|---|---|---|
| `AuthManagerTest.kt` | Unit | Token refresh, biometric, clearTokens, race condition con Mutex |
| `ClientRepositoryTest.kt` | Unit (MockK) | `getClients()`, `createClient()`, `syncClients()`, manejo de `SolennixException` |
| `RemotePagingSourceTest.kt` | Unit | `PagingSource.load()` con Ktor mock |
| `DashboardViewModelTest.kt` | Unit (Turbine) | States de loading/success/error, KPIs |
| `DashboardAccessibilityTest.kt` | UI | Content descriptions en KPI cards |
| `EventDetailViewModelTest.kt` | Unit (Turbine) | Load, update, delete de evento |
| `EventFormViewModelTest.kt` | Unit | Validación de formulario, create vs update |
| `EventAccessibilityTest.kt` | UI | Accesibilidad en listas de eventos |

### Cobertura y gaps

- Cobertura parcial: auth, repositories core, ViewModels de dashboard y events.
- Sin cobertura: feature:clients (UI), feature:products, feature:inventory, feature:settings, feature:calendar, feature:search.
- Sin tests de integración de Room (sin `Room.inMemoryDatabaseBuilder`).
- Sin tests de widgets Glance.
- Sin tests end-to-end con UI real (no hay Espresso/Compose UI tests en el proyecto).

---

## 13. Inventario de features (para PRD/02)

### Auth

| Screen / Funcionalidad | Ruta de nav | ViewModel |
|---|---|---|
| Login (email + password + Google + Apple) | `login` | `AuthViewModel` |
| Registro de cuenta | `register` | `AuthViewModel` |
| Recuperación de contraseña | `forgot` | `AuthViewModel` |
| Reset de contraseña (deep link desde email) | `reset-password?token=` | `AuthViewModel` |
| Biometric Gate (FaceID/Fingerprint) | — (modal) | `AuthViewModel` |
| Logout | desde Settings | `SettingsViewModel` |

### Dashboard

| Screen / Funcionalidad | Ruta de nav | ViewModel |
|---|---|---|
| Dashboard principal (KPIs: ingresos mes, eventos mes, pendientes) | `home` | `DashboardViewModel` |
| Próximos eventos (lista resumida desde dashboard) | `home` | `DashboardViewModel` |
| Alertas de stock bajo desde dashboard | `home` | `DashboardViewModel` |
| FAB acciones rápidas (Nuevo Evento, Cotización Rápida) | global (top-level) | — |
| Onboarding screen (primer uso) | — (modal) | — |
| Checklist de onboarding (en dashboard) | `home` | `DashboardViewModel` |

### Eventos

| Screen / Funcionalidad | Ruta de nav | ViewModel |
|---|---|---|
| Lista de eventos (filtros: estado, búsqueda, fecha) | `events` | `EventListViewModel` |
| Detalle de evento | `event_detail/{id}` | `EventDetailViewModel` |
| Formulario crear/editar evento | `event_form?eventId=` | `EventFormViewModel` |
| Checklist del evento | `event_checklist/{id}` | `EventChecklistViewModel` |
| Finanzas del evento (resumen financiero) | `event_finances/{id}` | `EventDetailViewModel` |
| Pagos del evento | `event_payments/{id}` | `EventDetailViewModel` |
| Productos del evento (asignación de productos del catálogo) | `event_products/{id}` | `EventDetailViewModel` |
| Extras del evento (servicios adicionales) | `event_extras/{id}` | `EventDetailViewModel` |
| Equipamiento del evento (con detección de conflictos) | `event_equipment/{id}` | `EventDetailViewModel` |
| Insumos del evento | `event_supplies/{id}` | `EventDetailViewModel` |
| Lista de compras del evento | `event_shopping/{id}` | `EventDetailViewModel` |
| Fotos del evento (galería, upload desde cámara/galería) | `event_photos/{id}` | `EventDetailViewModel` |
| Preview de contrato del evento | `event_contract/{id}` | `EventDetailViewModel` |
| Generación PDF: presupuesto | — (acción en evento) | — |
| Generación PDF: checklist | — | — |
| Generación PDF: contrato | — | — |
| Generación PDF: lista de equipamiento | — | — |
| Generación PDF: factura/boleta | — | — |
| Generación PDF: reporte de pagos | — | — |
| Generación PDF: lista de compras | — | — |
| Sub-screens de detalle (EventDetailSubScreens.kt) | — | `EventDetailViewModel` |

### Clientes

| Screen / Funcionalidad | Ruta de nav | ViewModel |
|---|---|---|
| Lista de clientes (búsqueda, paginación) | `clients` | `ClientListViewModel` |
| Detalle de cliente (historial de eventos, datos de contacto) | `client_detail/{id}` | `ClientDetailViewModel` |
| Formulario crear/editar cliente | `client_form?clientId=` | `ClientFormViewModel` |
| Cotización rápida (Quick Quote) | `quick_quote?clientId=` | `QuickQuoteViewModel` |
| Generación PDF: cotización rápida | — (acción en QuickQuote) | — |
| Convertir cotización a evento | desde QuickQuote → `event_form` | `QuickQuoteViewModel` |

### Productos

| Screen / Funcionalidad | Ruta de nav | ViewModel |
|---|---|---|
| Lista de productos (catálogo, filtros por categoría) | `products` | `ProductListViewModel` |
| Detalle de producto (ingredientes/componentes, historial de uso) | `product_detail/{id}` | `ProductDetailViewModel` |
| Formulario crear/editar producto | `product_form?productId=` | `ProductFormViewModel` |
| Gráfico de demanda (DemandForecastChart) | en ProductDetail | `ProductDetailViewModel` |

### Inventario

| Screen / Funcionalidad | Ruta de nav | ViewModel |
|---|---|---|
| Lista de inventario (stock, alertas de bajo stock) | `inventory` | `InventoryListViewModel` |
| Detalle de ítem de inventario | `inventory_detail/{id}` | `InventoryDetailViewModel` |
| Formulario crear/editar ítem | `inventory_form?itemId=` | `InventoryFormViewModel` |

### Calendario

| Screen / Funcionalidad | Ruta de nav | ViewModel |
|---|---|---|
| Calendario mensual de eventos | `calendar` | `CalendarViewModel` |
| Tap en evento del calendario → EventDetail | desde calendar | `CalendarViewModel` |

### Búsqueda

| Screen / Funcionalidad | Ruta de nav | ViewModel |
|---|---|---|
| Búsqueda global (clientes, eventos, productos, inventario) | `search?query=` | `SearchViewModel` |
| Resultado con deep link a entidad | desde search | `SearchViewModel` |

### Configuración

| Screen / Funcionalidad | Ruta de nav | ViewModel |
|---|---|---|
| Pantalla principal de settings | `settings` | `SettingsViewModel` |
| Editar perfil de usuario | `edit_profile` | `EditProfileViewModel` |
| Cambiar contraseña | `change_password` | `ChangePasswordViewModel` |
| Configuración del negocio (nombre, logo, datos fiscales) | `business_settings` | `BusinessSettingsViewModel` |
| Defaults de contrato (cláusulas predeterminadas) | `contract_defaults` | `ContractDefaultsViewModel` |
| Preferencias de notificaciones | `notification_preferences` | `NotificationPreferencesViewModel` |
| Suscripción / Upgrade (RevenueCat, planes Basic/Pro/Premium) | `pricing` | `SubscriptionViewModel` |
| Enlaces de formulario de eventos (para compartir con clientes) | `event_form_links` | `EventFormLinksViewModel` |
| Acerca de la app | `about` | — |
| Privacidad | `privacy` | — |
| Términos y condiciones | `terms` | — |

### Notificaciones

| Funcionalidad | Canal |
|---|---|
| Push FCM (eventos, pagos, sistema) | `solennix_notifications` |
| Notificación persistente evento del día | `event_day` (IMPORTANCE_HIGH) |

### Widgets (pantalla de inicio)

| Widget | Receiver |
|---|---|
| Próximos eventos | `UpcomingEventsWidgetReceiver` |
| KPIs (ingresos, eventos del mes) | `KpiWidgetReceiver` |
| Acciones rápidas (nuevo evento, cotización) | `QuickActionsWidgetReceiver` |

### System UI

| Funcionalidad | Implementación |
|---|---|
| Quick Settings Tile "Nuevo Evento" | `NewEventTileService` |
| App Shortcuts (estáticos) | `@xml/shortcuts` |
| FileProvider para share de PDFs | `androidx.core.content.FileProvider` |

---

## 14. Debt conocido

Referencia completa: `PRD/11_CURRENT_STATUS.md` (auditoría 2026-04-16, 38 findings).

Issues aplicables a Android:

### P0 — Críticos

- **P0-BE-1/2/3**: Apple Sign-In falla para nuevos usuarios (backend). Android tiene la UI completa pero el backend no persiste el usuario Apple correctamente.
- **P0-AND-?**: `AdaptiveNavigationRailLayout` es un stub que redirige a `CompactBottomNavLayout`. Tablets y foldables no tienen layout adaptativo real.

### P1 — Importantes

- Navegación usa rutas de string en lugar de type-safe routes de Navigation 2.8+ (las sealed classes tipadas no están implementadas aún).
- `EventDetailSubScreens.kt` agrupa múltiples sub-pantallas de evento en un solo archivo — potencialmente largo.
- Sin Baseline Profile validado en producción (módulo existe pero no hay evidencia de perfiles generados).
- Cobertura de tests insuficiente en features:clients, products, inventory, settings.

### P2 — Deseables

- `MIGRATION_4_5` es no-op; no existe schema exportado para versiones < 6. Dispositivos muy antiguos que salten desde v3 o anterior tendrían problemas.
- Logging de Ktor en nivel HEADERS (no solo DEBUG) — puede filtrar tokens en logcat en builds de QA.
- `BillingManager` vive en `:feature:settings`; debería moverse a `:core:data` para acceso desde otros features sin crear dependencia entre features.
- Widgets no tienen tests automatizados.

### P3 — Nichos

- `NewEventTileService` no verifica autenticación antes de mostrar la tile — podría mostrar la tile a usuarios no autenticados.
- `notificationIdCounter` en `SolennixMessagingService` es `AtomicInteger` en memoria — se resetea si el servicio muere; notificaciones pueden colisionar en IDs.
