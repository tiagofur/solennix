# Arquitectura de Solennix — Estándar del Sistema

> Este documento define el estándar arquitectónico de las cuatro plataformas que componen Solennix. Los revisores auditan cambios basándose en estas reglas.

---

## 1. Backend (Go)

Usa un diseño por capas desacopladas en `backend/internal/`:
- **Handler (`internal/handler/`)**: Capa HTTP que procesa peticiones y formatea respuestas REST (usa Chi router).
- **Service (`internal/service/`)**: Capa de lógica de negocio pura. Sin código de red o base de datos directo.
- **Repository (`internal/repository/`)**: Capa de acceso a datos que ejecuta consultas Postgres usando el driver nativo `pgx`.
- **Model (`internal/model/`)**: Estructuras de dominio compartidas de Go.

*Regla:* Todas las consultas a la base de datos deben filtrar obligatoriamente por `user_id` (arquitectura multi-tenant).

## 2. Web (React)

Estructurado en `web/src/`:
- **Components (`components/`)**: Componentes visuales reutilizables.
- **Services (`services/`)**: Clientes de API desacoplados del estado del componente.
- **Stores (`stores/` con Zustand)**: Gestión de estado global.
- **Pages (`pages/`)**: Componentes de página vinculados al enrutamiento principal.

*Regla:* Los formularios complejos deben usar `react-hook-form` con esquemas de validación construidos con `zod`.

## 3. iOS (SwiftUI)

Modularizado usando Swift Package Manager (SPM) en `ios/Packages/`:
- `SolennixCore`: Modelos de datos del dominio comunes.
- `SolennixNetwork`: Gestores de API, autenticación (`AuthManager`) y peticiones HTTP.
- `SolennixFeatures`: Vistas SwiftUI (`...View.swift`) y Modelos de Vista `@Observable` (`...ViewModel.swift`).

## 4. Android (Jetpack Compose)

Estructura modular en `android/`:
- `core/model`: Modelos de datos compartidos.
- `core/network`: Interceptores de autenticación y clientes HTTP de Ktor.
- `feature/*/ui/`: Pantallas de UI usando Jetpack Compose.
- `feature/*/viewmodel/`: Lógica de presentación impulsada por ViewModel y Hilt.
