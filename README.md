# Solennix

Plataforma integral para la gestión de eventos, cotizaciones, inventario y control financiero para organizadores LATAM.

## 🏗️ Stack

| Plataforma | Stack | Estado |
|-----------|-------|:------:|
| **iOS** | SwiftUI · @Observable · SPM | ✅ Producción — App Store México |
| **Android** | Kotlin · Jetpack Compose · Hilt · Ktor | ✅ Producción — Google Play |
| **Web** | React 18 · TypeScript · Vite · Tailwind | ✅ Producción — solennix.com |
| **Backend** | Go · Chi · PostgreSQL · pgx | ✅ Producción — api.solennix.com |

## 📚 Documentación

Toda la documentación técnica y funcional vive en [`docs/`](./docs/):

- 🏛️ [**Dashboard Ejecutivo**](./docs/00_DASHBOARD.md) — Estado del producto en 30 segundos
- 📋 [**PRD MOC**](./docs/PRD/PRD%20MOC.md) — Índice del Product Requirements Document
- 🍏 [**iOS MOC**](./docs/iOS/iOS%20MOC.md) — Documentación iOS
- 🤖 [**Android MOC**](./docs/Android/Android%20MOC.md) — Documentación Android
- 🌐 [**Web MOC**](./docs/Web/Web%20MOC.md) — Documentación Web
- ⚙️ [**Backend MOC**](./docs/Backend/Backend%20MOC.md) — Documentación Backend

## 🚀 Desarrollo

### Web

```bash
cd web && npm install && npm run dev
```

### Backend

```bash
cd backend && docker-compose up -d   # solo DB
go test ./...                        # tests
```

### iOS

```bash
cd ios && xcodegen generate && open Solennix.xcodeproj
```

### Android

```bash
cd android && ./gradlew build && ./gradlew test
```

## 📝 Convenciones

- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat`, `fix`, `refactor`, `docs`, `test`, `chore`)
- Scopes: `ios`, `android`, `web`, `backend`, `prd`, `infra`
- UI: español · Código: inglés · API: `/api/` con `kebab-case`
- Auth: JWT Bearer en `Authorization` + httpOnly cookies
- DB: PostgreSQL, columnas `snake_case`, filtrado por `user_id` (multi-tenant)

---

© 2026 Solennix
