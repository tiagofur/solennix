# Plan de Implementacion — Paridad Web <-> Flutter

> Ultima actualizacion: 2026-02-17

Este documento describe el plan completo para llevar la app Flutter a paridad con la web, fase por fase, con detalle de cada tarea, endpoints involucrados, y archivos a crear o modificar.

---

## Indice

- [Estado Actual](#estado-actual)
- [Tabla Comparativa Web vs Flutter](#tabla-comparativa)
- [Endpoints API: Cobertura](#endpoints-api-cobertura)
- [Fase 0: Infraestructura Critica](#fase-0-infraestructura-critica)
- [Fase 1: Dashboard Real](#fase-1-dashboard-real)
- [Fase 2: Settings Completo](#fase-2-settings-completo)
- [Fase 3: Inventario Completo](#fase-3-inventario-completo)
- [Fase 4: Eventos Paridad Completa](#fase-4-eventos-paridad-completa)
- [Fase 5: Productos Paridad Completa](#fase-5-productos-paridad-completa)
- [Fase 6: Generacion de PDFs](#fase-6-generacion-de-pdfs)
- [Fase 7: Pulido y Consistencia](#fase-7-pulido-y-consistencia)
- [Orden de Ejecucion](#orden-de-ejecucion)

---

## Estado Actual

### Resumen

| Metrica | Valor |
|---------|-------|
| Paginas en Web | 18 (incluyendo sub-componentes de eventos) |
| Paginas en Flutter | 20 rutas registradas |
| Endpoints totales del API | ~30 |
| Endpoints usados por Flutter | ~20 (67%) |
| Endpoints NO usados por Flutter | ~10 (33%) |
| Features completamente implementadas | Auth, Clients (parcial), Products (parcial) |
| Features con datos mock | Dashboard |
| Features solo UI (sin backend) | Settings (perfil, contrato, preferencias) |
| Features incompletas | Inventory (sin edicion), Events (sin tabs completos), Products (sin ingredientes) |

### Problemas Criticos Detectados

1. **Bug en router**: `/events/:id` se registra antes de `/events/new` — GoRouter podria capturar "new" como un ID
2. **Dashboard con datos falsos**: `DashboardRemoteDataSource` tiene datos hardcoded, no llama al API
3. **Settings sin persistencia**: Perfil, contrato y preferencias no guardan nada
4. **Sin auth guard**: Todas las rutas son accesibles sin autenticacion
5. **Sin pagina 404**: No hay `errorBuilder` en el router
6. **Sin utilidades de finanzas**: No existe equivalente a `finance.ts` del web

---

## Tabla Comparativa

| Funcionalidad | Web (React) | Flutter | Estado |
|---|---|---|---|
| Landing Page | `Landing.tsx` | `SplashPage` | OK (diferente por diseno) |
| Login | `Login.tsx` | `LoginPage` | OK |
| Register | `Register.tsx` | `RegisterPage` | OK |
| Forgot Password | `ForgotPassword.tsx` | `ForgotPasswordPage` | OK |
| Dashboard (KPIs reales) | `Dashboard.tsx` | `DashboardPage` | MOCK DATA |
| Dashboard (grafico ingresos) | Recharts BarChart | fl_chart | MOCK DATA |
| Dashboard (eventos proximos) | Lista con servicio real | Mock list | MOCK DATA |
| Dashboard (alertas inventario) | Consulta inventario bajo | Hardcoded | MOCK DATA |
| Calendario | `CalendarView.tsx` | `CalendarPage` | OK |
| Lista Clientes | `ClientList.tsx` | `ClientsPage` | OK |
| Form Clientes (crear+editar) | `ClientForm.tsx` | `ClientFormPage` | OK |
| Detalle Clientes | `ClientDetails.tsx` | `ClientDetailPage` | OK |
| Event Form (multi-step) | `EventForm.tsx` (4 pasos) | `EventFormPage` | PARCIAL |
| Event Form - Productos | `EventProducts.tsx` | No implementado | FALTA |
| Event Form - Extras | `EventExtras.tsx` | No implementado | FALTA |
| Event Form - Financials | `EventFinancials.tsx` | No implementado | FALTA |
| Event Summary | `EventSummary.tsx` (4 tabs) | `EventDetailPage` | PARCIAL |
| Event Summary - Pagos tab | `Payments.tsx` | Dialog basico | PARCIAL |
| Event Summary - Ingredientes | Calculo automatico | No implementado | FALTA |
| Event Summary - Contrato | Vista de contrato | No implementado | FALTA |
| Cambio status evento | Dropdown en resumen | No implementado | FALTA |
| Lista Productos | `ProductList.tsx` | `ProductsPage` | OK |
| Form Productos | `ProductForm.tsx` + ingredientes | `ProductFormPage` | PARCIAL |
| Productos - Ingredientes | Gestion de product_ingredients | No implementado | FALTA |
| Lista Inventario | `InventoryList.tsx` | `InventoryPage` | Sin FAB |
| Form Inventario (crear) | `InventoryForm.tsx` | `InventoryFormPage` | Solo crear |
| Form Inventario (editar) | `InventoryForm.tsx` | No implementado | FALTA |
| Detalle Inventario | N/A | `InventoryDetailPage` | Sin boton editar |
| Busqueda Global | `Search.tsx` | `SearchPage` | Funcional |
| Settings - Perfil | `Settings.tsx` | `ProfilePage` | PLACEHOLDER |
| Settings - Contrato | `Settings.tsx` | `ContractSettingsPage` | PLACEHOLDER |
| Settings - App | N/A | `AppSettingsPage` | PLACEHOLDER |
| PDF Cotizacion | `pdfGenerator.ts` | No implementado | FALTA |
| PDF Contrato | `pdfGenerator.ts` | No implementado | FALTA |
| Layout con sidebar | `Layout.tsx` | `CustomBottomNav` | OK (patron mobile) |
| Auth Guard | `ProtectedRoute.tsx` | No implementado | FALTA |
| Pagina 404 | `NotFound.tsx` | No implementado | FALTA |
| Finance Utils | `finance.ts` | No existe | FALTA |
| Confirm Dialog | `ConfirmDialog.tsx` | `ConfirmDialogWidget` | OK |
| Error Handler | `errorHandler.ts` | `ApiException` | PARCIAL |

---

## Endpoints API: Cobertura

| Endpoint | Metodo | Web | Flutter | Accion |
|---|---|---|---|---|
| `/api/auth/login` | POST | OK | OK | -- |
| `/api/auth/register` | POST | OK | OK | -- |
| `/api/auth/forgot-password` | POST | OK | OK | -- |
| `/api/auth/refresh` | POST | OK | OK | -- |
| `/api/auth/me` | GET | OK | OK | -- |
| `/api/users/me` | PUT | OK | **NO** | Fase 2 |
| `/api/clients` | GET | OK | OK | -- |
| `/api/clients` | POST | OK | OK | -- |
| `/api/clients/{id}` | GET | OK | OK | -- |
| `/api/clients/{id}` | PUT | OK | OK | -- |
| `/api/clients/{id}` | DELETE | OK | OK | -- |
| `/api/events` | GET | OK | OK | -- |
| `/api/events` | POST | OK | OK | -- |
| `/api/events/{id}` | GET | OK | OK | -- |
| `/api/events/{id}` | PUT | OK | OK | -- |
| `/api/events/{id}` | DELETE | OK | OK | -- |
| `/api/events/upcoming` | GET | OK | **NO** | Fase 1 |
| `/api/events/{id}/products` | GET | OK | **NO** | Fase 4 |
| `/api/events/{id}/extras` | GET | OK | **NO** | Fase 4 |
| `/api/events/{id}/items` | PUT | OK | **NO** | Fase 4 |
| `/api/products` | GET | OK | OK | -- |
| `/api/products` | POST | OK | OK | -- |
| `/api/products/{id}` | GET | OK | OK | -- |
| `/api/products/{id}` | PUT | OK | OK | -- |
| `/api/products/{id}` | DELETE | OK | OK | -- |
| `/api/products/{id}/ingredients` | GET | OK | **NO** | Fase 5 |
| `/api/products/{id}/ingredients` | PUT | OK | **NO** | Fase 5 |
| `/api/inventory` | GET | OK | OK | -- |
| `/api/inventory` | POST | OK | OK | -- |
| `/api/inventory/{id}` | GET | OK | OK | -- |
| `/api/inventory/{id}` | PUT | OK | **NO** | Fase 3 |
| `/api/inventory/{id}` | DELETE | OK | OK | -- |
| `/api/payments` | GET | OK | Parcial | Verificar filtros |
| `/api/payments` | POST | OK | OK | -- |
| `/api/payments/{id}` | PUT | OK | Verificar | -- |
| `/api/payments/{id}` | DELETE | OK | Verificar | -- |
| `/api/search?q=` | GET | OK | OK | -- |
| `/api/dashboard/stats` | GET | OK | **MOCK** | Fase 1 |

---

## Fase 0: Infraestructura Critica

**Prioridad**: URGENTE
**Estimado**: 1-2 dias
**Prerequisitos**: Ninguno

### 0.1 Corregir orden de rutas en `app_router.dart`

**Problema**: GoRouter matchea rutas en orden. `/events/:id` esta antes de `/events/new`, lo que podria capturar "new" como un ID.

**Archivo a modificar**: `flutter/lib/core/utils/app_router.dart`

**Cambio**: Mover todas las rutas `/*/new` ANTES de las rutas `/*/:id`:

```
ANTES:                          DESPUES:
/events/:id                     /events/new      <-- primero
/events/new                     /events/:id      <-- despues
/clients/:id                    /clients/new
/clients/new                    /clients/:id
/products/:id                   /products/new
/products/new                   /products/:id
/inventory/:id                  /inventory/new
/inventory/new                  /inventory/:id
```

### 0.2 Implementar auth guard en router

**Problema**: Todas las rutas son accesibles sin autenticacion. Un usuario no logueado puede acceder a `/dashboard`, `/events`, etc.

**Archivo a modificar**: `flutter/lib/core/utils/app_router.dart`

**Cambio**: Agregar callback `redirect` en GoRouter que:
1. Lee el token de `SecureStorage`
2. Si no hay token y la ruta NO es publica (`/splash`, `/login`, `/register`, `/forgot-password`), redirige a `/login`
3. Si hay token y la ruta ES de auth (`/login`, `/register`), redirige a `/dashboard`

**Dependencias**: `SecureStorage` (ya existe en `core/storage/secure_storage.dart`)

**Rutas publicas** (no requieren auth):
- `/splash`
- `/login`
- `/register`
- `/forgot-password`

**Rutas protegidas** (requieren auth): todas las demas

### 0.3 Agregar pagina de error / 404

**Problema**: Si el usuario navega a una ruta inexistente, no hay feedback visual.

**Archivos a crear**:
- `flutter/lib/shared/widgets/not_found_page.dart`

**Archivo a modificar**: `flutter/lib/core/utils/app_router.dart`

**Cambio**: Agregar `errorBuilder` en GoRouter que muestre una pagina con:
- Icono de error
- Mensaje "Pagina no encontrada"
- Boton "Ir al inicio" que navega a `/dashboard`

### 0.4 Crear utilidades de finanzas

**Problema**: No existe equivalente a `web/src/lib/finance.ts`. Los calculos de IVA, ventas netas, utilidad se necesitan en eventos y dashboard.

**Archivo a crear**: `flutter/lib/core/utils/finance_utils.dart`

**Funciones a implementar** (portando de `finance.ts`):

```dart
class FinanceUtils {
  static const double defaultTaxRate = 16.0; // IVA Mexico

  /// Calcula el IVA a partir del monto total (IVA incluido)
  /// Formula: total - (total / (1 + taxRate/100))
  static double calculateTax(double totalAmount, {double taxRate = 16.0});

  /// Calcula las ventas netas (sin IVA)
  /// Formula: total / (1 + taxRate/100)
  static double calculateNetSales(double totalAmount, {double taxRate = 16.0});

  /// Formatea un monto como moneda MXN
  /// Ejemplo: 23200.00 -> "$23,200.00"
  static String formatCurrency(double amount);

  /// Calcula el subtotal de productos de un evento
  static double calculateProductsSubtotal(List<EventProductEntity> products);

  /// Calcula el subtotal de extras de un evento
  static double calculateExtrasSubtotal(List<EventExtraEntity> extras);

  /// Calcula el total con descuento
  static double applyDiscount(double subtotal, double discountPercent);

  /// Calcula el monto del deposito
  static double calculateDeposit(double total, double depositPercent);

  /// Calcula el porcentaje pagado
  static double calculatePaidPercentage(double totalPaid, double totalAmount);
}
```

### 0.5 Mejorar error handling global

**Problema**: `ApiException` existe pero no todos los errores del backend son manejados de forma user-friendly.

**Archivo a revisar/modificar**: `flutter/lib/core/api/api_exception.dart`

**Cambio**: Verificar que mapee correctamente:
- 400 -> "Solicitud invalida" + detalles
- 401 -> "Sesion expirada, inicia sesion de nuevo"
- 403 -> "No tienes permiso para esta accion"
- 404 -> "Recurso no encontrado"
- 409 -> "Conflicto: el recurso ya existe"
- 422 -> "Datos invalidos"
- 429 -> "Demasiadas solicitudes, espera un momento"
- 500 -> "Error interno del servidor"

**Archivo a crear** (opcional): `flutter/lib/core/utils/error_handler.dart`

```dart
class ErrorHandler {
  /// Convierte una excepcion en un mensaje amigable para el usuario
  static String getUserMessage(dynamic error);

  /// Registra el error para debugging (sin exponer al usuario)
  static void logError(dynamic error, StackTrace? stackTrace);
}
```

---

## Fase 1: Dashboard Real

**Prioridad**: ALTA
**Estimado**: 2-3 dias
**Prerequisitos**: Fase 0.4 (finance_utils)

### Detalle de Tareas

#### 1.1 Verificar endpoint `/api/dashboard/stats` en backend

**Verificar**: Que el backend Go tenga el handler para `GET /api/dashboard/stats` con los campos:
- `net_sales`
- `cash_collected`
- `cash_applied_to_month`
- `vat_collected`
- `vat_outstanding`
- `events_this_month`
- `low_stock_count`
- `events_by_status` (objeto con quoted/confirmed/completed/cancelled)
- `upcoming_events` (array de eventos)

Si no existe, hay que verificar en el backend Go y posiblemente construir los stats agregando datos de los otros endpoints.

#### 1.2 Reemplazar `DashboardRemoteDataSource` mock con API real

**Archivo**: `flutter/lib/features/dashboard/data/data_sources/dashboard_remote_data_source.dart`

**Cambio**: Reemplazar datos hardcoded con:
```dart
Future<Map<String, dynamic>> getDashboardStats({String? month}) async {
  final response = await _apiClient.get(
    '${ApiConfig.dashboard}/stats',
    queryParameters: {'month': month ?? _currentMonth()},
  );
  return response;
}

Future<List<dynamic>> getUpcomingEvents({int limit = 5}) async {
  return await _apiClient.get(
    '${ApiConfig.events}/upcoming',
    queryParameters: {'limit': limit},
  );
}

Future<List<dynamic>> getLowStockItems() async {
  return await _apiClient.get(
    ApiConfig.inventory,
    queryParameters: {'low_stock': true},
  );
}
```

#### 1.3 Actualizar modelos de Dashboard

**Archivo**: `flutter/lib/features/dashboard/data/models/dashboard_model.dart`

Verificar que los campos del modelo coincidan con la respuesta del API.

#### 1.4 Actualizar DashboardPage

**Archivo**: `flutter/lib/features/dashboard/presentation/pages/dashboard_page.dart`

Verificar que los widgets de KPIs, grafico y lista de eventos usen datos del provider (no mock).

#### 1.5 Alertas de inventario bajo reales

**Archivo**: `flutter/lib/features/dashboard/presentation/widgets/`

Conectar la seccion de alertas con `GET /api/inventory?low_stock=true`.

---

## Fase 2: Settings Completo

**Prioridad**: ALTA
**Estimado**: 2-3 dias
**Prerequisitos**: Fase 0

### Detalle de Tareas

#### 2.1 Crear data layer para Settings

**Archivos a crear**:
- `flutter/lib/features/settings/data/data_sources/settings_remote_data_source.dart`
- `flutter/lib/features/settings/data/models/user_profile_model.dart`
- `flutter/lib/features/settings/data/repositories/settings_repository.dart`

**Endpoints a usar**:
- `GET /api/auth/me` — cargar perfil actual
- `PUT /api/users/me` — actualizar perfil

**Campos del perfil**:
```json
{
  "name": "string",
  "business_name": "string|null",
  "default_deposit_percent": "number|null",
  "default_cancellation_days": "number|null",
  "default_refund_percent": "number|null"
}
```

#### 2.2 Crear providers para Settings

**Archivos a crear**:
- `flutter/lib/features/settings/presentation/providers/settings_state.dart`
- `flutter/lib/features/settings/presentation/providers/settings_provider.dart`

#### 2.3 Conectar ProfilePage con API

**Archivo**: `flutter/lib/features/settings/presentation/pages/settings_page.dart` (clase `ProfilePage`)

**Cambios**:
- Cargar datos del usuario al iniciar la pagina
- Pre-llenar campos con datos existentes
- Guardar cambios con `PUT /api/users/me`
- Mostrar error/exito real

#### 2.4 Conectar ContractSettingsPage con API

**Archivo**: `flutter/lib/features/settings/presentation/pages/settings_page.dart` (clase `ContractSettingsPage`)

**Cambios**:
- Cargar `default_deposit_percent`, `default_cancellation_days`, `default_refund_percent`
- Guardar cambios con `PUT /api/users/me`

#### 2.5 AppSettingsPage con persistencia local

**Archivo**: `flutter/lib/features/settings/presentation/pages/settings_page.dart` (clase `AppSettingsPage`)

**Cambios**:
- Guardar preferencias en Hive (no necesita API):
  - Tema (claro/oscuro)
  - Moneda (MXN/USD)
  - Notificaciones (on/off)
  - Vista compacta (on/off)
- Cargar preferencias al iniciar

---

## Fase 3: Inventario Completo

**Prioridad**: ALTA
**Estimado**: 1-2 dias
**Prerequisitos**: Fase 0

### Detalle de Tareas

#### 3.1 Agregar FAB en InventoryPage

**Archivo**: `flutter/lib/features/inventory/presentation/pages/inventory_page.dart`

**Cambio**: Agregar `FloatingActionButton` que navega a `/inventory/new`

#### 3.2 Implementar edicion en InventoryFormPage

**Archivo**: `flutter/lib/features/inventory/presentation/pages/inventory_form_page.dart`

**Cambios**:
- Recibir `inventoryId` opcional como parametro
- Si tiene ID: cargar datos existentes y pre-llenar campos
- Cambiar titulo a "Editar item" cuando es edicion
- Usar `PUT /api/inventory/{id}` en lugar de `POST /api/inventory`
- Agregar manejo de errores en submit

#### 3.3 Agregar boton editar en InventoryDetailPage

**Archivo**: `flutter/lib/features/inventory/presentation/pages/inventory_detail_page.dart`

**Cambio**: Agregar boton de edicion en AppBar que navega al form con el ID

#### 3.4 Agregar ruta de edicion

**Archivo**: `flutter/lib/core/utils/app_router.dart`

**Cambio**: Agregar ruta `/inventory/edit/:id` o reutilizar `/inventory/new` con query parameter

---

## Fase 4: Eventos Paridad Completa

**Prioridad**: ALTA
**Estimado**: 3-5 dias
**Prerequisitos**: Fase 0, Fase 0.4 (finance_utils)

Esta es la fase mas compleja. El web tiene un wizard de 4 pasos y una pagina de resumen con 4 tabs.

### Detalle de Tareas

#### 4.1 Verificar campos del EventForm

**Archivo**: `flutter/lib/features/events/presentation/pages/events_page.dart` (EventFormPage)

**Campos requeridos** (comparar con web `EventForm.tsx`):
- `client_id` (selector de cliente)
- `event_date` (date picker)
- `start_time` / `end_time` (time pickers)
- `service_type` (texto o selector)
- `num_people` (numero)
- `status` (dropdown: quoted/confirmed/completed/cancelled)
- `location` (texto)
- `city` (texto)
- `notes` (texto largo)
- `requires_invoice` (switch/checkbox)
- `tax_rate` (numero, default 16)
- `discount` (numero, porcentaje)
- `deposit_percent` (numero)
- `cancellation_days` (numero)
- `refund_percent` (numero)

#### 4.2 Implementar step de productos en EventForm

**Archivos a crear/modificar**:
- Widget `EventProductsStep` dentro del form wizard

**Funcionalidad**:
- Buscar/seleccionar productos del catalogo (`GET /api/products`)
- Agregar producto con cantidad y precio unitario
- Opcionalmente aplicar descuento por producto
- Mostrar subtotal de productos
- Permitir quitar productos

**Modelo de datos** (lo que se envia al API):
```json
{
  "product_id": "uuid",
  "quantity": 1.0,
  "unit_price": 20000.00,
  "discount": 0
}
```

#### 4.3 Implementar step de extras en EventForm

**Funcionalidad**:
- Agregar extras libres (no del catalogo)
- Campos por extra: descripcion, costo, precio, exclude_utility (toggle)
- Mostrar subtotal de extras

**Modelo de datos**:
```json
{
  "description": "DJ adicional",
  "cost": 2000.00,
  "price": 3000.00,
  "exclude_utility": false
}
```

#### 4.4 Implementar step financiero en EventForm

**Funcionalidad**:
- Mostrar resumen de costos: subtotal productos + subtotal extras
- Toggle "Requiere factura" -> activa calculo de IVA
- Campo de porcentaje de descuento
- Calcular: subtotal, descuento, subtotal con descuento, IVA (si aplica), TOTAL
- Usar `FinanceUtils` (Fase 0.4)

#### 4.5 Guardar evento con productos y extras

**Endpoint**: `PUT /api/events/{id}/items`

**Request body**:
```json
{
  "products": [...],
  "extras": [...]
}
```

**Flujo**:
1. Crear/actualizar evento con `POST/PUT /api/events`
2. Guardar items con `PUT /api/events/{id}/items`

#### 4.6 EventDetailPage - Implementar 4 tabs

**Archivo**: `flutter/lib/features/events/presentation/pages/events_page.dart` (EventDetailPage)

**Tabs a implementar** (como en web `EventSummary.tsx`):

**Tab 1: Resumen**
- Info general del evento (fecha, hora, lugar, tipo, personas)
- Info del cliente
- Tabla de productos con cantidades y precios
- Tabla de extras
- Resumen financiero (subtotal, descuento, IVA, total)
- Status del evento con opcion de cambiar

**Tab 2: Pagos**
- Lista de pagos registrados (`GET /api/payments?event_id={id}`)
- Total pagado vs total del evento
- Porcentaje pagado (barra de progreso)
- Boton "Agregar pago" que abre dialog/form
- Formulario de pago: monto, fecha, metodo (efectivo/transferencia/tarjeta), notas
- Endpoint crear: `POST /api/payments`
- Endpoint eliminar: `DELETE /api/payments/{id}`

**Tab 3: Ingredientes**
- Calcular ingredientes necesarios basado en:
  - Productos del evento (con cantidades)
  - Ingredientes de cada producto (`product_ingredients`)
  - Multiplicar por cantidad del evento
- Mostrar: ingrediente, cantidad necesaria, stock actual, status (suficiente/insuficiente)
- Endpoint: `GET /api/products/{id}/ingredients` por cada producto

**Tab 4: Contrato**
- Vista previa del contrato con:
  - Datos del negocio (del perfil del usuario)
  - Datos del cliente
  - Detalle del evento
  - Condiciones: deposito %, dias cancelacion, reembolso %
  - Total y deposito requerido
- Boton "Generar PDF" (Fase 6)

#### 4.7 Cambio de status del evento

**Funcionalidad**: Dropdown o chips para cambiar entre:
- `quoted` (Cotizado)
- `confirmed` (Confirmado)
- `completed` (Completado)
- `cancelled` (Cancelado)

**Endpoint**: `PUT /api/events/{id}` con `{ "status": "confirmed" }`

#### 4.8 Edicion de eventos existentes

Verificar que `EventFormPage` soporte recibir un `eventId`, cargar datos existentes, y usar `PUT` en lugar de `POST`.

#### 4.9 Nuevos modelos necesarios

**Archivos a crear**:
- `flutter/lib/features/events/data/models/event_product_model.dart`
- `flutter/lib/features/events/data/models/event_extra_model.dart`
- `flutter/lib/features/events/domain/entities/event_product_entity.dart`
- `flutter/lib/features/events/domain/entities/event_extra_entity.dart`

#### 4.10 Nuevos endpoints en data source de eventos

**Archivo**: `flutter/lib/features/events/data/data_sources/events_remote_data_source.dart`

**Metodos a agregar**:
- `getEventProducts(eventId)` -> `GET /api/events/{id}/products`
- `getEventExtras(eventId)` -> `GET /api/events/{id}/extras`
- `updateEventItems(eventId, products, extras)` -> `PUT /api/events/{id}/items`
- `getUpcomingEvents(limit)` -> `GET /api/events/upcoming`

---

## Fase 5: Productos Paridad Completa

**Prioridad**: MEDIA
**Estimado**: 2-3 dias
**Prerequisitos**: Fase 3 (inventario completo, necesario para seleccionar ingredientes)

### Detalle de Tareas

#### 5.1 Verificar ProductForm

**Archivo**: ProductFormPage (verificar campos)

**Campos**:
- `name` (texto, requerido)
- `category` (texto o selector, requerido)
- `base_price` (numero, requerido)
- `recipe` (JSONB, opcional — campo de texto libre o JSON editor)
- `is_active` (switch, default true)

#### 5.2 Implementar gestion de ingredientes del producto

**Archivos a crear**:
- `flutter/lib/features/products/data/models/product_ingredient_model.dart`
- `flutter/lib/features/products/domain/entities/product_ingredient_entity.dart`

**Funcionalidad en ProductFormPage**:
- Seccion "Ingredientes/Receta" en el form
- Buscar ingredientes del inventario (`GET /api/inventory`)
- Agregar ingrediente con cantidad requerida
- Guardar con `PUT /api/products/{id}/ingredients`

**Funcionalidad en ProductDetailPage**:
- Mostrar lista de ingredientes vinculados
- Cargar con `GET /api/products/{id}/ingredients`

#### 5.3 Nuevos endpoints en data source de productos

**Archivo**: products_remote_data_source.dart

**Metodos a agregar**:
- `getProductIngredients(productId)` -> `GET /api/products/{id}/ingredients`
- `updateProductIngredients(productId, ingredients)` -> `PUT /api/products/{id}/ingredients`

---

## Fase 6: Generacion de PDFs

**Prioridad**: MEDIA
**Estimado**: 2-3 dias
**Prerequisitos**: Fase 2 (settings con datos del negocio), Fase 4 (eventos completos)

### Detalle de Tareas

#### 6.1 Crear servicio de PDF

**Archivo a crear**: `flutter/lib/core/services/pdf_service.dart`

**Dependencia**: `syncfusion_flutter_pdf` (ya en pubspec.yaml)

#### 6.2 PDF de Cotizacion (Budget)

**Portar logica de `web/src/lib/pdfGenerator.ts`**

**Contenido del PDF**:
- Logo/nombre del negocio
- Datos del cliente (nombre, telefono, email)
- Datos del evento (fecha, hora, lugar, tipo, personas)
- Tabla de productos (nombre, cantidad, precio unitario, subtotal)
- Tabla de extras (descripcion, precio)
- Resumen financiero (subtotal, descuento, IVA si aplica, total)
- Condiciones de pago (deposito %, forma de pago)
- Fecha de generacion

#### 6.3 PDF de Contrato

**Contenido del PDF**:
- Encabezado: "Contrato de Servicios"
- Partes: datos del negocio + datos del cliente
- Clausulas:
  - Objeto del contrato (tipo de evento, fecha, lugar)
  - Servicios contratados (lista de productos y extras)
  - Precio total acordado
  - Forma de pago y deposito
  - Cancelacion (dias de anticipacion, porcentaje de reembolso)
  - Responsabilidades de cada parte
- Espacios para firma
- Fecha

#### 6.4 Compartir/Descargar PDF

Usar `share_plus` (ya en pubspec.yaml) para:
- Guardar PDF en almacenamiento temporal
- Abrir share sheet del SO para enviar por WhatsApp, email, etc.

#### 6.5 Integrar botones en EventDetailPage

**Archivo**: EventDetailPage (tab Contrato o tab Resumen)

Agregar botones:
- "Generar Cotizacion PDF"
- "Generar Contrato PDF"
- "Compartir"

---

## Fase 7: Pulido y Consistencia

**Prioridad**: MEDIA
**Estimado**: 2-3 dias
**Prerequisitos**: Fases 1-6

### Detalle de Tareas

#### 7.1 Separar events_page.dart

**Problema**: Un solo archivo (~955 lineas) contiene `EventsPage`, `EventDetailPage`, `EventFormPage`, `CalendarPage`.

**Archivos a crear**:
- `flutter/lib/features/events/presentation/pages/events_list_page.dart`
- `flutter/lib/features/events/presentation/pages/event_detail_page.dart`
- `flutter/lib/features/events/presentation/pages/event_form_page.dart`
- `flutter/lib/features/events/presentation/pages/calendar_page.dart`

#### 7.2 Busqueda mejorada

**Archivo**: `flutter/lib/features/search/`

**Mejoras**:
- Agregar debouncing (300ms delay despues de dejar de escribir)
- Busqueda live (on change, no solo on submit)
- Incluir inventario en resultados de busqueda

#### 7.3 Empty states consistentes

Verificar que TODAS las listas tengan:
- Icono descriptivo
- Mensaje claro (ej: "No hay clientes registrados")
- Boton de accion (ej: "Agregar primer cliente")

**Paginas a verificar**: ClientsPage, EventsPage, ProductsPage, InventoryPage, SearchPage (sin resultados)

#### 7.4 Pull-to-refresh en todas las listas

Verificar `RefreshIndicator` en: ClientsPage, EventsPage, ProductsPage, InventoryPage

#### 7.5 Confirmacion de eliminacion

Verificar que TODOS los flujos de delete usen `ConfirmDialogWidget` con mensaje descriptivo.

#### 7.6 Snackbars consistentes

Estandarizar mensajes de exito/error despues de operaciones CRUD:
- Crear: "Cliente creado exitosamente"
- Actualizar: "Cliente actualizado exitosamente"
- Eliminar: "Cliente eliminado"
- Error: Mensaje del `ErrorHandler`

#### 7.7 Loading states granulares

Verificar indicadores de carga especificos para cada operacion (crear vs cargar lista vs eliminar).

#### 7.8 Bottom Navigation

Verificar que `CustomBottomNav` incluya acceso rapido a:
- Dashboard
- Eventos
- Clientes
- Productos
- Mas (menu con inventario, busqueda, settings)

---

## Orden de Ejecucion

```
Semana 1:
  Fase 0 (Infraestructura)     -> 1-2 dias
  Fase 3 (Inventario Completo) -> 1-2 dias

Semana 2:
  Fase 1 (Dashboard Real)      -> 2-3 dias
  Fase 2 (Settings)            -> 2-3 dias

Semana 3-4:
  Fase 4 (Eventos Completos)   -> 3-5 dias
  Fase 5 (Productos)           -> 2-3 dias

Semana 4-5:
  Fase 6 (PDFs)                -> 2-3 dias
  Fase 7 (Pulido)              -> 2-3 dias
```

**Total estimado: 15-24 dias de desarrollo**

---

## Verificacion Final

Al completar todas las fases, la app Flutter debera tener:

- [ ] Todas las paginas del web replicadas con UX mobile
- [ ] Todos los endpoints del API utilizados
- [ ] Auth guard protegiendo rutas privadas
- [ ] Dashboard con datos reales del API
- [ ] Settings guardando en API y localmente
- [ ] Inventario con CRUD completo (crear + editar + eliminar)
- [ ] Eventos con wizard multi-step (info, productos, extras, financials)
- [ ] Eventos con detalle de 4 tabs (resumen, pagos, ingredientes, contrato)
- [ ] Productos con gestion de ingredientes
- [ ] Generacion de PDFs (cotizacion y contrato)
- [ ] Busqueda global mejorada
- [ ] UX consistente (empty states, loading, confirmaciones, snackbars)
- [ ] Sin datos mock en produccion
