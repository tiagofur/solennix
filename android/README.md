# Solennix Android Nativo

App nativa Android para Solennix, construida con Kotlin y Jetpack Compose.

## Stack Tecnologico

| Componente | Tecnologia |
|-----------|------------|
| Lenguaje | Kotlin 2.0 |
| UI | Jetpack Compose + Material 3 |
| Arquitectura | MVVM + Repository + Clean Architecture |
| DI | Hilt (Dagger) |
| Navegacion | Navigation Compose (type-safe) |
| Networking | Ktor Client + Kotlin Serialization |
| Cache | Room Database |
| Seguridad | EncryptedSharedPreferences + AndroidKeyStore |
| Imagenes | Coil 3 |
| Charts | Vico |
| Billing | Google Play Billing v7 |
| Widgets | Glance |
| Background | WorkManager |

## Requisitos

- Android Studio Hedgehog (2023.1.1) o superior
- JDK 17+
- Android SDK 34 (target) / 26 (min)

## Build

```bash
# Debug build
./gradlew assembleDebug

# Release build (requiere signing config)
./gradlew assembleRelease

# Run tests
./gradlew test

# Lint check
./gradlew lint
```

## Estructura del Proyecto

```
android/
├── app/                          # Modulo principal
│   └── src/main/java/.../
│       ├── SolennixApp.kt       # @HiltAndroidApp
│       ├── MainActivity.kt      # Single Activity
│       ├── MainNavHost.kt       # NavHost raiz
│       ├── service/             # Quick Settings, Services
│       └── sync/                # WorkManager workers
│
├── core/                         # Modulos compartidos
│   ├── model/                   # Data classes
│   ├── network/                 # Ktor client, Auth
│   ├── database/                # Room DAOs, Entities
│   ├── data/                    # Repositories
│   └── designsystem/            # Theme, Componentes UI
│
├── feature/                      # Features por pantalla
│   ├── auth/                    # Login, Register, Reset
│   ├── dashboard/               # KPIs, Onboarding
│   ├── calendar/                # Vista calendar/list
│   ├── events/                  # Wizard, Checklist, PDFs
│   ├── clients/                 # CRUD
│   ├── products/                # CRUD
│   ├── inventory/               # CRUD
│   ├── search/                  # Busqueda global
│   └── settings/                # Config, Billing
│
├── widget/                       # Glance widgets
│
├── gradle/
│   └── libs.versions.toml       # Version catalog
│
└── build.gradle.kts             # Root build
```

## Features Implementadas

### Core
- [x] Autenticacion (login, register, reset, biometrico)
- [x] Google Sign-In
- [x] Navegacion adaptativa (phone/tablet)
- [x] Dark mode
- [x] Offline-first con Room

### Eventos
- [x] Wizard de 6 pasos (info, productos, extras, equipo, suministros, resumen)
- [x] Deteccion de conflictos de equipo
- [x] Checklist interactivo
- [x] Galeria de fotos
- [x] 6 tipos de PDF (presupuesto, contrato, checklist, equipo, compras, factura)

### Calendario
- [x] Vista calendar con dots
- [x] Vista lista con busqueda
- [x] Filtros por status
- [x] Toggle vista dual

### Monetizacion
- [x] Plan limits (basic: 3 eventos/mes, 50 clientes, 20 productos)
- [x] Upgrade banners
- [x] Google Play Billing (pro_monthly, pro_annual)

### Android Exclusivo
- [x] Glance widgets (eventos, KPIs)
- [x] Quick Settings tile
- [x] App Shortcuts
- [x] Haptic feedback
- [x] Background sync (WorkManager)

## Configuracion

### API Base URL

En `local.properties`:
```properties
API_BASE_URL=https://api.solennix.com
```

### Signing Config

Para release builds, configura en `keystore.properties`:
```properties
storeFile=path/to/keystore.jks
storePassword=xxx
keyAlias=xxx
keyPassword=xxx
```

## Testing

```bash
# Unit tests
./gradlew test

# UI tests (requiere emulador/dispositivo)
./gradlew connectedAndroidTest

# Screenshot tests (Paparazzi)
./gradlew verifyPaparazziDebug
```

## Documentacion

- [PRD completo](../docs/native-android/PRD-NATIVE-ANDROID.md)
- [Changelog](../docs/native-android/CHANGELOG.md)
- [System Overview](../docs/architecture/system-overview.md)

## Version

- **v1.0.0** - Feature parity con apps Web y Mobile
- **Min SDK:** 26 (Android 8.0 Oreo)
- **Target SDK:** 35 (Android 15)

---

*Solennix Native Android - Marzo 2026*
