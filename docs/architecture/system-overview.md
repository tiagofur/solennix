# Arquitectura del Sistema

Solennix es una plataforma SaaS diseñada para organizadores de eventos. El sistema sigue una arquitectura de tres capas: Frontend desacoplado, Backend monolítico y Base de Datos Relacional.

## Componentes

### 1. Frontend (Web)

- **Framework:** React 19 con TypeScript ~5.9 y Vite 7.
- **Estilos:** Tailwind CSS 4 con design system premium (tokens semánticos, dark mode OLED).
- **Gestión de Estado:** Contextos de React para Auth y hooks personalizados para lógica de UI.
- **Formularios:** React Hook Form + Zod para validaciones estrictas.
- **Comunicación:** Fetch API con httpOnly cookies hacia el API de Go.
- **Iconos:** Lucide React.
- **PDFs:** jsPDF + jspdf-autotable para generación de documentos.

### 2. Frontend (Mobile - React Native)

- **Framework:** React Native 0.83 con Expo SDK 55 (managed workflow).
- **Navegación:** React Navigation 7 (5 bottom tabs + stacks).
- **Estado:** Zustand + React Hook Form + Zod.
- **Almacenamiento seguro:** `expo-secure-store` (Keychain en iOS, EncryptedSharedPreferences en Android).
- **Suscripciones:** RevenueCat (`react-native-purchases`) para In-App Purchases.
- **PDFs:** `expo-print` + `expo-sharing` (HTML → PDF → Share Sheet nativo).
- **Iconos:** `lucide-react-native`.

### 3. Frontend (Android Nativo) ✅ FEATURE PARITY

- **Lenguaje:** Kotlin 2.0 con Jetpack Compose.
- **UI Framework:** Material Design 3 con design system custom (SolennixTheme).
- **Arquitectura:** MVVM + Repository + Clean Architecture.
- **DI:** Hilt (Dagger).
- **Navegación:** Navigation Compose (type-safe routes).
- **Estado:** ViewModel + StateFlow + MutableState.
- **Networking:** Ktor Client + Kotlin Serialization.
- **Cache Local:** Room Database (offline-first).
- **Almacenamiento seguro:** EncryptedSharedPreferences + AndroidKeyStore.
- **Suscripciones:** Google Play Billing v7.
- **PDFs:** PdfDocument + Canvas nativo (6 tipos).
- **Imágenes:** Coil 3.
- **Gráficas:** Vico (Compose charts).
- **Widgets:** Glance (Compose for widgets).
- **Background Sync:** WorkManager (SyncWorker cada 15 min).
- **Haptics:** HapticFeedbackManager nativo.
- **Iconos:** Material Symbols.

**Estructura modular:**
```
android/
├── app/                    # MainActivity, NavHost, SyncWorker
├── core/
│   ├── model/              # Data classes (@Serializable)
│   ├── network/            # Ktor client, AuthManager
│   ├── database/           # Room DAOs y entities
│   ├── data/               # Repositories, PlanLimitsManager
│   └── designsystem/       # Theme, componentes UI
├── feature/
│   ├── auth/               # Login, Register, Reset
│   ├── dashboard/          # KPIs, Onboarding
│   ├── calendar/           # Vista dual, filtros
│   ├── events/             # Wizard 6 pasos, Checklist, PDFs
│   ├── clients/            # CRUD clientes
│   ├── products/           # CRUD productos
│   ├── inventory/          # CRUD inventario
│   ├── search/             # Búsqueda global
│   └── settings/           # Config, Billing
└── widget/                 # Glance widgets
```

### 4. Backend (API)

- **Lenguaje:** Go 1.25.
- **Framework:** Chi Router v5 para gestión de rutas ligera.
- **Middleware:** Auth (JWT + httpOnly cookies), Rate Limiting, Security Headers, Logging, CORS.
- **Servicios:** Lógica de negocio encapsulada por entidad (Eventos, Clientes, etc.).
- **Repositorio:** Patrón Repository para abstracción de base de datos.
- **Email:** Resend API para password reset.
- **Pagos:** Stripe (web) + RevenueCat webhooks (mobile) + Google Play Billing (Android nativo).

### 5. Base de Datos

- **Motor:** PostgreSQL 15+.
- **Aislamiento:** Multitenancy lógico basado en `user_id` en todas las tablas principales.
- **Migraciones:** Manejadas por el backend en Go (embebidas con `go:embed`).

## Flujo de Datos

1. El usuario se autentica y recibe un JWT almacenado en:
   - **Web:** httpOnly cookie
   - **Mobile RN:** expo-secure-store
   - **Android Nativo:** EncryptedSharedPreferences + AndroidKeyStore
2. El Frontend envía el JWT automáticamente: vía cookie (web) o header `Authorization: Bearer` (mobile/Android).
3. El Backend valida el JWT y extrae el `userID`.
4. Todas las consultas a la DB se filtran automáticamente por `userID` para asegurar aislamiento.
5. El Frontend renderiza los datos y gestiona los estados de carga/error centralizadamente.
6. **Android Nativo (offline-first):** Room database cachea datos localmente; SyncWorker sincroniza cada 15 min.

## Herramientas de Desarrollo

- **Testing Web:** Vitest + React Testing Library (783 tests), Playwright (E2E).
- **Testing Mobile RN:** Jest + React Native Testing Library, Maestro (E2E).
- **Testing Android:** JUnit 5 + Turbine (Flow), Compose UI Test, Paparazzi (screenshots).
- **Testing Backend:** Go test con testify.
- **Deployment:** Docker Compose + VPS con Plesk/Nginx para reverse proxy y SSL.
- **Android CI/CD:** GitHub Actions (build + test on push), Play Console para releases.

## Detalle de Funcionalidades

### Gestión de Clientes

La base de datos de clientes permite centralizar la información de contacto y el historial de eventos.

- **Registro Detallado:** Almacenamiento de nombre, email, teléfono, dirección y notas.
- **Historial Automático:** Los clientes muestran un resumen de sus eventos pasados y futuros.
- **Estadísticas de Valor:** Visualización de `total_spent` y `total_events` por cliente (calculado mediante triggers en la base de datos).
- **Acceso Rápido:** Búsqueda integrada para encontrar clientes por nombre o contacto.
- **Privacidad:** Cada organizador solo puede ver y gestionar sus propios clientes. Los datos están aislados por `user_id` a nivel de aplicación.

### Gestión Financiera

La plataforma ofrece herramientas avanzadas para el control de costos y la automatización de la facturación.

#### Reportes de Costos

El sistema calcula automáticamente el costo de cada evento basándose en:

- **Ingredientes:** Basado en las recetas vinculadas a los productos y el costo unitario del inventario.
- **Extras:** Servicios adicionales con sus respectivos costos operativos.

#### IVA y Facturación

- **Tasa Configurable:** El usuario puede definir la tasa de IVA (por defecto 16%).
- **Cálculo Automático:** Al marcar "Requiere Factura", el sistema calcula el `tax_amount` y actualiza el `total_amount`.
- **Transparencia:** El desglose es visible tanto en el resumen interno como en los presupuestos generados para clientes.

#### Pagos y Abonos

El módulo de pagos permite:

- Registrar múltiples pagos por evento (anticipos, liquidación).
- Ver el estado de la cuenta en tiempo real (Total Cobrado vs Total Pagado).
- Seguimiento visual de saldos pendientes.

#### Generación de Documentos

- **Presupuesto (PDF):** Documento formal con desglose de servicios para enviar al cliente.
- **Contrato (PDF):** Generación automática de contrato legal basado en la configuración del usuario (días de cancelación, porcentajes de reembolso).
- **Lista de Compras (PDF):** Agregación de todos los ingredientes necesarios para facilitar la logística.

### Inventario y Catálogo

Solennix vincula el inventario físico con los servicios ofrecidos, permitiendo una trazabilidad total de costos.

#### Catálogo de Productos

- Definición de servicios (ej. "Menú de 3 tiempos", "Barra libre").
- Asignación de precios sugeridos y categorías.
- Vinculación con "Recetas" (Ingredientes del inventario).

#### Control de Inventario

- Registro de insumos (ej. "Harina", "Vino Tinto") con sus respectivas unidades de medida y costos unitarios.
- **Stock Mínimo:** Configuración de alertas para reposición.
- **Cálculo de Consumo:** Se deduce la cantidad necesaria de cada ingrediente basándose en el número de asistentes del evento.

#### Recetas

Cada producto puede estar compuesto por múltiples ítems del inventario. Esto permite que, al cotizar un evento para 100 personas, el sistema sepa exactamente cuántos kilos de cada insumo se requieren.
