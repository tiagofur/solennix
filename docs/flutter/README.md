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

### Implementadas
- ✅ **Autenticación segura** con JWT y refresh tokens (login, registro, forgot password, splash)
- ✅ **Dashboard con KPIs** — 6 tarjetas, gráfico de barras por estado, eventos próximos
- ✅ **Calendario interactivo** (`table_calendar`) con eventos del mes resaltados
- ✅ **Gestión de eventos** — lista, detalle con 4 tabs (resumen, pagos, ingredientes, contrato), formulario multi-paso
- ✅ **Formulario de eventos multi-paso** — info, productos, extras, finanzas con cálculo de rentabilidad
- ✅ **Gestión de clientes** — lista, detalle (tab eventos con badge de estado, tab pagos con eventName), crear/editar/eliminar
- ✅ **Gestión de productos** — lista en grid, detalle, formulario de 5 pasos con receta e ingredientes
- ✅ **Gestión de inventario** — lista con búsqueda por texto, detalle, crear/editar/eliminar
- ✅ **Sistema de pagos** — tab completo con resumen, barra de progreso, cards por pago, eliminar pago
- ✅ **Generación de PDFs** — presupuesto (`generateBudgetPDF`) y contrato (`generateContractPDF`) vía `share_plus`
- ✅ **Vista de contrato legal** en EventDetailPage con cláusulas completas y botón PDF
- ✅ **Tab Ingredientes** en EventDetailPage con cálculo por receta de productos
- ✅ **Búsqueda global** en clientes, eventos y productos
- ✅ **Configuración** — perfil, contrato, preferencias de app (UI completa)
- ✅ **Botón "Crear evento"** desde ClientDetailPage (AppBar + empty state)

### Pendientes / Gaps vs Web
- ❌ **Settings sin persistencia real** — ProfilePage y ContractSettingsPage no llaman `PUT /api/users/me`; AppSettingsPage no guarda en Hive
- ❌ **Dashboard con datos mock** — `DashboardRemoteDataSource` puede tener datos hardcoded
- ❌ **PDF lista de compras** — web genera PDF de ingredientes del evento; Flutter no
- ❌ **PDF reporte de pagos** — web genera PDF de historial de pagos; Flutter no
- ❌ **business_name dinámico en contrato** — hardcodeado como `'EventosApp'` en `events_page.dart:591`
- ❌ **Plan de suscripción en Settings** — web muestra plan actual (basic/premium); Flutter no
- ❌ **Auto-status a "confirmed" al pagar total** — web lo hace automáticamente; Flutter no
- ❌ **Offline mode** — no implementado
- ❌ **Push notifications** — no implementado

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
