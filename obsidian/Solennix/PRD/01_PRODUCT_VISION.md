---
tags:
  - prd
  - vision
  - solennix
aliases:
  - Visión del Producto
  - Product Vision
date: 2026-03-20
updated: 2026-04-04
status: active
---

# Visión del Producto

> [!quote] Solennix es el centro de comando para organizadores de eventos.
> Una plataforma donde cotizás en segundos, gestionás tu catálogo con costos reales, controlás tu inventario, rastreás cada pago, y generás documentos profesionales — todo desde tu iPhone, Android o navegador web, con los datos siempre sincronizados.

El nombre "Solennix" evoca solemnidad y celebración — profesional pero festivo, memorable y único en un mercado lleno de nombres genéricos.

---

## Problema

Los organizadores de eventos en Latinoamérica — banqueteros, decoradores, wedding planners, coordinadores de fiestas infantiles — pierden **3+ horas diarias** gestionando su negocio con herramientas fragmentadas:

| Herramienta           | Uso actual                                 | Dolor                                    |
| --------------------- | ------------------------------------------ | ---------------------------------------- |
| **WhatsApp**          | Cotizaciones, confirmaciones, coordinación | Conversaciones se pierden, sin historial |
| **Excel / Sheets**    | Finanzas, costos, pagos parciales          | Errores de fórmula, sin automatización   |
| **Libretas de papel** | Inventario de equipo y suministros         | No buscable, se pierde, sin respaldo     |
| **Google Calendar**   | Agendar fechas, recordatorios              | Sin contexto del evento                  |
| **Word / Canva**      | Cotizaciones, contratos, listas de compras | Manual, lento, no profesional            |
| **Calculadora**       | IVA, descuentos, márgenes                  | Errores constantes                       |

> [!danger] El resultado
> Errores de cotización, doble-reservación de fechas, equipo prometido a dos eventos el mismo día, pagos perdidos, y clientes frustrados.

### El hueco del mercado

**Ninguna herramienta ofrece todo esto junto para LATAM:**

1. Flujo específico para eventos: cotizar → confirmar → ejecutar → pagar → cerrar
2. Catálogo de productos con recetas e ingredientes
3. Inventario inteligente de equipo + insumos con control de disponibilidad
4. IVA/impuestos configurables adaptados a LATAM
5. App nativa multi-plataforma (iOS + Android + Web)
6. Español como idioma nativo (no traducción)

Cada competidor cubre 1-2. **Solennix cubre los 6.** Ver [[03_COMPETITIVE_ANALYSIS|análisis competitivo]] para detalle.

---

## Disponibilidad

| Plataforma                 | Stack                           | Estado          | Detalle                               |
| -------------------------- | ------------------------------- | --------------- | ------------------------------------- |
| **iOS (iPhone/iPad)**      | SwiftUI + MVVM + SPM            | 🔄 Desarrollo   | [[05_TECHNICAL_ARCHITECTURE_IOS]]     |
| **Android (Phone/Tablet)** | Kotlin + Compose + Multi-module | 🔄 Desarrollo   | [[06_TECHNICAL_ARCHITECTURE_ANDROID]] |
| **Web**                    | React 19 + TypeScript + Vite    | ✅ Funcional    | [[08_TECHNICAL_ARCHITECTURE_WEB]]     |
| **Backend**                | Go (Chi) + PostgreSQL + Stripe  | ✅ Funcional    | [[07_TECHNICAL_ARCHITECTURE_BACKEND]] |
| **Widgets iOS**            | WidgetKit + Live Activity       | ✅ Implementado | 4 widgets + Dynamic Island            |
| **Widgets Android**        | Glance (Jetpack Compose)        | ✅ Implementado | Widget básico                         |

---

## Objetivos

| #      | Objetivo                                    | Métrica                                                                   |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------- |
| **G1** | Ser LA app de gestión de eventos para LATAM | App Store ≥ 4.7 · Play Store ≥ 4.5 · Top 10 Negocios en MX/CO en 12 meses |
| **G2** | Eliminar la fragmentación de herramientas   | ≥ 80% MAU usan 3+ módulos semanalmente                                    |
| **G3** | Reducir cotización de 30 min a 3 min        | Creación de evento < 5 min · Cotización rápida ≥ 40%                      |
| **G4** | Conversión premium por valor innegable      | Conversión ≥ 10% · ARPU ≥ $4 USD/mes · Churn < 5%                         |
| **G5** | Cero pérdidas por errores administrativos   | ≥ 95% eventos con pagos · Detección conflictos 100%                       |
| **G6** | Paridad cross-platform                      | 100% features P0 simultáneas · Bugs verificados en todas                  |
| **G7** | Documentos profesionales en un tap          | ≥ 70% eventos generan PDF · Generación < 3s                               |

---

## No-Objetivos

> [!warning] Fuera del scope
> Estas decisiones son INTENCIONALES — no son features pendientes.

| #   | No-Objetivo                        | Razón                                                     |
| --- | ---------------------------------- | --------------------------------------------------------- |
| NG1 | Sin marketplace de servicios       | Solennix gestiona, no conecta clientes con organizadores  |
| NG2 | Sin generación de contenido por IA | El conocimiento del negocio es del organizador            |
| NG3 | Sin CRM B2B ni gestión de equipos  | Target: independientes y negocios pequeños (1-5 personas) |
| NG4 | Sin gestión de venue/salón         | Ubicación es campo de texto, no entidad gestionada        |
| NG5 | Sin project management genérico    | Optimizado para ciclo de vida de eventos, no Kanban       |
| NG6 | Sin integración con redes sociales | Las redes son marketing del organizador, fuera del scope  |

---

## Usuarios Objetivo

### P0 — Core (Lanzamiento)

| Segmento                                | Descripción                                                               | Plataformas         |
| --------------------------------------- | ------------------------------------------------------------------------- | ------------------- |
| **Banqueteros / Catering**              | Menús con ingredientes, costos por persona, inventario de cocina          | iOS · Android · Web |
| **Decoradores de eventos**              | Catálogo de servicios, inventario de materiales, múltiples eventos/semana | iOS · Android · Web |
| **Wedding planners**                    | Alto valor, pagos parciales, contratos formales, checklists               | iOS · Android · Web |
| **Organizadores de fiestas infantiles** | Alto volumen, paquetes predefinidos, equipo reutilizable                  | iOS · Android       |

### P1 — Expansión

| Segmento                       | Descripción                                      |
| ------------------------------ | ------------------------------------------------ |
| **Coordinadores corporativos** | Conferencias, team buildings, facturación formal |
| **Floristerías y pastelerías** | Producto + servicio, recetas con costeo          |
| **Organizadores de XV años**   | Alta demanda estacional, paquetes complejos      |

### P2 — Futuro

| Segmento                              | Descripción                                 |
| ------------------------------------- | ------------------------------------------- |
| **Agencias medianas (5-15 personas)** | Roles, permisos, vista de equipo            |
| **Organizadores en Brasil**           | Localización a portugués, adaptación fiscal |

---

## Tipos de Evento Soportados

| Tipo                        | Catálogo | Inventario | Insumos | Pagos parciales | Contrato | Fotos |
| --------------------------- | :------: | :--------: | :-----: | :-------------: | :------: | :---: |
| Fiestas infantiles          |    ✅    |     ✅     |   ✅    |       ✅        | Opcional |  ✅   |
| Bodas                       |    ✅    |     ✅     |   ✅    |       ✅        |    ✅    |  ✅   |
| XV años / Quinceañeras      |    ✅    |     ✅     |   ✅    |       ✅        |    ✅    |  ✅   |
| Eventos corporativos        |    ✅    |     ✅     |   ✅    |       ✅        |    ✅    |  ✅   |
| Baby showers                |    ✅    |     ✅     |   ✅    |       ✅        | Opcional |  ✅   |
| Bautizos / Primera comunión |    ✅    |     ✅     |   ✅    |       ✅        | Opcional |  ✅   |
| Banquetes / Catering        |    ✅    |     ✅     |   ✅    |       ✅        |    ✅    |  ✅   |
| Eventos sociales genéricos  |    ✅    |     ✅     |   ✅    |       ✅        | Opcional |  ✅   |

> [!note] `service_type` es texto libre
> El organizador define cualquier tipo de evento. La tabla muestra los más comunes.

---

## Historias de Usuario

### Gestión de Eventos

| ID   | Historia                                                                      | Plataforma |
| ---- | ----------------------------------------------------------------------------- | ---------- |
| US-1 | Crear evento en formulario guiado por pasos para no olvidar ningún detalle    | Todas      |
| US-2 | Seleccionar productos del catálogo con cálculo automático de IVA y descuentos | Todas      |
| US-3 | Cambiar estado del evento (cotizado → confirmado → completado → cancelado)    | Todas      |
| US-4 | Ver conflictos de equipo al asignar mobiliario                                | Todas      |
| US-5 | Recibir sugerencias automáticas de equipo y suministros                       | Todas      |
| US-6 | Subir fotos al evento como portafolio visual                                  | Todas      |
| US-7 | Aplicar descuentos (% o fijo) sin recalcular manualmente                      | Todas      |

### Gestión de Clientes

| ID    | Historia                                               | Plataforma |
| ----- | ------------------------------------------------------ | ---------- |
| US-8  | Registrar clientes con datos de contacto centralizados | Todas      |
| US-9  | Ver historial y gasto total por cliente                | Todas      |
| US-10 | Buscar clientes por nombre o teléfono rápidamente      | Todas      |

### Finanzas y Pagos

| ID    | Historia                                           | Plataforma |
| ----- | -------------------------------------------------- | ---------- |
| US-11 | Registrar pagos parciales con diferentes métodos   | Todas      |
| US-12 | Generar PDF de cotización con branding del negocio | Todas      |
| US-13 | Generar contrato PDF con términos configurables    | Todas      |
| US-14 | Ver reporte de pagos por evento                    | Todas      |

### Catálogo y Inventario

| ID    | Historia                                                                                  | Plataforma |
| ----- | ----------------------------------------------------------------------------------------- | ---------- |
| US-16 | Crear productos con precio base, costo y categoría                                        | Todas      |
| US-17 | Agregar recetas con ingredientes para calcular costo real                                 | Todas      |
| US-18 | Vincular ingredientes del inventario a recetas                                            | Todas      |
| US-19 | Registrar equipo con stock actual y mínimo                                                | Todas      |
| US-20 | Diferenciar equipo reutilizable de insumos consumibles                                    | Todas      |
| US-21 | Ver alertas de stock bajo (solo si `minimum_stock > 0` y `current_stock < minimum_stock`) | Todas      |

### Calendario y Productividad

| ID    | Historia                                       | Plataforma    |
| ----- | ---------------------------------------------- | ------------- |
| US-22 | Calendario mensual con indicadores de estado   | Todas         |
| US-23 | Bloquear fechas no disponibles                 | Todas         |
| US-24 | Ver eventos pendientes en dashboard            | Todas         |
| US-25 | Widget de próximo evento en pantalla de inicio | iOS           |
| US-26 | Live Activity en Dynamic Island                | iOS           |
| US-27 | Buscar desde Spotlight                         | iOS           |
| US-28 | Autenticación biométrica                       | iOS · Android |
| US-29 | Panel admin con estadísticas                   | Web           |

---

## Principio de Paridad Cross-Platform

> [!danger] Regla OBLIGATORIA
> Cada feature core construida en una plataforma DEBE ser construida en las demás. Cada bug corregido DEBE ser verificado y corregido en las otras.

### Matriz de Paridad

| Cambio en...  | Debe verificarse en...                   |
| ------------- | ---------------------------------------- |
| iOS           | Android · Web                            |
| Android       | iOS · Web                                |
| Web           | iOS · Android                            |
| Backend (API) | Los 3 clientes lo consumen correctamente |

### Implementación por Plataforma

| Aspecto           | iOS                      | Android                          | Web              |
| ----------------- | ------------------------ | -------------------------------- | ---------------- |
| **Lenguaje**      | Swift                    | Kotlin                           | TypeScript       |
| **UI**            | SwiftUI                  | Jetpack Compose                  | React            |
| **Arquitectura**  | MVVM + SPM               | Multi-module + MVVM              | Context + Hooks  |
| **Red**           | URLSession / async-await | Ktor Client                      | Fetch API        |
| **Auth**          | Keychain + Biometric     | EncryptedSharedPrefs + Biometric | httpOnly cookies |
| **Pagos**         | StoreKit 2 / RevenueCat  | RevenueCat + Play Billing        | Stripe Checkout  |
| **Push**          | APNs                     | FCM                              | —                |
| **Widgets**       | WidgetKit                | Glance                           | —                |
| **Live Activity** | ActivityKit              | —                                | —                |
| **Spotlight**     | Core Spotlight           | —                                | —                |
| **PDF**           | Nativa (7 tipos)         | Nativa (8 tipos)                 | jsPDF (cliente)  |

### Excepciones Aceptables

> [!note] Solo diferencias impuestas por la plataforma

| Feature            | iOS | Android | Web | Razón                 |
| ------------------ | :-: | :-----: | :-: | --------------------- |
| Widgets            | ✅  |   ✅    |  —  | No aplica en browsers |
| Live Activity      | ✅  |    —    |  —  | API exclusiva iOS     |
| Biometric          | ✅  |   ✅    |  —  | No aplica en web      |
| Core Spotlight     | ✅  |    —    |  —  | API exclusiva iOS     |
| Panel admin        |  —  |    —    | ✅  | Herramienta interna   |
| Push notifications | ✅  |   ✅    |  —  | Futuro para web       |

---

> [!tip] Documentos relacionados
>
> - [[02_FEATURES|Catálogo de Features]] — tabla de paridad detallada
> - [[03_COMPETITIVE_ANALYSIS|Análisis Competitivo]] — posicionamiento de mercado
> - [[04_MONETIZATION|Monetización]] — modelo de negocio
> - [[11_CURRENT_STATUS|Estado Actual]] — qué está implementado hoy

#prd #vision #solennix
