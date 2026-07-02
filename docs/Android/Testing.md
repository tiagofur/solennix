#android #calidad #testing

# Testing

> [!abstract] Resumen
> Baseline medido (2026-05-13): **88 tests unitarios debug en verde (0 failures)**. Cobertura estructural actual: **18/19 módulos Android con tests**.

---

## Estado Actual

| Tipo de test | Estado actual | Herramienta |
|-------------|---------------|-------------|
| Unit tests JVM | ✅ 88 tests (debug), 0 fallos | JUnit 5 + MockK + Turbine + Coroutines Test |
| Integration tests JVM | 🔄 Parcial (repositories) | JUnit 5 + Ktor Mock + fakes |
| UI tests instrumentados (`androidTest`) | ✅ 2 smoke tests verdes (auth + dashboard) | Compose UI Test + AndroidJUnit4 + createAndroidComposeRule |
| Screenshot tests | ❌ No implementados | — |

> [!info] Baseline ejecutado
> Comando de referencia: `cd android && ./gradlew testDebugUnitTest --no-daemon`
> Smoke instrumentado: `cd android && ./gradlew :feature:auth:connectedDebugAndroidTest :feature:dashboard:connectedDebugAndroidTest --rerun-tasks --no-build-cache`

### Distribucion actual (unit tests)

| Modulo | Debug |
|--------|------:|
| `core/data` | 7 |
| `core/database` | 5 |
| `core/designsystem` | 3 |
| `core/model` | 6 |
| `core/network` | 6 |
| `app` | 4 |
| `feature/auth` | 6 |
| `feature/calendar` | 4 |
| `feature/clients` | 3 |
| `feature/dashboard` | 8 |
| `feature/events` | 7 |
| `feature/inventory` | 2 |
| `feature/payments` | 3 |
| `feature/products` | 2 |
| `feature/search` | 3 |
| `feature/settings` | 4 |
| `feature/staff` | 11 |
| `widget` | 7 |
| **Total** | **88** |

### Cobertura estructural por modulos

| Indicador | Valor |
|----------|------:|
| Modulos Android totales (settings.gradle.kts) | 19 |
| Modulos con `src/test` o `src/androidTest` | 18 |
| Modulos con pruebas instrumentadas macrobenchmark | 1 (`baselineprofile`) |
| Modulos sin ninguna prueba | 0 |

> [!warning] Gap principal
> El riesgo no esta en flakiness hoy (0 fallos), sino en dos huecos de hardening: `baselineprofile` no tiene suite JVM y falta un gate de performance reproducible en CI.

---

## Modulo sin suite JVM (prioridad)

1. `baselineprofile`

---

## Hardening incremental (propuesto)

### Fase 1 (completada)

- `core/model`: validaciones y extensiones puras
- `core/database`: converters + reglas de mapping
- `feature/auth`: ViewModel auth flow + errores

### Fase 2 (completada)

- `feature/clients`, `feature/products`, `feature/inventory`
- foco en ViewModels criticos y estados de error/reintento

### Fase 2.5 (completada)

- `feature/search`, `feature/payments`, `feature/settings`, `feature/calendar`
- cobertura inicial de ViewModels operativos antes de abrir `staff` o módulos transversales

### Fase 3 (completada)

- primera capa de `androidTest` smoke para login + dashboard
- smoke instrumentado validado en emulador (`connectedDebugAndroidTest`)

### Fase 4 (en progreso)

- gate Android en CI agregado (`testDebugUnitTest` + compilacion de smoke androidTest)
- coverage gate activo por módulo (Fase 4.3):
	- `core/model` (scope: `extensions/**`) threshold line ratio `>= 30%`
	- `core/database` (scope: `converter/**`) threshold line ratio `>= 50%`
	- `feature/auth` (scope: `viewmodel/**`) threshold line ratio `>= 17%`
	- `feature/clients` (scope: `QuickQuoteViewModel*`) threshold line ratio `>= 25%`
	- `feature/products` (scope: `ProductListViewModel*`) threshold line ratio `>= 50%`
	- `feature/inventory` (scope: `InventoryListViewModel*`) threshold line ratio `>= 40%`
	- `feature/search` (scope: `SearchViewModel*`) threshold line ratio `>= 15%`
	- `feature/payments` (scope: `PaymentInboxViewModel*`) threshold line ratio `>= 15%`
	- `feature/settings` (scope: `SettingsViewModel*`) threshold line ratio `>= 15%`
	- `feature/calendar` (scope: `CalendarViewModel*`) threshold line ratio `>= 15%`
	- `app` (scope: `DeepLinkRoutes*`, `TopLevelDestination*`) threshold line ratio `>= 20%`
	- `core:designsystem` (scope: `SolennixColorScheme*`) threshold line ratio `>= 20%`
	- `widget` (scope: `WidgetFormatters*`, `WidgetAuthProvider*`) threshold line ratio `>= 20%`
- smoke gate de compilación agregado para `baselineprofile` (`:baselineprofile:compileNonMinifiedReleaseKotlin`)
- workflow dedicado agregado: `.github/workflows/android-baselineprofile.yml` (manual + nocturno) ejecuta `:baselineprofile:connectedNonMinifiedReleaseAndroidTest` con emulador API 34
- gate automático agregado para startup median/p50 (`STARTUP_P50_THRESHOLD_MS`, default `1800ms`) usando `scripts/android/check_startup_benchmark.sh`
- el workflow publica tabla de métricas en `GITHUB_STEP_SUMMARY` y sugerencia de calibración (`max observado + 15%`)
- siguiente paso: calibrar threshold con tendencia real de CI para minimizar falsos rojos

---

## Infraestructura vigente

| Tipo | Herramienta | Uso |
|------|-----------|-----|
| Unit tests | JUnit 5 + MockK | ViewModels, Repositories, lógica pura |
| Coroutines | Turbine | Testing de Flows y StateFlows |
| Compose UI | `createComposeRule()` | Interacciones de UI |
| Screenshot | Paparazzi o Roborazzi | Regresión visual |
| Integration | Hilt Test + Room in-memory | Repositorios end-to-end |

---

## Prioridades para Testing

| Prioridad | Qué testear | Por qué |
|-----------|-------------|---------|
| P0 | `baselineprofile` (managed-device) | Pasar de compile-only a ejecución reproducible de macrobenchmark |
| P0 | Repositories (sync logic) | Lógica de datos offline-first |
| P1 | `app` + `widget` + `core/designsystem` (gates) | Mantener hardening incremental sin regresiones |
| P1 | Type converters | Serialización Room ↔ Domain |
| P2 | Compose screens | Flujos de usuario críticos |
| P3 | Widgets | Datos mostrados correctamente |

---

## Relaciones

- [[Arquitectura General]] — la separación en módulos facilita el testing
- [[Manejo de Estado]] — ViewModels son el target principal de unit tests
- [[Base de Datos Local]] — Room in-memory para integration tests
- [[../PRD/09_ROADMAP|Roadmap maestro]] — testing como prioridad en el roadmap
