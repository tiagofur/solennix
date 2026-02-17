# EventosApp Flutter — Documentación Completa

Documentación de la aplicación móvil Flutter para EventosApp.

## 📋 Índice

- [README Principal](../../README.md) - Documentación general del proyecto
- [Arquitectura](./01-architecture.md) - Arquitectura Clean Architecture
- [Estructura de Directorios](./02-directory-structure.md) - Estructura del código
- [API Endpoints](./03-api-endpoints.md) - Endpoints del backend Go
- [Modelos de Datos](./04-data-models.md) - Entidades y modelos Dart
- [Componentes UI](./05-ui-components.md) - Componentes reutilizables
- [Plan de Implementacion](./06-implementation-plan.md) - Paridad Web <-> Flutter
- [Roadmap](./ROADMAP.md) - Plan de desarrollo

### Documentación Relacionada

- [Testing](./10-testing.md) - Guía completa de pruebas (unit, widget, integration)

**Web App (React)**
- [Setup y Desarrollo](../../web/README.md)
- [Guía de Setup](../web/setup.md)
- [Integración API](../web/api-integration.md)
- [Seguridad](../../web/SECURITY_AUDIT.md)

**Backend (Go)**
- [README del Backend](../backend/README.md)

**General**
- [Documentación del Sistema](../README.md)
- [Guía de Despliegue](../deploy.md)
- [Testing E2E](../testing.md)
- [Checklist MVP](../mvp-checklist.md)
- [Mejoras y Roadmap](../mejoras.md)
- [Guía para Agentes IA](../../AGENTS.md)

---

## 🎯 Objetivos

Crear la mejor aplicación móvil nativa de gestión de eventos con:

1. **Experiencia móvil nativa** optimizada para iOS y Android
2. **Mejoras de UI/UX** vs la versión web existente
3. **Offline-first** con sincronización automática cuando hay conexión
4. **Features móviles específicas**: push notifications, cámara, sharing nativo
5. **Performance óptima** con código nativo compilado

---

## 🚀 Stack Tecnológico

| Categoría | Tecnología | Versión | Uso |
|-----------|-----------|---------|------|
| Framework | Flutter | 3.24+ | UI Framework |
| Lenguaje | Dart | 3.5+ | Lenguaje principal |
| State Management | Riverpod | 2.4+ | Gestión de estado |
| Arquitectura | Clean Arch | - | Organización |
| HTTP Client | Dio | 5.4+ | API requests |
| Storage Local | Hive | 2.2+ | Cache y datos |
| Storage Seguro | flutter_secure_storage | 9.0+ | Tokens sensibles |
| Routing | go_router | 13.0+ | Navegación |
| Gráficos | FL Chart | 0.66+ | Visualización de datos |
| PDF | syncfusion_pdf | 24.1+ | Generación de PDF |
| Formateo | intl | 0.18+ | Fechas y moneda |
| Notificaciones | flutter_local_notifications | 16.3+ | Push notifications |
| Testing | flutter_test, mockito | - | Unit y widget tests |

---

## 📱 Características Principales

- ✅ **Autenticación segura** con JWT y refresh tokens
- ✅ **Dashboard con KPIs** y gráficos de ventas
- ✅ **Calendario interactivo** para gestionar eventos
- ✅ **Gestión completa de eventos** (CRUD con productos y extras)
- ✅ **Formulario multi-paso** para crear eventos de forma guiada
- ✅ **Gestión de clientes** con historial y estadísticas
- ✅ **Gestión de productos** con recetas e ingredientes
- ✅ **Gestión de inventario** con alertas de stock bajo
- ✅ **Sistema de pagos** con seguimiento de abonos
- ✅ **Generación de PDFs** (presupuestos y contratos)
- ✅ **Búsqueda global** en clientes, eventos y productos
- ✅ **Configuración de app** y contratos personalizados
- ✅ **Dark mode** con tema claro/oscuro
- ✅ **Offline mode** con sincronización automática
- ✅ **Push notifications** para recordatorios y alertas
- ✅ **Compartir archivos** directamente desde la app

---

## 🔗 Links Importantes

- **Backend Go**: `/backend/` - API REST con endpoints completos
- **Web App**: `/web/` - Versión web de referencia
- **Base de datos**: Esquema SQL en `/backend/internal/database/migrations/`
- **Guía para Agentes**: `/AGENTS.md` - Para desarrollo asistido por IA

---

## 📖 Guía de Inicio Rápido

### Prerrequisitos

- Flutter SDK 3.24+
- Dart 3.5+
- Xcode (para iOS) o Android Studio (para Android)
- Backend Go corriendo en `http://localhost:8080`

### Instalación

```bash
# 1. Navegar al directorio flutter
cd flutter

# 2. Instalar dependencias
flutter pub get

# 3. Configurar variables de entorno
# Crear lib/config/env.dart con la URL del backend

# 4. Ejecutar en dispositivo o emulador
flutter run

# Para iOS específicamente
flutter run -d ios

# Para Android específicamente
flutter run -d android
```

### Estructura del Proyecto

Ver [Estructura de Directorios](./02-directory-structure.md) para detalles completos de la organización del código.

---

## 🤝 Contribución

1. **Seguir el patrón Clean Architecture**
   - Separar claramente en capas: presentation, domain, data
   - Los providers de Riverpod van en la capa presentation
   - Los use cases en la capa domain
   - Los repositorios en la capa data

2. **Usar Riverpod para state management**
   - `Provider` para dependencias (singleton)
   - `FutureProvider` para datos async (read-only)
   - `AsyncNotifierProvider` para datos async con mutations
   - `StateNotifierProvider` para estado complejo

3. **Escribir tests para nuevas features**
   - Unit tests para lógica de negocio
   - Widget tests para componentes UI
   - Integration tests para flujos completos

4. **Mantener la documentación actualizada**
   - Actualizar `api-endpoints.md` si agregas nuevos endpoints
   - Actualizar `data-models.md` si agregas nuevas entidades
   - Actualizar `ui-components.md` si creas nuevos componentes

5. **Code review obligatorio**
   - Revisar pull requests antes de merge
   - Verificar que el código siga las convenciones del proyecto

---

## 📄 Licencia

Propiedad de EventosApp. Todos los derechos reservados.

---

Para más detalles sobre el backend o la web app, revisar la documentación específica de cada componente.
