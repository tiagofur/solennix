# Solennix — Instrucciones para Claude Code

## Reglas Obligatorias

### 1. Paridad Cross-Platform

Solennix es multi-plataforma: **iOS · Android · Web · Backend**. Todo cambio en cualquier plataforma DEBE aplicarse a las otras tres antes de cerrar la tarea. Revisa proactivamente — no esperes a que el usuario lo pida.

**Archivos clave por área:**

| Área       | iOS                                     | Android                         | Web                                | Backend                                 |
| ---------- | --------------------------------------- | ------------------------------- | ---------------------------------- | --------------------------------------- |
| Modelos    | `ios/Packages/SolennixCore/.../Models/` | `android/core/model/`           | `web/src/types/`                   | `backend/internal/model/`               |
| API/Red    | `ios/Packages/SolennixNetwork/.../`     | `android/core/network/`         | `web/src/services/`                | `backend/internal/handler/`             |
| ViewModels | `.../ViewModels/`                       | `android/feature/**/viewmodel/` | `web/src/stores/`                  | —                                       |
| UI         | `.../Views/`                            | `android/feature/**/ui/`        | `web/src/pages/`, `components/`    | —                                       |
| Navegación | `ios/Solennix/Navigation/`              | `.../navigation/`               | `web/src/router/`                  | —                                       |
| Auth       | `AuthManager.swift`                     | `AuthInterceptor.kt`            | `AuthContext.tsx` / `authStore.ts` | `handler/auth.go`, `middleware/auth.go` |
| DB / Repo  | —                                       | —                               | —                                  | `backend/internal/repository/`          |
| Rutas API  | —                                       | —                               | —                                  | `backend/internal/router/`              |

### 2. Mantenimiento del PRD

El PRD vive en `PRD/`. Después de cualquier cambio significativo, actualiza los docs relevantes:

| Doc                                    | Contenido                                       |
| -------------------------------------- | ----------------------------------------------- |
| `01_PRODUCT_VISION.md`                 | Visión, objetivos, usuarios, propuesta de valor |
| `02_FEATURES.md`                       | Features + tabla de paridad cross-platform      |
| `03_COMPETITIVE_ANALYSIS.md`           | Análisis competitivo LATAM                      |
| `04_MONETIZATION.md`                   | Tiers (Gratis/Pro/Business), feature gating     |
| `05_TECHNICAL_ARCHITECTURE_IOS.md`     | iOS: SwiftUI + SPM                              |
| `06_TECHNICAL_ARCHITECTURE_ANDROID.md` | Android: Compose + multi-module                 |
| `07_TECHNICAL_ARCHITECTURE_WEB.md`     | Web: React + TypeScript                         |
| `08_TECHNICAL_ARCHITECTURE_BACKEND.md` | Backend: Go + PostgreSQL                        |
| `09_ROADMAP.md`                        | Timeline y estimaciones                         |
| `10_COLLABORATION_GUIDE.md`            | Guía de trabajo con Claude                      |
| `11_CURRENT_STATUS.md`                 | Estado actual + brechas conocidas               |

Regla: siempre actualiza `11_CURRENT_STATUS.md` + el doc de arquitectura de la plataforma afectada. Para features nuevas, también `02_FEATURES.md`.

### 3. Auto-Commit

Después de cada corrección, feature o cambio significativo, hacer commit inmediatamente.

**Formato:** `type(scope): description` (Conventional Commits, en inglés)
**Co-autor siempre:** `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`

Types: `feat` · `fix` · `refactor` · `docs` · `test` · `chore` · `style` · `perf`
Scopes: `ios` · `android` · `web` · `backend` · `prd` · `infra`

```
feat(ios): add quick quote generation from client detail
fix(backend): correct event date parsing for timezone offset
docs(prd): update feature parity table after inventory release
test(backend): add unit tests for event repository
```

No commitear: trabajo incompleto, secretos/`.env`, archivos generados (`node_modules/`, `build/`, `.gradle/`), `console.log` de debug, artefactos de build.

---

## Terminología del Dominio

UI en español · código y DB en inglés · endpoints en `kebab-case`.

| UI (español) | Código          | DB                                        |
| ------------ | --------------- | ----------------------------------------- |
| Evento       | `Event`         | `events`                                  |
| Cliente      | `Client`        | `clients`                                 |
| Producto     | `Product`       | `products`                                |
| Inventario   | `InventoryItem` | `inventory_items`                         |
| Cotización   | `Quote`         | `quotes`                                  |
| Contrato     | `Contract`      | `contracts`                               |
| Pago         | `Payment`       | `payments`                                |
| Extra        | `EventExtra`    | `event_extras`                            |
| Equipo       | `Equipment`     | _(subcategoría inventario, reutilizable)_ |
| Insumo       | `Supply`        | _(subcategoría inventario, consumible)_   |
| Receta       | `Recipe`        | _(ingredientes de un producto)_           |
| Plan         | `Plan`          | _(tier: Gratis/Pro/Business)_             |
| Checklist    | `Checklist`     | _(tareas por evento)_                     |
| Dashboard    | `Dashboard`     | _(panel KPIs)_                            |

---

## Convenciones Técnicas

### General

- UI: español · Código: inglés · API base: `/api/`
- Auth: JWT Bearer en header `Authorization`
- DB: PostgreSQL, columnas `snake_case`
- Fechas: ISO 8601 UTC en API, zona local en UI
- Moneda: MXN por default, configurable

### iOS

- SwiftUI + `@Observable` (Observation framework, iOS 17+)
- SPM: `SolennixCore` (modelos) · `SolennixNetwork` (API) · `SolennixFeatures` (features)
- Navegación: `NavigationStack` + `NavigationSplitView` con enum `Route`
- DI: SwiftUI `@Environment` · Async: `async/await` (no Combine)
- Naming: `PascalCase` tipos, `camelCase` vars — sufijos `View.swift` / `ViewModel.swift`
- Min target: iOS 17.0 — Build: XcodeGen (`project.yml`)

### Android

- Jetpack Compose + MVVM (`ViewModel` AndroidX) + Hilt
- Multi-module: `app` · `core/network` · `core/model` · `feature/*`
- Navegación: Compose Navigation (type-safe routes)
- Networking: Ktor Client · Serialización: Kotlinx
- Naming: `PascalCase` clases — sufijos `Screen.kt` / `ViewModel.kt`
- Min SDK: 26 (Android 8.0) — Build: Gradle Kotlin DSL

### Web

- React 18+ · TypeScript · Tailwind CSS · Vite
- Estado: Zustand · Routing: React Router · Forms: React Hook Form + Zod
- HTTP: Axios o fetch tipado
- Estructura: `pages/` · `components/` · `services/` · `stores/` · `types/` · `hooks/`
- Naming: `PascalCase` components, `camelCase` hooks/utils

### Backend

- Go · Chi router · Repository pattern: `handler → service → repository`
- PostgreSQL via `pgx`/`sqlx` · migraciones SQL versionadas · Auth: JWT middleware
- Estructura: `cmd/` · `internal/` · `pkg/`
- Naming: `PascalCase` exportados, `camelCase` internos, `snake_case` JSON/DB
- Errors: `fmt.Errorf("...: %w", err)` · Logging: `slog`/`zerolog`
- API responses: `{ "data": ..., "error": ..., "message": ... }`

---

## Diseño

**Usuarios:** Organizadores de eventos LATAM (bodas, quinceañeras, corporativos). Desktop primario, mobile secundario. Meta: control, profesionalismo, menos caos.

**Personalidad:** Elegante · profesional · confiable — cálido pero compuesto. Ref: Honeybook, Dubsado.

**Paleta (no cambiar):**

- Primary: `#C4A265` — oro cálido, usar con intención
- Accent: `#1B2A4A` — azul marino, ancla la jerarquía y el dark mode
- Light mode: superficies crema/beige cálidas · Dark mode: superficies con tinte navy

**Anti-referencias:** Sin gradientes cyan/purple, sin glassmorphism decorativo, sin grids genéricos icon+heading+text, sin estética enterprise fría.

**Principios:**

1. Calidez con precisión — espaciado generoso, oro usado con intención
2. Profesional sin ser estéril — confianza, no 2015 CRM
3. Jerarquía de información — datos complejos deben ser inmediatamente obvios
4. Light y dark de igual calidad — dark = rico en navy, no gris genérico
5. Tipografía como marca — escala clara, contraste de peso decisivo

---

## Comunicación

- Oraciones de ≤6 palabras
- Sin preámbulos ("Claro, voy a...", "Por supuesto...")
- Herramientas primero, texto después
- Parar en cuanto se encontró lo buscado
- Sin confirmar lo que el tool call ya muestra
- Respuestas directas: solo la ruta, el valor, el dato
- Sin resumen al final si el diff lo demuestra
- Listas en vez de prosa
- Sin alternativas no pedidas
- Código inline si es ≤3 líneas
- Sin disculpas ni hedging ("podría ser que..." → la respuesta)
- Números, no palabras: "3 archivos" no "varios archivos"

---

## Legal

- Términos: https://creapolis.dev/terms-of-use/
- Privacidad: https://creapolis.dev/privacy-policy/
