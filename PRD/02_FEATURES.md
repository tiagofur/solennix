# Solennix — Documento Unificado de Features

**Version:** 1.0
**Fecha:** 2026-03-20
**Plataformas:** iOS (iPhone/iPad), Android (Phone/Tablet), Web (React SPA), Backend (Go/PostgreSQL)
**Autor:** Tiago David + Claude Code
**Estado:** Borrador

---

## Convenciones de Etiquetas

| Etiqueta | Significado |
|----------|-------------|
| **[Todas]** | Feature compartida en todas las plataformas (iOS, Android, Web, Backend) |
| **[iOS]** | Exclusiva de iOS (iPhone, iPad) |
| **[Android]** | Exclusiva de Android (Phone, Tablet) |
| **[Web]** | Exclusiva de la aplicacion web (React) |
| **[Backend]** | Exclusiva del servidor (Go API) |
| **[Mobile]** | Compartida entre iOS y Android |

### Estados de implementacion

| Simbolo | Estado |
|---------|--------|
| ✅ | Implementado |
| 🔄 | En progreso |
| ⬜ | Pendiente |
| ➖ | No aplica |

---

## P0 — Must-Have (Obligatorio)

### 1. Gestion de Eventos [Todas]

El modulo central de Solennix. Permite a organizadores de eventos crear, cotizar, confirmar y gestionar eventos completos con productos, equipo, insumos, precios y galeria de fotos.

#### Formulario multi-paso

El formulario de creacion/edicion de eventos esta dividido en pasos para reducir la carga cognitiva:

| Paso | Nombre | Contenido | Plataforma |
|------|--------|-----------|------------|
| 1 | Informacion General | Cliente, fecha, horario, tipo de servicio, num. personas, status, ubicacion, ciudad | [Todas] |
| 2 | Productos | Seleccion de productos del catalogo, cantidad, precio unitario, descuento por producto | [Todas] |
| 3 | Extras | Cargos adicionales con descripcion, costo, precio y opcion de excluir utilidad | [Todas] |
| 4 | Equipo e Insumos | Equipo asignado con deteccion de conflictos + insumos con fuente (stock/compra) y opcion de excluir costo | [Todas] |
| 5 | Finanzas y Revision | Subtotal, descuento global (% o fijo), IVA, total, deposito, condiciones de cancelacion, notas | [Todas] |

**Notas por plataforma:**
- **[iOS]**: `EventFormView` con SwiftUI, navegacion por `TabView` o stepper. Steps en `EventFormSteps/Step1GeneralView.swift` a `Step5FinancesView.swift`.
- **[Android]**: `EventFormScreen.kt` con Jetpack Compose, formulario multi-paso con `HorizontalPager` o stepper manual.
- **[Web]**: Componentes separados: `EventGeneralInfo.tsx`, `EventProducts.tsx`, `EventExtras.tsx`, `EventEquipment.tsx`, `EventSupplies.tsx`, `EventFinancials.tsx`, `Payments.tsx`.

#### Estados del evento

| Estado | Descripcion |
|--------|-------------|
| `cotizado` | Propuesta enviada al cliente, pendiente de confirmacion |
| `confirmado` | Cliente acepto, evento programado |
| `completado` | Evento realizado exitosamente |
| `cancelado` | Evento cancelado por el cliente o el organizador |

#### Pricing con IVA y descuentos

- **Descuento global**: Porcentaje (`discount_type: 'percent'`) o monto fijo (`discount_type: 'fixed'`).
- **IVA configurable**: `tax_rate` y `tax_amount` calculados. Facturacion opcional (`requires_invoice`).
- **Deposito**: Porcentaje configurable (`deposit_percent`) heredado de la configuracion del negocio o personalizado por evento.
- **Condiciones de cancelacion**: Dias de anticipacion (`cancellation_days`) y porcentaje de reembolso (`refund_percent`).

#### Galeria de fotos del evento

- Subida de imagenes individuales por evento (endpoint `POST /api/events/{id}/photos`).
- Listado de fotos con URL y thumbnail (`GET /api/events/{id}/photos`).
- Eliminacion individual (`DELETE /api/events/{id}/photos/{photoId}`).
- **[Mobile]**: Seleccion desde camara o galeria del dispositivo.
- **[Web]**: Upload con drag-and-drop o selector de archivos.

#### Deteccion de conflictos de equipo

Cuando se asigna equipo a un evento, el sistema verifica automaticamente si ese equipo ya esta reservado para otro evento en la misma fecha:

- **Endpoint**: `POST /api/events/equipment/conflicts` (Web, JSON body) / `GET /api/events/equipment/conflicts` (Mobile, query params).
- Retorna lista de `EquipmentConflict` con: nombre del equipo, evento conflictivo, fecha, horario, tipo de servicio, nombre del cliente.
- Tipos de conflicto detectados: solapamiento completo o parcial de horarios.

#### Sugerencias de equipo e insumos

Basado en los productos seleccionados y sus recetas (ingredientes), el sistema sugiere automaticamente:

- **Equipo sugerido**: `GET/POST /api/events/equipment/suggestions` — calcula cantidad necesaria usando `ceil(product_qty / capacity)` si el equipo tiene capacidad definida, o `quantity_required` directo.
- **Insumos sugeridos**: `GET/POST /api/events/supplies/suggestions` — suma `quantity_required` de todos los productos que usan ese insumo.
- Los insumos incluyen `unit_cost` para estimar costos de compra.

**Tier:** FREE (hasta limite de plan) / BASIC / PRO (ilimitado)

---

### 2. Gestion de Clientes [Todas]

CRUD completo de clientes con informacion de contacto y metricas acumuladas.

#### Campos del cliente

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `name` | string | Si |
| `phone` | string | Si |
| `email` | string | No |
| `address` | string | No |
| `city` | string | No |
| `notes` | string | No |
| `photo_url` | string | No |

#### Metricas calculadas

- **`total_events`**: Conteo de eventos asociados al cliente.
- **`total_spent`**: Suma acumulada de los montos totales de sus eventos.

#### Funcionalidades

| Feature | Detalle |
|---------|---------|
| CRUD completo | Crear, leer, actualizar, eliminar clientes |
| Busqueda | Filtrado por nombre, telefono, email |
| Historial | Vista de eventos asociados y gasto total |
| Quick Client | Creacion rapida de cliente desde el formulario de evento (sheet/modal) |

**Implementacion Quick Client:**
- **[iOS]**: `QuickClientSheet.swift` — sheet presentado desde Step 1 del formulario de evento.
- **[Web]**: `QuickClientModal.tsx` — modal con formulario minimo (nombre + telefono).
- **[Android]**: Dialog integrado en `EventFormScreen.kt`.

**Endpoints Backend:**
- `GET /api/clients` — listar
- `POST /api/clients` — crear
- `GET /api/clients/{id}` — detalle
- `PUT /api/clients/{id}` — actualizar
- `DELETE /api/clients/{id}` — eliminar

**Tier:** FREE (hasta limite de plan) / BASIC / PRO (ilimitado)

---

### 3. Catalogo de Productos [Todas]

Gestion del catalogo de productos/servicios que el organizador ofrece en sus eventos.

#### Campos del producto

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `name` | string | Nombre del producto |
| `category` | string | Categoria (ej. "Bebidas", "Postres") |
| `base_price` | float64 | Precio base de venta |
| `recipe` | JSON | Receta con ingredientes del inventario |
| `image_url` | string | Imagen del producto |
| `is_active` | bool | Si esta activo en el catalogo |

#### Recetas e ingredientes

Cada producto puede tener una receta que vincula items del inventario como ingredientes:

| Campo | Descripcion |
|-------|-------------|
| `inventory_id` | Referencia al item de inventario |
| `quantity_required` | Cantidad necesaria por unidad de producto |
| `capacity` | Para equipo: cuantas unidades de producto maneja una pieza (nil = cantidad fija) |
| `bring_to_event` | Si este ingrediente debe transportarse al lugar del evento |

**Endpoints Backend:**
- `GET/POST /api/products` — listar/crear
- `GET/PUT/DELETE /api/products/{id}` — detalle/actualizar/eliminar
- `GET/PUT /api/products/{id}/ingredients` — ingredientes de la receta
- `POST /api/products/ingredients/batch` — ingredientes en lote (para multiples productos)

**Vistas por plataforma:**
- **[iOS]**: `ProductListView`, `ProductDetailView`, `ProductFormView`
- **[Android]**: `ProductListScreen`, `ProductDetailScreen`, `ProductFormScreen`
- **[Web]**: `ProductList`, `ProductForm`, `ProductDetails`

**Tier:** FREE (hasta limite de plan) / BASIC / PRO (ilimitado)

---

### 4. Inventario [Todas]

Gestion de equipos e insumos necesarios para los eventos.

#### Campos del item de inventario

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `ingredient_name` | string | Nombre del item |
| `type` | string | `'equipment'` (equipo) o `'supply'` (insumo) |
| `current_stock` | float64 | Stock actual |
| `minimum_stock` | float64 | Stock minimo para alertas |
| `unit` | string | Unidad de medida (kg, piezas, litros, etc.) |
| `unit_cost` | float64 | Costo por unidad (opcional) |

#### Diferencias entre tipos

| Aspecto | Equipo (`equipment`) | Insumo (`supply`) |
|---------|---------------------|-------------------|
| Ejemplo | Sillas, mesas, manteles | Harina, servilletas, decoracion |
| Uso | Se reserva para eventos, reutilizable | Se consume, no reutilizable |
| Conflictos | Si (deteccion de conflictos por fecha) | No |
| Capacidad | Si (cuantas unidades de producto maneja) | No aplica |
| Costo en evento | No se suma al costo del evento | Se suma (salvo `exclude_cost: true`) |
| Fuente en evento | N/A | `'stock'` (del inventario) o `'purchase'` (compra) |

**Endpoints Backend:**
- `GET/POST /api/inventory` — listar/crear
- `GET/PUT/DELETE /api/inventory/{id}` — detalle/actualizar/eliminar

**Vistas por plataforma:**
- **[iOS]**: `InventoryListView`, `InventoryDetailView`, `InventoryFormView`
- **[Android]**: `InventoryListScreen`, `InventoryDetailScreen`, `InventoryFormScreen`
- **[Web]**: `InventoryList`, `InventoryForm`, `InventoryDetails`

**Tier:** FREE (hasta limite de plan) / BASIC / PRO (ilimitado)

---

### 5. Calendario [Todas]

Vista mensual de eventos con soporte para fechas no disponibles (blackout dates).

#### Funcionalidades

| Feature | Detalle |
|---------|---------|
| Vista mensual | Grid de calendario con indicadores de eventos por dia |
| Navegacion por mes | Botones/gestos para avanzar y retroceder meses |
| Indicadores de eventos | Puntos o badges que muestran eventos en cada dia |
| Fechas no disponibles | El usuario puede bloquear fechas (vacaciones, dias festivos, etc.) |
| Tap en dia | Navega al detalle de eventos de ese dia |

#### Fechas no disponibles (Blackout Dates)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `start_date` | DATE | Fecha de inicio del bloqueo |
| `end_date` | DATE | Fecha de fin del bloqueo |
| `reason` | string | Motivo del bloqueo (opcional) |

**Endpoints Backend:**
- `GET /api/unavailable-dates` — listar
- `POST /api/unavailable-dates` — crear
- `DELETE /api/unavailable-dates/{id}` — eliminar

**Vistas por plataforma:**
- **[iOS]**: `CalendarView`, `CalendarGridView`
- **[Android]**: `CalendarScreen`
- **[Web]**: `CalendarView`

**Tier:** FREE

---

### 6. Autenticacion [Todas]

Sistema completo de autenticacion con multiples proveedores y gestion segura de sesiones.

#### Metodos de autenticacion

| Metodo | Detalle | Plataforma |
|--------|---------|------------|
| Email + Password | Registro y login con email y contrasena hasheada | [Todas] |
| Google Sign-In | OAuth 2.0 con Google | [Todas] |
| Apple Sign-In | Sign In with Apple | [Todas] |
| Refresh Tokens | Renovacion automatica de tokens JWT | [Todas] |

#### Flujos soportados

| Flujo | Endpoint | Detalle |
|-------|----------|---------|
| Registro | `POST /api/auth/register` | Crea cuenta con email/password |
| Login | `POST /api/auth/login` | Autenticacion con credenciales |
| Logout | `POST /api/auth/logout` | Invalida httpOnly cookie |
| Refresh Token | `POST /api/auth/refresh` | Renueva access token |
| Forgot Password | `POST /api/auth/forgot-password` | Envia email con token de reset |
| Reset Password | `POST /api/auth/reset-password` | Establece nueva contrasena con token |
| Cambiar contrasena | `POST /api/auth/change-password` | Cambio desde perfil (autenticado) |
| Google OAuth | `POST /api/auth/google` | Sign-in con token de Google |
| Apple Sign-In | `POST /api/auth/apple` | Sign-in con token de Apple |
| Me | `GET /api/auth/me` | Retorna perfil del usuario autenticado |

**Seguridad Backend:**
- Rate limiting: 10 requests por minuto en endpoints de auth.
- Middleware de recuperacion de panicos, CORS configurable, security headers (X-Frame-Options, CSP, HSTS).

**Vistas por plataforma:**
- **[iOS]**: `LoginView`, `RegisterView`, `ForgotPasswordView`, `ResetPasswordView`
- **[Android]**: `LoginScreen`, `RegisterScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen`
- **[Web]**: `Login`, `Register`, `ForgotPassword`, `ResetPassword`

**Tier:** FREE

---

### 7. Dashboard [Todas]

Pantalla principal con KPIs del negocio, acciones rapidas y alertas de eventos pendientes.

#### Componentes del dashboard

| Componente | Detalle | Plataforma |
|------------|---------|------------|
| KPI Cards | Metricas clave del negocio (ingresos, eventos del mes, tasa de conversion, etc.) | [Todas] |
| Grafica de estados | Distribucion de eventos por status (cotizado, confirmado, completado, cancelado) | [iOS] |
| Eventos pendientes | Modal con eventos confirmados en el pasado que requieren atencion (completar o cancelar) | [Todas] |
| Acciones rapidas | Botones para crear evento, ver calendario, agregar cliente | [Todas] |

**Eventos pendientes:**
El sistema detecta eventos con status `confirmado` cuya fecha ya paso. Estos necesitan ser marcados como `completado` o `cancelado`. Se muestran en un modal/alerta al abrir el dashboard.

- **[iOS]**: `DashboardView`, `KPICardView`, `EventStatusChart`, `PendingEventsModalView`
- **[Android]**: `DashboardScreen`
- **[Web]**: `Dashboard`

**Endpoint:** `GET /api/events/upcoming` — retorna eventos proximos y pendientes.

**Tier:** FREE

---

### 8. Pagos y Finanzas [Todas]

Sistema de registro de pagos parciales y totales para eventos, con multiples metodos de pago y checkout online via Stripe.

#### Campos del pago

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `event_id` | UUID | Evento al que pertenece el pago |
| `amount` | float64 | Monto del pago |
| `payment_date` | DATE | Fecha del pago |
| `payment_method` | string | Metodo (efectivo, transferencia, tarjeta, etc.) |
| `notes` | string | Notas opcionales |

#### Funcionalidades

| Feature | Detalle |
|---------|---------|
| Pagos parciales | Registrar multiples pagos contra un mismo evento |
| Multiples metodos | Efectivo, transferencia, tarjeta, deposito, etc. |
| Historial | Lista de pagos por evento con fechas y montos |
| Balance | Calculo automatico de saldo pendiente (total - pagos) |
| Checkout Stripe | Pago online del cliente via Stripe Checkout Session |

#### Checkout online (Stripe)

- `POST /api/events/{id}/checkout-session` — crea sesion de pago Stripe para el evento.
- `GET /api/events/{id}/payment-session` — maneja el redirect de exito post-pago.
- **[Web]**: `EventPaymentSuccess` — pagina de confirmacion post-pago.

**Endpoints Backend:**
- `GET /api/payments` — listar pagos
- `POST /api/payments` — registrar pago
- `PUT /api/payments/{id}` — actualizar pago
- `DELETE /api/payments/{id}` — eliminar pago

**Tier:** FREE (registro manual) / PRO (checkout Stripe)

---

## P1 — Nice-to-Have (Deseable)

### 9. Generacion de PDFs [Mobile]

Generacion de documentos PDF desde el detalle del evento. Implementado nativamente en iOS y Android (no en Web actualmente — Web usa `pdfGenerator.ts` con libreria JS).

#### Tipos de PDF

| Tipo | Archivo iOS | Archivo Android | Descripcion |
|------|-------------|-----------------|-------------|
| Cotizacion/Factura | `InvoicePDFGenerator.swift` | `InvoicePdfGenerator.kt` | Documento de cotizacion con productos, extras, totales |
| Contrato | `ContractPDFGenerator.swift` | `ContractPdfGenerator.kt` | Contrato con plantilla personalizable del usuario |
| Presupuesto | `BudgetPDFGenerator.swift` | `BudgetPdfGenerator.kt` | Desglose de costos y margenes de ganancia |
| Checklist | `ChecklistPDFGenerator.swift` | `ChecklistPdfGenerator.kt` | Lista de verificacion para el dia del evento |
| Lista de compras | `ShoppingListPDFGenerator.swift` | `ShoppingListPdfGenerator.kt` | Insumos a comprar con cantidades y costos |
| Lista de equipo | `EquipmentListPDFGenerator.swift` | `EquipmentListPdfGenerator.kt` | Equipo a transportar al evento |
| Reporte de pagos | `PaymentReportPDFGenerator.swift` | `PaymentReportPdfGenerator.kt` | Historial de pagos y saldo pendiente |

**Constantes compartidas:** `PDFConstants.swift` / `PdfConstants.kt` — colores, fuentes, margenes estandarizados.

**Personalizacion:** Los PDFs incluyen logo del negocio, nombre comercial y color de marca del usuario cuando estan configurados en `BusinessSettings`.

**[Web]**: `pdfGenerator.ts` genera PDFs usando libreria JavaScript (cotizacion, contrato, presupuesto, reporte de pagos). Soporte para formato inline con `inlineFormatting.ts`.

**Tier:** FREE (cotizacion) / PRO (todos los tipos)

---

### 10. Busqueda Global [Todas]

Busqueda unificada que atraviesa clientes, productos e inventario.

#### Mecanica

- **Endpoint**: `GET /api/search?q={query}` — busca en clientes (nombre, telefono, email), productos (nombre, categoria) e inventario (nombre).
- Rate limited: 30 requests por minuto.
- Retorna resultados agrupados por tipo de entidad.

**Vistas por plataforma:**
- **[iOS]**: `SearchView` + Core Spotlight indexing para busqueda desde el home screen del sistema.
- **[Android]**: `SearchScreen`
- **[Web]**: `SearchPage`

**Tier:** FREE

---

### 11. Cotizacion Rapida (Quick Quote) [iOS] [Android] [Web]

Flujo simplificado para generar una cotizacion sin crear un evento completo. Ideal para dar precios rapidos a clientes potenciales.

- **[iOS]**: `QuickQuoteView` con `QuickQuoteViewModel` — seleccion de productos y calculo rapido de totales.
- **[Web]**: `QuickQuotePage` — formulario simplificado accesible desde `/cotizacion-rapida`.
- **[Android]**: No implementado actualmente.

**Tier:** FREE

---

### 12. Widgets [iOS] [Android]

Widgets para la pantalla de inicio del iPhone/iPad y Android.

#### Widgets disponibles

| Widget | Archivo | Contenido |
|--------|---------|-----------|
| Eventos proximos | `UpcomingEventsWidget.swift` | Lista de proximos eventos con fecha y tipo |
| KPIs | `KPIWidget.swift` | Metricas clave del negocio |
| Interactivo | `InteractiveWidget.swift` | Widget con acciones rapidas (crear evento, ver calendario) |
| Lock Screen | `LockScreenWidget.swift` | Widget circular/rectangular para pantalla de bloqueo |

**Implementacion iOS:** WidgetKit con Timeline Provider. Soporte para interactividad (iOS 17+). Sincronizacion de datos via `WidgetDataSync`.

**Implementacion Android:** Glance (Jetpack Compose) con `QuickActionsWidget` — muestra eventos del dia y botones de accion rapida (nuevo evento, cotizacion rapida, calendario).

**[Web]**: No aplica.

**Tier:** FREE (eventos proximos) / PRO (KPIs, interactivo, lock screen)

---

### 13. Live Activity [iOS]

Dynamic Island y pantalla de bloqueo para seguimiento en tiempo real de eventos activos.

- **ActivityKit** con `SolennixLiveActivityAttributes` para definir datos del evento.
- **Vista**: `SolennixLiveActivityView` con countdown, nombre del evento, tipo de servicio.
- **Dynamic Island**: Vista compacta y expandida.
- Gestionado por `LiveActivityManager` en el paquete SolennixFeatures.

**[Android]**: No implementado. **[Web]**: No aplica.

**Tier:** PRO

---

### 14. Suscripciones y Billing [Todas]

Sistema de suscripciones multi-proveedor con gestion de planes.

#### Planes

| Plan | Descripcion |
|------|-------------|
| `free` | Funcionalidad limitada (limites en clientes, productos, eventos) |
| `basic` | Limites aumentados, PDFs basicos |
| `pro` | Todo ilimitado, todos los PDFs, widgets premium, Live Activity |

#### Proveedores de pago

| Proveedor | Plataforma | Detalle |
|-----------|------------|---------|
| Stripe | [Web] | Checkout Session + Customer Portal |
| RevenueCat SDK | [iOS] | Wraps StoreKit 2, maneja compras y entitlements |
| RevenueCat SDK | [Android] | Wraps Google Play Billing, maneja compras y entitlements |

#### Endpoints Backend

- `GET /api/subscriptions/status` — estado actual de la suscripcion
- `POST /api/subscriptions/checkout-session` — crear sesion Stripe (Web)
- `POST /api/subscriptions/portal-session` — abrir portal de gestion Stripe
- `POST /api/subscriptions/webhook/stripe` — webhook de Stripe (cambios de suscripcion)
- `POST /api/subscriptions/webhook/revenuecat` — webhook de RevenueCat (iOS/Android)
- Debug (admin only): `POST /api/subscriptions/debug-upgrade`, `debug-downgrade`

**Modelo de datos Subscription:** Incluye `provider` (stripe/apple/google), `status` (active/past_due/canceled/trialing), periodos de facturacion.

**Vistas por plataforma:**
- **[iOS]**: `PricingView` (RevenueCat SDK)
- **[Android]**: `PricingScreen`, `SubscriptionScreen`
- **[Web]**: `Pricing` (Stripe)

**Gestion de limites:**
- **[iOS]**: `PlanLimitsManager` — verifica limites del plan actual.
- **[Web]**: `UpgradeBanner` — banner que invita a actualizar cuando se alcanzan limites.

**Tier:** N/A (es el sistema de monetizacion)

---

### 15. Panel de Admin [Web] [Backend]

Dashboard administrativo exclusivo para el equipo de Solennix. Protegido por middleware `AdminOnly`.

#### Funcionalidades

| Feature | Endpoint | Detalle |
|---------|----------|---------|
| Estadisticas generales | `GET /api/admin/stats` | Usuarios totales, suscripciones activas, ingresos |
| Lista de usuarios | `GET /api/admin/users` | Todos los usuarios con su plan y datos |
| Detalle de usuario | `GET /api/admin/users/{id}` | Informacion completa de un usuario |
| Upgrade manual | `PUT /api/admin/users/{id}/upgrade` | Cambiar plan de un usuario |
| Lista de suscripciones | `GET /api/admin/subscriptions` | Todas las suscripciones activas |

**Vistas Web:**
- `AdminDashboard` — estadisticas y metricas del sistema
- `AdminUsers` — gestion de usuarios

**[iOS]**: No implementado. **[Android]**: No implementado.

**Tier:** Solo admin

---

### 16. Onboarding [Mobile]

Flujo de bienvenida para nuevos usuarios en aplicaciones moviles.

- **[iOS]**: `OnboardingView` con `OnboardingPageView` — pantallas de presentacion con propuesta de valor y funcionalidades clave.
- **[Android]**: `OnboardingScreen` — flujo de bienvenida con walkthrough de features.
- **[Web]**: No implementado (el landing page cumple funcion similar).

**Tier:** FREE

---

### 17. Biometric Unlock [Mobile]

Autenticacion biometrica para proteger el acceso a la aplicacion.

- **[iOS]**: `BiometricGateView` — Face ID / Touch ID usando `LocalAuthentication` framework.
- **[Android]**: `BiometricGateScreen` — autenticacion biometrica usando `BiometricPrompt` de AndroidX.
- **[Web]**: No implementado.

**Tier:** FREE

---

### 18. Deep Linking [iOS]

Navegacion profunda a pantallas especificas mediante URL schemes e integracion con Spotlight.

- **URL scheme**: `solennix://` con rutas definidas en `Route.swift` y `DeepLinkHandler.swift`.
- **Core Spotlight**: Indexacion de clientes, productos y eventos para busqueda desde el sistema.
- **Navegacion**: `RouteDestination.swift` mapea rutas a vistas especificas.

**[Android]**: No implementado. **[Web]**: Rutas React Router (navegacion interna).

**Tier:** FREE

---

### 19. Configuracion de Negocio [Todas]

Personalizacion del perfil comercial del organizador de eventos.

#### Campos configurables

| Campo | Descripcion | Usado en |
|-------|-------------|----------|
| `business_name` | Nombre comercial | PDFs, facturas |
| `logo_url` | Logo del negocio | PDFs, perfil |
| `brand_color` | Color de marca | PDFs |
| `show_business_name_in_pdf` | Mostrar nombre comercial en PDFs | PDFs |
| `default_deposit_percent` | % de deposito por defecto | Eventos nuevos |
| `default_cancellation_days` | Dias de anticipacion para cancelacion | Eventos nuevos |
| `default_refund_percent` | % de reembolso por defecto | Eventos nuevos |
| `contract_template` | Plantilla de contrato personalizable | PDF de contrato |

**Endpoint:** `PUT /api/users/me` — actualiza todos los campos del perfil del usuario.

**Vistas por plataforma:**
- **[iOS]**: `BusinessSettingsView`, `ContractDefaultsView`, `EditProfileView`, `ChangePasswordView`
- **[Android]**: `BusinessSettingsScreen`, `ContractDefaultsScreen`, `EditProfileScreen`, `ChangePasswordScreen`
- **[Web]**: `Settings`

**Tier:** FREE (basico) / PRO (logo, color de marca, plantilla de contrato)

---

### 20. Registro de Dispositivos (Push Notifications) [Backend]

Infraestructura backend para notificaciones push.

- `POST /api/devices/register` — registra token de dispositivo (iOS/Android/Web).
- `POST /api/devices/unregister` — elimina registro.
- Modelo `DeviceToken`: almacena `token`, `platform` (ios/android/web).

**Nota:** La infraestructura de backend esta implementada. El envio activo de notificaciones push esta pendiente.

**Tier:** FREE

---

### 21. Subida de Imagenes [Todas]

Sistema de upload de imagenes para fotos de eventos, productos y logos de negocio.

- **Endpoint**: `POST /api/uploads/image` — sube imagen, retorna URL.
- **Servicio de archivos**: `GET /api/uploads/*` — sirve archivos estaticos con cache de 1 ano.
- Rate limited: 5 uploads por minuto.
- Las imagenes se almacenan en el directorio configurado del servidor.

**Tier:** FREE

---

## P2 — Futuro

### Funcionalidades planificadas

| Feature | Descripcion | Prioridad |
|---------|-------------|-----------|
| Reportes financieros avanzados | Graficas de ingresos, margenes, comparativas mensuales/anuales | Alta |
| Integracion WhatsApp | Envio de cotizaciones y contratos directamente por WhatsApp | Alta |
| Export CSV/Excel | Exportar listas de clientes, eventos, pagos a formatos tabulares | Media |
| Multi-idioma | Agregar ingles y portugues a la interfaz (actualmente solo espanol) | Media |
| Offline mode completo | Sincronizacion offline-first en movil con cola de cambios | Media |
| Notificaciones push activas | Recordatorios de eventos, alertas de pagos pendientes, actualizaciones | Media |
| Integracion calendario del sistema | Sincronizar eventos de Solennix con Apple Calendar / Google Calendar | Media |
| Soundscapes / ambientacion | Sugerencias de musica y ambientacion para tipos de evento | Baja |
| Templates de eventos reutilizables | Guardar configuraciones de evento como plantillas para reusar | Alta |
| ~~Cotizacion Rapida en Android~~ | ✅ Implementado: QuickQuoteScreen + QuickQuoteViewModel + QuickQuotePdfGenerator | ✅ |
| ~~Widgets en Android~~ | ✅ Implementado: QuickActionsWidget (Glance) con eventos del dia + acciones rapidas | ✅ |
| Deep Linking en Android | URL schemes y navegacion profunda equivalente a iOS | Baja |
| Live Activity equivalente Android | Notificacion persistente de evento activo | Baja |

---

## Tabla de Paridad Cross-Platform

### Leyenda

| Simbolo | Significado |
|---------|-------------|
| ✅ | Implementado |
| 🔄 | En progreso |
| ⬜ | Pendiente |
| ➖ | No aplica |

### Eventos

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| Formulario multi-paso | ✅ | ✅ | ✅ | ✅ | iOS: 5 steps SwiftUI, Android: Compose, Web: componentes separados |
| Status tracking | ✅ | ✅ | ✅ | ✅ | cotizado/confirmado/completado/cancelado |
| Descuento global (% y fijo) | ✅ | ✅ | ✅ | ✅ | |
| IVA configurable | ✅ | ✅ | ✅ | ✅ | |
| Galeria de fotos | ✅ | ✅ | ✅ | ✅ | |
| Deteccion conflictos equipo | ✅ | ✅ | ✅ | ✅ | GET (mobile) + POST (web) |
| Sugerencias de equipo | ✅ | ✅ | ✅ | ✅ | |
| Sugerencias de insumos | ✅ | ✅ | ✅ | ✅ | |
| Extras (cargos adicionales) | ✅ | ✅ | ✅ | ✅ | |
| Deposito y cancelacion | ✅ | ✅ | ✅ | ✅ | |
| Lista de eventos | ✅ | ✅ | ➖ | ✅ | Web usa calendario como vista principal |
| Detalle de evento | ✅ | ✅ | ✅ | ✅ | Web: EventSummary |
| Checklist del evento | ✅ | ✅ | ⬜ | ➖ | Generado localmente en mobile |

### Clientes

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| CRUD completo | ✅ | ✅ | ✅ | ✅ | |
| Busqueda | ✅ | ✅ | ✅ | ✅ | |
| Detalle con historial | ✅ | ✅ | ✅ | ✅ | total_events + total_spent |
| Quick Client desde evento | ✅ | ✅ | ✅ | ✅ | Sheet/Modal |

### Productos

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| CRUD completo | ✅ | ✅ | ✅ | ✅ | |
| Precio base y categoria | ✅ | ✅ | ✅ | ✅ | |
| Recetas con ingredientes | ✅ | ✅ | ✅ | ✅ | 3 tipos: insumos, equipo, insumos por evento |
| Imagen de producto | ✅ | ✅ | ✅ | ✅ | |
| Busqueda y filtros | ✅ | ✅ | ✅ | ✅ | Por nombre, categoria, ordenamiento |
| KPIs en detalle | ✅ | ✅ | ✅ | ➖ | Precio, costo/unidad, margen %, prox. eventos |
| Alerta inteligente | ✅ | ✅ | ✅ | ➖ | Demanda 7 dias, ingreso estimado |
| Tablas de composicion | ✅ | ✅ | ✅ | ➖ | Insumos, equipo, insumos por evento con costos |
| Demanda por fecha | ✅ | ✅ | ✅ | ➖ | Urgencia, badges, revenue por evento |

### Inventario

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| CRUD completo | ✅ | ✅ | ✅ | ✅ | |
| Tipos (equipo/insumo/consumible) | ✅ | ✅ | ✅ | ✅ | |
| Stock tracking | ✅ | ✅ | ✅ | ✅ | current_stock + minimum_stock |
| Costo unitario en lista | ✅ | ✅ | ✅ | ✅ | |
| Ajuste rapido de stock | ✅ | ✅ | ✅ | ✅ | Desde lista y detalle |
| KPIs en detalle | ✅ | ✅ | ✅ | ➖ | Stock, minimo, costo, valor total |
| Alerta 7 dias | ✅ | ✅ | ✅ | ➖ | Critico/warning/ok segun demanda |
| Barras de salud de stock | ✅ | ✅ | ✅ | ➖ | Stock actual, minimo, demanda 7 dias |
| Demanda por fecha | ✅ | ✅ | ✅ | ➖ | Con badges de urgencia (Hoy, Manana, en X dias) |
| Ordenamiento multiple | ✅ | ✅ | ✅ | ➖ | Nombre, stock, minimo, costo |
| Low stock: `<` estricto | ✅ | ✅ | ✅ | ➖ | Solo alerta si currentStock < minimumStock Y minimumStock > 0 |

### Calendario

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| Vista mensual | ✅ | ✅ | ✅ | ✅ | |
| Navegacion por mes | ✅ | ✅ | ✅ | ➖ | |
| Fechas no disponibles | ✅ | ✅ | ✅ | ✅ | blackout dates |
| Indicadores de eventos | ✅ | ✅ | ✅ | ➖ | |

### Auth

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| Email + Password | ✅ | ✅ | ✅ | ✅ | |
| Google Sign-In | ✅ | ✅ | ✅ | ✅ | |
| Apple Sign-In | ✅ | ✅ | ✅ | ✅ | WebView OAuth flow en Android, Apple JS SDK en Web |
| Refresh tokens | ✅ | ✅ | ✅ | ✅ | |
| Forgot / Reset Password | ✅ | ✅ | ✅ | ✅ | |
| Change Password | ✅ | ✅ | ✅ | ✅ | |
| Biometric Unlock | ✅ | ✅ | ➖ | ➖ | Face ID / BiometricPrompt |

### Dashboard

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| KPI Cards | ✅ | ✅ | ✅ | ✅ | |
| Eventos pendientes | ✅ | ✅ | ✅ | ✅ | PendingEventsModal |
| Grafica de estados | ✅ | ⬜ | ⬜ | ➖ | EventStatusChart solo en iOS |
| Acciones rapidas | ✅ | ✅ | ✅ | ➖ | |

### Pagos

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| CRUD de pagos | ✅ | ✅ | ✅ | ✅ | |
| Pagos parciales | ✅ | ✅ | ✅ | ✅ | |
| Multiples metodos | ✅ | ✅ | ✅ | ✅ | |
| Checkout Stripe | ➖ | ➖ | ✅ | ✅ | Solo Web (redirige a Stripe) |
| Balance pendiente | ✅ | ✅ | ✅ | ✅ | |

### PDFs

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| Cotizacion/Factura | ✅ | ✅ | ✅ | ➖ | Generado en cliente |
| Contrato | ✅ | ✅ | ✅ | ➖ | Con plantilla personalizable |
| Presupuesto | ✅ | ✅ | ✅ | ➖ | |
| Checklist | ✅ | ✅ | ⬜ | ➖ | |
| Lista de compras | ✅ | ✅ | ⬜ | ➖ | |
| Lista de equipo | ✅ | ✅ | ⬜ | ➖ | |
| Reporte de pagos | ✅ | ✅ | ✅ | ➖ | |

### Busqueda

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| Busqueda global | ✅ | ✅ | ✅ | ✅ | Clientes + Productos + Inventario |
| Core Spotlight | ✅ | ➖ | ➖ | ➖ | Indexacion para busqueda del sistema |

### Widgets / Live Activity

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| Widget eventos proximos | ✅ | ✅ | ➖ | ➖ | WidgetKit / Glance |
| Widget KPIs | ✅ | ⬜ | ➖ | ➖ | WidgetKit (iOS only) |
| Widget interactivo | ✅ | ✅ | ➖ | ➖ | WidgetKit iOS 17+ / Glance QuickActionsWidget |
| Widget Lock Screen | ✅ | ⬜ | ➖ | ➖ | WidgetKit (iOS only) |
| Live Activity / Dynamic Island | ✅ | ⬜ | ➖ | ➖ | ActivityKit |

### Suscripciones

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| StoreKit 2 (IAP) | ✅ | ➖ | ➖ | ✅ | Via RevenueCat |
| Google Play Billing | ➖ | ✅ | ➖ | ✅ | Via RevenueCat |
| Stripe Checkout | ➖ | ➖ | ✅ | ✅ | Web only |
| Stripe Customer Portal | ➖ | ➖ | ✅ | ✅ | Gestion de suscripcion |
| RevenueCat Webhooks | ➖ | ➖ | ➖ | ✅ | Sincroniza estado mobile -> backend |
| Plan limits management | ✅ | ✅ | ✅ | ✅ | PlanLimitsManager / UpgradeBanner |
| Pricing view | ✅ | ✅ | ✅ | ➖ | |

### Admin

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| Dashboard estadistico | ➖ | ➖ | ✅ | ✅ | Solo Web + Backend |
| Gestion de usuarios | ➖ | ➖ | ✅ | ✅ | Lista, detalle, upgrade |
| Debug upgrade/downgrade | ➖ | ➖ | ✅ | ✅ | Solo en entorno de desarrollo |

### Configuracion

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| Editar perfil | ✅ | ✅ | ✅ | ✅ | |
| Cambiar contrasena | ✅ | ✅ | ✅ | ✅ | |
| Datos del negocio | ✅ | ✅ | ✅ | ✅ | Logo, nombre, color |
| Plantilla de contrato | ✅ | ✅ | ✅ | ✅ | |
| Defaults de deposito/cancelacion | ✅ | ✅ | ✅ | ✅ | |

### Otros

| Feature | iOS | Android | Web | Backend | Notas |
|---------|-----|---------|-----|---------|-------|
| Cotizacion Rapida | ✅ | ✅ | ✅ | ➖ | Quick Quote sin crear evento completo |
| Onboarding | ✅ | ✅ | ⬜ | ➖ | Landing page sustituye en Web |
| Deep Linking | ✅ | ⬜ | ➖ | ➖ | URL scheme solennix:// |
| Push Notifications (registro) | ✅ | ✅ | ✅ | ✅ | Registro de tokens implementado |
| Push Notifications (envio) | ⬜ | ⬜ | ⬜ | ⬜ | Infraestructura lista, envio pendiente |
| About / Privacy / Terms | ✅ | ✅ | ✅ | ➖ | Paginas legales |
