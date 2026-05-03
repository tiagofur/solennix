# Agentes IA — Solennix

Solennix es un SaaS para organizadores de eventos LATAM (bodas, quinceañeras, corporativos). Gestiona clientes, eventos, productos, inventario, cotizaciones y pagos.

## Stack

- **iOS**: SwiftUI + SPM (`SolennixCore`, `SolennixNetwork`, `SolennixFeatures`)
- **Android**: Jetpack Compose + Hilt + Ktor + multi-module
- **Web**: React 18 + TypeScript + Vite + Tailwind + Zustand
- **Backend**: Go + Chi + PostgreSQL + pgx
- **Testing web**: Vitest (unit), Playwright (E2E)
- **Testing backend**: `go test ./...`

---

## Arquitectura del Proyecto

### Web (`web/`)

```
web/src/
├── components/    # UI reutilizable
├── contexts/      # Auth, Theme
├── hooks/         # Custom hooks
├── lib/           # Utilidades, api client
├── pages/         # Páginas por ruta
├── services/      # Servicios de dominio
└── types/         # Tipos TypeScript
```

### iOS (`ios/`)

```
ios/Packages/
├── SolennixCore/       # Modelos de dominio
├── SolennixNetwork/    # API client, AuthManager
└── SolennixFeatures/   # Features: Views + ViewModels
ios/Solennix/Navigation/  # NavigationStack + Route enum
```

### Android (`android/`)

```
android/
├── app/                # Entry point
├── core/model/         # Modelos
├── core/network/       # Ktor client, AuthInterceptor
└── feature/*/          # Features: ui/ + viewmodel/
```

### Backend (`backend/`)

```
backend/internal/
├── handler/    # HTTP handlers (Chi)
├── service/    # Lógica de negocio
├── repository/ # Queries PostgreSQL
├── model/      # Structs de dominio
├── middleware/ # Auth JWT, CORS
└── router/     # Rutas /api/*
```

---

## Reglas Obligatorias

### 1. Paridad Cross-Platform

Todo cambio en cualquier plataforma DEBE aplicarse a las otras tres. No esperes que el usuario lo pida.

| Área       | iOS                        | Android                 | Web                 | Backend             |
| ---------- | -------------------------- | ----------------------- | ------------------- | ------------------- |
| Modelos    | `SolennixCore/.../Models/` | `core/model/`           | `web/src/types/`    | `internal/model/`   |
| API/Red    | `SolennixNetwork/`         | `core/network/`         | `web/src/services/` | `internal/handler/` |
| ViewModels | `.../ViewModels/`          | `feature/**/viewmodel/` | `web/src/stores/`   | —                   |
| UI         | `.../Views/`               | `feature/**/ui/`        | `web/src/pages/`    | —                   |
| Auth       | `AuthManager.swift`        | `AuthInterceptor.kt`    | `AuthContext.tsx`   | `handler/auth.go`   |

### 2. Mantenimiento del PRD

PRD en `PRD/`. Siempre actualiza `11_CURRENT_STATUS.md` + doc de la plataforma afectada. Para features nuevas, también `02_FEATURES.md`.

### 3. Flujo de PR

**main** está protegida — requiere 1 approval para merging.

```
1. git checkout -b tipo/descripcion-corta   # feature/fix/docs
2. Commitear y pushear
3. gh pr create --title "..." --body "..."
4. Esperar approval
5. Squash & Merge
```

**Formato de branch:** `tipo/descripcion-corta`
- `feat/nombre-feature`
- `fix/descripcion-breve`
- `docs/tema`
- `refactor/area`
- `test modulo`

**Formato de commit** (en PR): `type(scope): description` (Conventional Commits, inglés)
**Co-autor:** `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`

Types: `feat` · `fix` · `refactor` · `docs` · `test` · `chore` · `style` · `perf`
Scopes: `ios` · `android` · `web` · `backend` · `prd` · `infra`

No commitear: trabajo incompleto, secretos, archivos generados, `console.log` de debug.

---

## Terminología

UI en español · código y DB en inglés · endpoints en `kebab-case`.

| UI         | Código          | DB                      |
| ---------- | --------------- | ----------------------- |
| Evento     | `Event`         | `events`                |
| Cliente    | `Client`        | `clients`               |
| Producto   | `Product`       | `products`              |
| Inventario | `InventoryItem` | `inventory_items`       |
| Cotización | `Quote`         | `quotes`                |
| Contrato   | `Contract`      | `contracts`             |
| Pago       | `Payment`       | `payments`              |
| Extra      | `EventExtra`    | `event_extras`          |
| Equipo     | `Equipment`     | _(reutilizable)_        |
| Insumo     | `Supply`        | _(consumible)_          |
| Receta     | `Recipe`        | _(ingredientes)_        |
| Plan       | `Plan`          | _(Gratis/Pro/Business)_ |

---

## Convenciones Técnicas

### General

- UI: español · Código: inglés · API base: `/api/`
- Auth: JWT Bearer en `Authorization`
- DB: PostgreSQL, columnas `snake_case`
- Fechas: ISO 8601 UTC en API, zona local en UI
- Moneda: MXN default, configurable

### iOS

- SwiftUI + `@Observable` (iOS 17+), no Combine
- Naming: `PascalCase` tipos — sufijos `View.swift` / `ViewModel.swift`
- Min: iOS 17.0 — Build: XcodeGen (`project.yml`)

### Android

- Jetpack Compose + MVVM + Hilt · Ktor Client · Kotlinx Serialization
- Naming: `PascalCase` — sufijos `Screen.kt` / `ViewModel.kt`
- Min SDK: 26 — Build: Gradle Kotlin DSL

### Web

- React 18+ · TypeScript · Tailwind · Vite · Zustand · React Hook Form + Zod
- Naming: `PascalCase` components, `camelCase` hooks

### Backend

- Go · Chi · `handler → service → repository`
- Errors: `fmt.Errorf("...: %w", err)` · Logging: `slog`/`zerolog`
- API responses: `{ "data": ..., "error": ..., "message": ... }`

---

## Comandos de Desarrollo

### Web

```bash
cd web && npm install
npm run dev
npm run test:run        # unit
npm run test:e2e        # E2E
npm run lint
npm run build
```

### Backend

```bash
cd backend
go test ./...
go test ./internal/router -run TestNew  # test único
go build ./...
docker-compose up -d    # solo DB
```

### iOS

```bash
cd ios
xcodegen generate
open Solennix.xcodeproj
```

### Android

```bash
cd android
./gradlew build
./gradlew test
```

---

## Testing

### Web (Playwright E2E)

```typescript
// web/tests/example.spec.ts
test("should load dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator("h1")).toContainText("Dashboard");
});
```

### Backend (Go)

```go
func TestEventRepo(t *testing.T) {
    // usa testcontainers o mock del repo
}
```

---

## Seguridad

- Sin credenciales en código
- Filtrar por `user_id` en todas las queries (multi-tenant)
- Validar inputs en frontend y backend
- Params en queries SQL, nunca concatenación

---

## Git + PR

### Crear branch y changes

```bash
git checkout -b fix/descripcion-corta
# hacer cambios
git add .
git commit -m "type(scope): description"
git push -u origin fix/descripcion-corta
```

### Crear PR

```bash
gh pr create --title "titulo" --body "$(cat <<'EOF'
## Summary
- cambio 1
- cambio 2
EOF
)"
```

### Revisar y merge

```bash
gh pr view 123   # ver PR
gh pr review 123 --approve  # approve
gh pr merge 123 --squash    # merge
```

---

## Comunicación

- Oraciones de ≤6 palabras
- Sin preámbulos ("Claro, voy a...")
- Herramientas primero, texto después
- Parar al encontrar lo buscado
- Sin confirmar lo que el tool call ya muestra
- Respuestas directas: ruta, valor, dato
- Sin resumen si el diff lo demuestra
- Listas en vez de prosa
- Sin alternativas no pedidas
- Código inline si es ≤3 líneas
- Sin hedging — la respuesta directa
- Números: "3 archivos" no "varios"

---

## Legal

- Términos: https://creapolis.dev/terms-of-use/
- Privacidad: https://creapolis.dev/privacy-policy/

```
mobile/
├── src/
│   ├── components/       # Componentes reutilizables (shared/, navigation/)
│   ├── contexts/         # Contextos React (AuthContext)
│   ├── hooks/            # Custom hooks (useHaptics, useImagePicker, usePlanLimits, etc.)
│   ├── lib/              # Utilidades compartidas (api, errorHandler, finance, pdfGenerator, sentry)
│   ├── navigation/       # Navegación (React Navigation: stacks, tabs, drawer)
│   ├── screens/          # Pantallas organizadas por dominio
│   │   ├── auth/         # Login, Register, ForgotPassword, ResetPassword
│   │   ├── home/         # Dashboard, Search
│   │   ├── events/       # EventDetail, EventForm
│   │   ├── clients/      # ClientList, ClientDetail, ClientForm
│   │   ├── catalog/      # ProductList, ProductDetail, ProductForm, InventoryList, InventoryForm
│   │   ├── calendar/     # CalendarScreen
│   │   └── profile/      # Settings, EditProfile, BusinessSettings, Pricing, etc.
│   ├── services/         # Servicios de API (uno por dominio)
│   ├── theme/            # Tema (colors, typography, spacing, shadows)
│   └── types/            # Tipos TypeScript (entities, navigation)
├── app.json              # Configuración de Expo
└── package.json          # Dependencias
```

---

## 🔧 Comandos de Desarrollo

### Web (React)

```bash
# Instalar dependencias
cd web && npm install

# Desarrollo
npm run dev

# Tests E2E
npm run test:e2e
npm run test:e2e:ui

# Build
npm run build
```

### Mobile (React Native / Expo)

```bash

```
