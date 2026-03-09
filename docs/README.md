# Documentación — Solennix

Bienvenido a la documentación oficial de **Solennix**. Aquí encontrarás todo lo necesario para entender la arquitectura, operar el sistema y contribuir a su desarrollo.

## 📂 Estructura de Documentación

### 🏛️ [Arquitectura](./architecture/system-overview.md)

- **[Visión General](./architecture/system-overview.md):** Stack tecnológico y flujo de datos.
- **[Seguridad y Datos](./architecture/security.md):** Estrategia de protección de datos y aislamiento.

### 🚀 [Funcionalidades](./features/financials.md)

- **[Gestión Financiera](./features/financials.md):** IVA, Pagos y Generación de PDFs.
- **Clientes y Catálogo:** (Próximamente)
- **Inventario y Recetas:** (Próximamente)

### 🎨 [Diseño y Marca](./design/UI-DESIGN-GUIDE.md)

- **[Guía de Diseño UI](./design/UI-DESIGN-GUIDE.md):** Tokens de color, componentes, patrones y checklist de pantalla. **Referencia obligatoria** para cualquier cambio visual.
- **[Brand Manual (MD)](../marketing/brand-manual/BRAND-MANUAL.md):** Identidad de marca, logo, paleta de colores, tipografía y reglas de uso.
- **[Brand Manual (PDF)](../marketing/brand-manual/Solennix-Brand-Manual.pdf):** Manual visual profesional de 11 páginas.
- **[Mejoras de Pantalla](./screen-improvements-mar-2026.md):** Historial de migración de todas las pantallas al design system.
- **[Mejoras Cross-Platform](./roadmap/cross-platform-improvements.md):** Estandarización de diseño web y mobile.

### 💻 [Desarrollo](./development/setup.md)

- **[Instalación Local](./development/setup.md):** Pasos para correr el proyecto.
- **[Estrategia de Testing](./development/testing.md):** Vitest, Playwright y mejores prácticas.

### 🗺️ [Roadmap y Estado](./roadmap/status.md)

- **[Hallazgos de Auditoría](./roadmap/status.md):** Estado actual, problemas resueltos y tareas pendientes.

---

## 🛠️ Stack Principal

- **Frontend:** React 19, TypeScript ~5.9, Vite 7, Tailwind CSS 4.
- **Mobile:** React Native 0.83, Expo SDK 55, React Navigation 7.
- **Backend:** Go 1.25, Chi v5, PostgreSQL 15.
- **Tools:** Vitest, Playwright, Lucide Icons, jsPDF.

## 🔗 Enlaces Rápidos

- [README del Proyecto](../../README.md)
- [Guía de Contribución](../../CONTRIBUTING.md)
- [Despliegue (Legacy)](./deploy.md)
