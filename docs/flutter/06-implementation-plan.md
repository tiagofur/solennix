# Plan de Implementacion — Paridad Web <-> Flutter

> Ultima actualizacion: 2026-02-17

Este documento describe el estado actual de paridad entre la web y la app Flutter, y los gaps que aun quedan pendientes.

---

## Indice

- [Estado Actual](#estado-actual)
- [Tabla Comparativa Web vs Flutter](#tabla-comparativa)
- [Endpoints API: Cobertura](#endpoints-api-cobertura)
- [Gaps Pendientes](#gaps-pendientes)

---

## Estado Actual

### Resumen

| Metrica | Valor |
|---------|-------|
| Paginas en Web | 18 (incluyendo sub-componentes de eventos) |
| Paginas en Flutter | 20+ rutas registradas |
| Endpoints totales del API | ~30 |
| Endpoints usados por Flutter | ~25 (83%) |
| Endpoints NO usados por Flutter | ~5 (17%) |
| Features completamente implementadas | Auth, Clients, Products, Inventory, Events, Calendar, Search, PDF |
| Features con datos mock | Dashboard (pendiente verificar) |
| Features solo UI (sin backend) | Settings (perfil, contrato, preferencias) |

### Notas de Arquitectura

- **`events_page.dart`** (~2400 lineas) contiene 4 clases en un solo archivo: `EventsPage`, `EventDetailPage`, `EventFormPage`, `CalendarPage`. Funciona correctamente.
- **`settings_page.dart`** contiene 4 clases: `SettingsPage`, `ProfilePage`, `ContractSettingsPage`, `AppSettingsPage`.
- No existe carpeta `features/pdf/` — el generador de PDF esta en `core/utils/pdf_generator.dart`.
- No existen use cases como archivos separados — la logica esta en los providers/notifiers.

---

## Tabla Comparativa

| Funcionalidad | Web (React) | Flutter | Estado |
|---|---|---|---|
| Landing Page | `Landing.tsx` | `SplashPage` | ✅ OK |
| Login | `Login.tsx` | `LoginPage` | ✅ OK |
| Register | `Register.tsx` | `RegisterPage` | ✅ OK |
| Forgot Password | `ForgotPassword.tsx` | `ForgotPasswordPage` | ✅ OK |
| Dashboard (KPIs reales) | `Dashboard.tsx` | `DashboardPage` | ⚠️ VERIFICAR MOCK |
| Dashboard (grafico ingresos) | Recharts BarChart | `EventStatusChart` (fl_chart) | ⚠️ VERIFICAR MOCK |
| Dashboard (eventos proximos) | Lista con servicio real | Lista en DashboardPage | ⚠️ VERIFICAR MOCK |
| Dashboard (alertas inventario) | Consulta inventario bajo | Cards en DashboardPage | ⚠️ VERIFICAR MOCK |
| Calendario | `CalendarView.tsx` | `CalendarPage` (table_calendar) | ✅ OK |
| Lista Clientes | `ClientList.tsx` | `ClientsPage` | ✅ OK |
| Form Clientes (crear+editar) | `ClientForm.tsx` | `ClientFormPage` | ✅ OK |
| Detalle Clientes | `ClientDetails.tsx` | `ClientDetailPage` | ✅ OK |
| Clientes - Tab Eventos | Lista de eventos del cliente | Tab "Eventos" con badges de estado | ✅ OK |
| Clientes - Tab Pagos | Lista de pagos con nombre evento | Tab "Pagos" con eventName | ✅ OK |
| Boton "Crear evento" desde cliente | Boton en header | AppBar + empty state | ✅ OK |
| Event Form (multi-step) | `EventForm.tsx` (4 pasos) | `EventFormPage` (4 pasos) | ✅ OK |
| Event Form - Productos | `EventProducts.tsx` | Step 2 con selector de productos | ✅ OK |
| Event Form - Extras | `EventExtras.tsx` | Step 3 con extras libres | ✅ OK |
| Event Form - Financials | `EventFinancials.tsx` | Step 4 con metricas financieras | ✅ OK |
| Event Summary | `EventSummary.tsx` (4 tabs) | `EventDetailPage` (4 tabs) | ✅ OK |
| Event Summary - Tab Resumen | Info general + productos + extras | Tab "Resumen" completo | ✅ OK |
| Event Summary - Tab Pagos | `Payments.tsx` con barra progreso | Tab completo con cards y barra | ✅ OK |
| Event Summary - Tab Ingredientes | Calculo automatico por receta | Tab con calculo por receta | ✅ OK |
| Event Summary - Tab Contrato | Vista de contrato con clausulas | Tab con vista legal + PDF | ✅ OK |
| Cambio status evento | Dropdown en resumen | Dropdown en tab Resumen | ✅ OK |
| Eliminar pago | Boton delete en lista | Boton delete con confirm dialog | ✅ OK |
| Lista Productos | `ProductList.tsx` | `ProductsPage` (grid) | ✅ OK |
| Form Productos | `ProductForm.tsx` + ingredientes | `ProductFormPage` (5 pasos) | ✅ OK |
| Productos - Ingredientes/Receta | Gestion de product_ingredients | Step 4 con selector de inventario | ✅ OK |
| Lista Inventario | `InventoryList.tsx` | `InventoryPage` con busqueda texto | ✅ OK |
| Form Inventario (crear+editar) | `InventoryForm.tsx` | `InventoryFormPage` | ✅ OK |
| Detalle Inventario | N/A | `InventoryDetailPage` | ✅ OK |
| Busqueda Global | `Search.tsx` | `SearchPage` | ✅ OK |
| Settings - Perfil | `Settings.tsx` PUT /api/users/me | `ProfilePage` UI solamente | ❌ SIN PERSISTENCIA |
| Settings - Contrato | `Settings.tsx` PUT /api/users/me | `ContractSettingsPage` UI | ❌ SIN PERSISTENCIA |
| Settings - App | N/A | `AppSettingsPage` UI | ❌ SIN PERSISTENCIA |
| Settings - Plan suscripcion | Muestra plan basic/premium | No implementado | ❌ FALTA |
| PDF Cotizacion | `pdfGenerator.ts` | `generateBudgetPDF` en pdf_generator.dart | ✅ OK |
| PDF Contrato | `pdfGenerator.ts` | `generateContractPDF` en pdf_generator.dart | ✅ OK |
| PDF lista de compras | PDF de ingredientes del evento | No implementado | ❌ FALTA |
| PDF reporte de pagos | PDF de historial de pagos | No implementado | ❌ FALTA |
| business_name dinamico | Lee de perfil del usuario | Hardcodeado como 'EventosApp' | ❌ BUG |
| Auto-status confirmed al pagar | Cambia a confirmed al pagar total | No implementado | ❌ FALTA |
| Layout con sidebar | `Layout.tsx` | `CustomBottomNav` | ✅ OK (patron mobile) |
| Auth Guard | `ProtectedRoute.tsx` | Implementado en app_router.dart | ✅ OK |
| Pagina 404 | `NotFound.tsx` | `NotFoundPage` en shared/widgets | ✅ OK |
| Confirm Dialog | `ConfirmDialog.tsx` | `AlertDialog` inline | ✅ OK |
| Error Handler | `errorHandler.ts` | `ApiException` | ✅ OK |

---

## Endpoints API: Cobertura

| Endpoint | Metodo | Web | Flutter | Estado |
|---|---|---|---|---|
| `/api/auth/login` | POST | ✅ | ✅ | OK |
| `/api/auth/register` | POST | ✅ | ✅ | OK |
| `/api/auth/forgot-password` | POST | ✅ | ✅ | OK |
| `/api/auth/refresh` | POST | ✅ | ✅ | OK |
| `/api/auth/me` | GET | ✅ | ✅ | OK |
| `/api/users/me` | PUT | ✅ | ❌ | PENDIENTE (Settings) |
| `/api/clients` | GET | ✅ | ✅ | OK |
| `/api/clients` | POST | ✅ | ✅ | OK |
| `/api/clients/{id}` | GET | ✅ | ✅ | OK |
| `/api/clients/{id}` | PUT | ✅ | ✅ | OK |
| `/api/clients/{id}` | DELETE | ✅ | ✅ | OK |
| `/api/events` | GET | ✅ | ✅ | OK |
| `/api/events` | POST | ✅ | ✅ | OK |
| `/api/events/{id}` | GET | ✅ | ✅ | OK |
| `/api/events/{id}` | PUT | ✅ | ✅ | OK |
| `/api/events/{id}` | DELETE | ✅ | ✅ | OK |
| `/api/events/upcoming` | GET | ✅ | ⚠️ | VERIFICAR |
| `/api/events/{id}/products` | GET | ✅ | ✅ | OK |
| `/api/events/{id}/extras` | GET | ✅ | ✅ | OK |
| `/api/events/{id}/items` | PUT | ✅ | ✅ | OK |
| `/api/products` | GET | ✅ | ✅ | OK |
| `/api/products` | POST | ✅ | ✅ | OK |
| `/api/products/{id}` | GET | ✅ | ✅ | OK |
| `/api/products/{id}` | PUT | ✅ | ✅ | OK |
| `/api/products/{id}` | DELETE | ✅ | ✅ | OK |
| `/api/products/{id}/ingredients` | GET | ✅ | ✅ | OK |
| `/api/products/{id}/ingredients` | PUT | ✅ | ✅ | OK |
| `/api/inventory` | GET | ✅ | ✅ | OK |
| `/api/inventory` | POST | ✅ | ✅ | OK |
| `/api/inventory/{id}` | GET | ✅ | ✅ | OK |
| `/api/inventory/{id}` | PUT | ✅ | ✅ | OK |
| `/api/inventory/{id}` | DELETE | ✅ | ✅ | OK |
| `/api/payments` | GET | ✅ | ✅ | OK |
| `/api/payments` | POST | ✅ | ✅ | OK |
| `/api/payments/{id}` | PUT | ✅ | ✅ | OK |
| `/api/payments/{id}` | DELETE | ✅ | ✅ | OK |
| `/api/search?q=` | GET | ✅ | ✅ | OK |
| `/api/dashboard/stats` | GET | ✅ | ⚠️ MOCK | VERIFICAR |

---

## Gaps Pendientes

### Gap 1: Settings sin persistencia real

**Archivos**: `flutter/lib/features/settings/presentation/pages/settings_page.dart`

**Problema**: `ProfilePage` y `ContractSettingsPage` tienen formularios con campos pero no llaman al API. `AppSettingsPage` no guarda en Hive.

**Accion requerida**:
- Agregar llamada a `PUT /api/users/me` en el `_save()` de `ProfilePage` con campos: `name`, `business_name`
- Agregar llamada a `PUT /api/users/me` en el `_save()` de `ContractSettingsPage` con campos: `default_deposit_percent`, `default_cancellation_days`, `default_refund_percent`
- Guardar preferencias de `AppSettingsPage` en Hive (tema, moneda, notificaciones)

**Campos del endpoint `PUT /api/users/me`**:
```json
{
  "name": "string",
  "business_name": "string|null",
  "default_deposit_percent": "number|null",
  "default_cancellation_days": "number|null",
  "default_refund_percent": "number|null"
}
```

---

### Gap 2: business_name hardcodeado en contrato

**Archivo**: `flutter/lib/features/events/presentation/pages/events_page.dart` linea ~591

**Problema**: El nombre del negocio en el contrato y PDFs esta hardcodeado como `'EventosApp'` en lugar de leer del perfil del usuario autenticado.

**Accion requerida**: Leer `user.businessName ?? user.name` del provider de auth.

---

### Gap 3: Dashboard con datos mock (verificar)

**Archivo**: `flutter/lib/features/dashboard/data/data_sources/dashboard_remote_data_source.dart`

**Problema**: Verificar si el data source tiene datos hardcoded en lugar de llamar al API real.

**Accion requerida**: Verificar que llame a `GET /api/dashboard/stats` y `GET /api/events/upcoming`.

---

### Gap 4: PDFs adicionales faltantes

**Problema**: Web genera 2 PDFs adicionales que Flutter no tiene:
1. PDF de lista de compras (ingredientes necesarios para el evento)
2. PDF de reporte de pagos (historial de abonos)

**Accion requerida**: Agregar funciones en `core/utils/pdf_generator.dart`:
- `generateShoppingListPDF(event, ingredients)` — tabla de ingredientes con cantidades
- `generatePaymentsReportPDF(event, payments)` — tabla de pagos con totales

---

### Gap 5: Auto-status a "confirmed" al pagar total

**Problema**: En la web, cuando el monto pagado iguala o supera el total del evento, el estado cambia automaticamente a "confirmed". Flutter no hace esto.

**Accion requerida**: En `deletePayment()` y `addPayment()` del `EventDetailNotifier`, verificar si `totalPaid >= event.totalAmount` y si es asi, llamar `PUT /api/events/{id}` con `{ "status": "confirmed" }`.

---

### Gap 6: Plan de suscripcion en Settings

**Problema**: La web muestra el plan actual del usuario (basic/premium) con boton de upgrade. Flutter no lo tiene.

**Accion requerida**: Agregar seccion de plan en `SettingsPage` o `ProfilePage` mostrando `user.plan` del provider de auth.
