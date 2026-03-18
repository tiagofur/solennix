# Documentación — Solennix

Bienvenido a la documentación oficial de **Solennix**. Aquí encontrarás todo lo necesario para entender la arquitectura, operar el sistema y contribuir a su desarrollo.

## 📂 Estructura de Documentación

### 🏛️ [Arquitectura](./architecture/system-overview.md)

- **[Visión General](./architecture/system-overview.md):** Stack tecnológico completo (Web + Mobile + Backend) y flujo de datos.
- **[Seguridad y Datos](./architecture/security.md):** Estrategia de protección de datos, httpOnly cookies y aislamiento por usuario.

### 🚀 [Funcionalidades](./architecture/system-overview.md#detalle-de-funcionalidades)

- **[Gestión de Clientes](./architecture/system-overview.md#gestión-de-clientes):** Registro, historial, estadísticas de valor.
- **[Gestión Financiera](./architecture/system-overview.md#gestión-financiera):** IVA, Pagos y Generación de PDFs.
- **[Inventario y Catálogo](./architecture/system-overview.md#inventario-y-catálogo):** Productos, recetas, control de stock.

### 🎨 [Diseño y Marca](./design/UI-DESIGN-GUIDE.md)

- **[Guía de Diseño UI](./design/UI-DESIGN-GUIDE.md):** Tokens de color, componentes, patrones y checklist de pantalla. **Referencia obligatoria** para cualquier cambio visual.
- **[Brand Manual (MD)](../marketing/brand-manual/BRAND-MANUAL.md):** Identidad de marca, logo, paleta de colores, tipografía y reglas de uso.
- **[Brand Manual (PDF)](../marketing/brand-manual/Solennix-Brand-Manual.pdf):** Manual visual profesional de 11 páginas.
- **[Estrategia de Redes Sociales](../marketing/campaigns/social-media-strategy.md):** Pilares de contenido, calendario de posts, guía visual.

### 💻 [Desarrollo](./development/setup.md)

- **[Instalación Local](./development/setup.md):** Pasos para correr el proyecto (Backend, Web, Mobile, Docker).
- **[Estrategia de Testing](./development/testing.md):** Vitest (783 tests web), Go tests, Playwright E2E.

### 🚢 [Deployment](./deployment/vps-plesk.md)

- **[VPS + Plesk (Producción)](./deployment/vps-plesk.md):** Guía completa de despliegue con Docker Compose, SSL y reverse proxy.
- **[Quick Deployment](./deployment/quickstart.md):** Checklist rápido post-hardening con variables de entorno y verificación.

### 📱 [Mobile](./mobile/README.md)

- **[PRD](./mobile/PRD.md):** Requisitos del producto, alcance y decisiones clave.
- **[Arquitectura](./mobile/architecture.md):** Stack técnico, estructura del proyecto, navegación, código reutilizable.
- **[Plan de Implementación](./mobile/implementation-plan.md):** Fases, tareas, estimaciones de tiempo.
- **[Publicación App Store](./mobile/app-store-publishing.md):** Guía paso a paso para publicar en iOS.

### 🔗 [Integraciones](./guides/stripe_revenuecat_integration.md)

- **[Stripe + RevenueCat](./guides/stripe_revenuecat_integration.md):** Sistema híbrido de suscripciones Web (Stripe) y Mobile (RevenueCat).

### 🗺️ [Roadmap y Estado](./roadmap/status.md)

- **[Estado del Proyecto](./roadmap/status.md):** Estado actual (97% web, 95% mobile), logros recientes y pendientes.
- **[Mejoras Cross-Platform](./roadmap/cross-platform-improvements.md):** Historial de paridad Web ↔ Mobile.

### 📦 [Archivo](./archive/)

Documentos históricos completados o superados, conservados como referencia:

- `code-review-feb-2025.md` — Code review con 27 issues (todos resueltos).
- `auditoria-mvp-feb-2026.md` — Auditoría pre-lanzamiento completa.
- `migration-httponly-cookies.md` — Migración de auth a httpOnly cookies (completada).
- `proyecto_reporte_feb_2026.md` — Reporte de estado histórico.
- `screen-improvements-mar-2026.md` — Migración de todas las pantallas al design system.
- `test-coverage-analysis.md` — Análisis de cobertura de tests (snapshot Mar 2026).

---

## 🛠️ Stack Principal

- **Frontend Web:** React 19, TypeScript ~5.9, Vite 7, Tailwind CSS 4.
- **Mobile:** React Native 0.83, Expo SDK 55, React Navigation 7.
- **Backend:** Go 1.25, Chi v5, PostgreSQL 15.
- **Pagos:** Stripe (web), RevenueCat (mobile).
- **Tools:** Vitest, Playwright, Lucide Icons, jsPDF, expo-print.

## 🔗 Enlaces Rápidos

- [README del Proyecto](../README.md)
- [Guía de Contribución](../CONTRIBUTING.md)
- [Brand Manual de Marketing](../marketing/brand-manual/BRAND-MANUAL.md)
