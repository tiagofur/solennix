#android #calidad #testing

# Testing

> [!abstract] Resumen
> Baseline medido (2026-05-12): **56 tests unitarios en verde (0 failures)** entre variantes debug+release. Cobertura estructural actual: **4/19 módulos Android con tests**.

---

## Estado Actual

| Tipo de test | Estado actual | Herramienta |
|-------------|---------------|-------------|
| Unit tests JVM | ✅ 56 tests (debug+release), 0 fallos | JUnit 5 + MockK + Turbine + Coroutines Test |
| Integration tests JVM | 🔄 Parcial (repositories) | JUnit 5 + Ktor Mock + fakes |
| UI tests instrumentados (`androidTest`) | ❌ No detectados | — |
| Screenshot tests | ❌ No implementados | — |

> [!info] Baseline ejecutado
> Comando de referencia: `cd android && ./gradlew :core:data:testDebugUnitTest :core:network:testDebugUnitTest :feature:dashboard:testDebugUnitTest :feature:events:testDebugUnitTest --rerun-tasks --no-build-cache`

### Distribucion actual (unit tests)

| Modulo | Debug | Release | Total |
|--------|------:|--------:|------:|
| `core/data` | 7 | 7 | 14 |
| `core/network` | 6 | 6 | 12 |
| `feature/dashboard` | 8 | 8 | 16 |
| `feature/events` | 7 | 7 | 14 |
| **Total** | **28** | **28** | **56** |

### Cobertura estructural por modulos

| Indicador | Valor |
|----------|------:|
| Modulos Android totales (settings.gradle.kts) | 19 |
| Modulos con `src/test` o `src/androidTest` | 4 |
| Modulos sin tests | 15 |

> [!warning] Gap principal
> El riesgo no esta en flakiness hoy (0 fallos), sino en superficie no protegida: **15 modulos sin pruebas**.

---

## Modulos sin tests (prioridad)

1. `core/database`
2. `core/model`
3. `feature/auth`
4. `feature/clients`
5. `feature/products`
6. `feature/inventory`
7. `feature/search`
8. `feature/calendar`
9. `feature/settings`
10. `feature/staff`
11. `feature/payments`
12. `app`
13. `widget`
14. `baselineprofile`
15. `core/designsystem`

---

## Hardening incremental (propuesto)

### Fase 1 (manana)

- `core/model`: validaciones y extensiones puras
- `core/database`: converters + reglas de mapping
- `feature/auth`: ViewModel auth flow + errores

### Fase 2

- `feature/clients`, `feature/products`, `feature/inventory`
- foco en ViewModels criticos y estados de error/reintento

### Fase 3

- primera capa de `androidTest` smoke para login + dashboard
- gate de CI: fail en PR si rompe `testDebugUnitTest`

### Fase 4

- activar reporte de cobertura con threshold inicial bajo
- subir thresholds por modulo critico (core + auth primero)

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
| P0 | `feature/auth` + `core/model` + `core/database` | Reducir riesgo en login, validaciones y persistencia |
| P0 | Repositories (sync logic) | Lógica de datos offline-first |
| P1 | ViewModels de `clients/products/inventory` | Flujos críticos diarios del negocio |
| P1 | Type converters | Serialización Room ↔ Domain |
| P2 | Compose screens | Flujos de usuario críticos |
| P3 | Widgets | Datos mostrados correctamente |

---

## Relaciones

- [[Arquitectura General]] — la separación en módulos facilita el testing
- [[Manejo de Estado]] — ViewModels son el target principal de unit tests
- [[Base de Datos Local]] — Room in-memory para integration tests
- [[Roadmap Android]] — testing como prioridad en el roadmap
