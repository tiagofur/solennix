# Arquitectura del Sistema

Solennix es una plataforma SaaS diseñada para organizadores de eventos. El sistema sigue una arquitectura de tres capas: Frontend desacoplado, Backend monolítico y Base de Datos Relacional.

## Componentes

### 1. Frontend (Web)

- **Framework:** React 18 con TypeScript y Vite.
- **Estilos:** Tailwind CSS con arquitectura de diseño premium (vibrante, dark mode).
- **Gestión de Estado:** Contextos de React para Auth y hooks personalizados para lógica de UI.
- **Formularios:** React Hook Form + Zod para validaciones estrictas.
- **Comunicación:** Axios/Fetch hacia el API de Go.

### 2. Backend (API)

- **Lenguaje:** Go 1.21+.
- **Framework:** Chi Router para una gestión de rutas ligera.
- **Middleware:** Auth (JWT), Logging, CORS.
- **Servicios:** Lógica de negocio encapsulada por entidad (Eventos, Clientes, etc.).
- **Repositorio:** Patrón Repository para abstracción de base de datos.

### 3. Base de Datos

- **Motor:** PostgreSQL 15+.
- **Aislamiento:** Multitenancy lógico basado en `user_id` en todas las tablas principales.
- **Migraciones:** Manejadas por el backend en Go (embebidas con `go:embed`).

## Flujo de Datos

1. El usuario se autentica y recibe un JWT.
2. El Frontend envía el JWT en el Header `Authorization`.
3. El Backend valida el JWT y extrae el `userID`.
4. Todas las consultas a la DB se filtran automáticamente por `userID` para asegurar aislamiento.
5. El Frontend renderiza los datos y gestiona los estados de carga/error centralizadamente.
