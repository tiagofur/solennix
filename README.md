# Solennix

Plataforma integral para la gestión de eventos, cotizaciones, inventario y control financiero.

## 📋 Descripción

Solennix es una solución SaaS diseñada para organizadores de eventos que buscan optimizar su operación. Permite gestionar desde el primer contacto con el cliente hasta la liquidación final, incluyendo el control de stock y la generación de documentos legales.

## 🏗️ Arquitectura

El sistema consta de dos componentes principales:

1.  **[Frontend (Web)](./web/README.md):** Aplicación SPA robusta construida con React 18, Vite y Tailwind CSS.
2.  **[Backend (API)](./backend/README.md):** API REST de alto rendimiento escrita en Go (Chi Router) con PostgreSQL.

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- Go 1.21+
- PostgreSQL 15+

### Instalación

Consulta la **[Guía de Instalación Detallada](./docs/development/setup.md)** para configurar el entorno de desarrollo.

## 📚 Documentación Centralizada

Toda la documentación técnica y funcional se encuentra en la carpeta `docs/`:

- **[Visión General](./docs/README.md):** Índice principal.
- **[Arquitectura y Seguridad](./docs/architecture/system-overview.md):** Cómo funciona el sistema por dentro.
- **[Funcionalidades](./docs/features/financials.md):** Guía de uso de los módulos (IVA, PDFs, Pagos).
- **[Testing](./docs/development/testing.md):** Estrategia de calidad.
- **[Roadmap y Estado](./docs/roadmap/status.md):** Tareas pendientes y plan de crecimiento.

## 🛠️ Tecnologías Principales

- **Frontend:** React, TypeScript, Vitest, React Hook Form, Zod.
- **Backend:** Go, PostgreSQL, pgx, Chi.
- **Diseño:** Tailwind CSS, Lucide Icons.

## 📄 Contribuir

Si deseas colaborar en el proyecto, revisa el archivo [CONTRIBUTING.md](./CONTRIBUTING.md).

---

© 2026 Solennix - La plataforma de eventos de élite.
