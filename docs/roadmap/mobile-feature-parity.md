# Roadmap: Paridad de Funcionalidades Mobile vs Web

> **Fecha:** 2026-02-28
> **Objetivo:** Llevar la app m&#xF3;vil al mismo nivel funcional que la app web.
> **Metodolog&#xED;a:** Fases incrementales ordenadas por impacto y dependencias.

---

## Resumen Ejecutivo

La app web tiene ~20 funcionalidades completas. La app m&#xF3;vil ahora cubre la gran mayor&#xED;a de funcionalidades. Este roadmap refleja el estado actual y las tareas pendientes restantes.

### Estado Actual Mobile (Completado)
- Auth: Login, Register, ForgotPassword, ResetPassword (deep link)
- Clientes: CRUD completo + detalle con historial
- Eventos: Formulario 4 pasos + detalle + pagos completos + status + auto-confirm
- Productos: CRUD + ingredientes
- Inventario: CRUD + alertas stock bajo
- Calendario: Vista mes + lista de eventos
- B&#xFA;squeda: Global multi-entidad
- Dashboard: 5 KPIs + gr&#xE1;fica estado + alertas stock + pr&#xF3;ximos eventos + onboarding + quick actions + pending events modal
- Settings: Editar perfil, config negocio (logo, color, raz&#xF3;n social), contrato defaults, suscripci&#xF3;n, about
- PDFs: 5 tipos (cotizaci&#xF3;n, contrato, lista de compras, reporte pagos, factura) via expo-print
- Suscripci&#xF3;n: RevenueCat integrado + upgrade flow + restore purchases
- Producci&#xF3;n: ErrorBoundary, splash screen, Sentry crash reporting, global error handlers, env config
- Review: App Store review prompt (after 3 PDFs or 5 events)

---

## Roadmap Visual

```
FASE 1 ─── Settings Funcional ──────────────────── [COMPLETADA]
  &#x2502;         (perfil, negocio, logo, color, contrato defaults)
  &#x2502;
FASE 2 ─── Pagos Mejorados + Dashboard ─────────── [COMPLETADA]
  &#x2502;         (progress bar, notas, eliminar pago,
  &#x2502;          onboarding, quick actions, pending modal)
  &#x2502;
FASE 3 ─── Generaci&#xF3;n de PDFs ──────────────────── [COMPLETADA]
  &#x2502;         (cotizaci&#xF3;n, contrato, lista compras,
  &#x2502;          reporte pagos, factura)
  &#x2502;
FASE 4 ─── Suscripci&#xF3;n / Monetizaci&#xF3;n ─────────── [COMPLETADA]
  &#x2502;         (RevenueCat, upgrade flow, portal)
  &#x2502;
FASE 5 ─── Pulido y Extras ────────────────────── [MAYORMENTE COMPLETADA]
            &#x2713; reset password con deep link
            &#x2713; links funcionales en About + versi&#xF3;n din&#xE1;mica
            &#x25CB; gr&#xE1;fica financiera comparativa (pendiente)
            &#x25CB; KPI cobrado aplicado a eventos del mes (pendiente)
            &#x25CB; notificaciones push - infraestructura base (pendiente)
```

---

## FASE 1: Settings Funcional &#x2705; COMPLETADA

Todas las tareas 1.1-1.6 implementadas:
- [x] EditProfileScreen
- [x] BusinessSettingsScreen (raz&#xF3;n social, color de marca, logo)
- [x] ContractDefaultsScreen
- [x] SettingsScreen reestructurado con navegaci&#xF3;n completa

---

## FASE 2: Pagos Mejorados + Dashboard Widgets &#x2705; COMPLETADA

Todas las tareas 2.1-2.7 implementadas:
- [x] Progress bar de pagos en EventDetail
- [x] Campo de notas en modal de pago
- [x] Eliminar pagos con confirmaci&#xF3;n
- [x] Auto-confirmaci&#xF3;n de evento al pagar
- [x] Onboarding checklist en Dashboard
- [x] Botones de acci&#xF3;n r&#xE1;pida en Dashboard
- [x] PendingEventsModal en Dashboard

---

## FASE 3: Generaci&#xF3;n de PDFs &#x2705; COMPLETADA

Todas las tareas 3.1-3.7 implementadas:
- [x] Infraestructura PDF (expo-print + expo-sharing)
- [x] Template de cotizaci&#xF3;n/presupuesto
- [x] Template de contrato
- [x] Template de lista de compras
- [x] Template de reporte de pagos
- [x] Template de factura
- [x] Conectados en EventDetailScreen

---

## FASE 4: Suscripci&#xF3;n / Monetizaci&#xF3;n &#x2705; COMPLETADA

Todas las tareas 4.1-4.4 implementadas:
- [x] RevenueCat SDK integrado (con fallback debug en dev, protegido en prod)
- [x] Pantalla de upgrade funcional
- [x] Webhook backend verificado
- [x] Gesti&#xF3;n de suscripci&#xF3;n activa

---

## FASE 5: Pulido y Extras (Parcialmente Completada)

### Completadas:
- [x] Tarea 5.1: Reset password con deep link (`solennix://reset-password?token=xxx`)
- [x] Tarea 5.4: Links funcionales en AboutScreen + versi&#xF3;n din&#xE1;mica desde expo-constants

### Pendientes:
- [ ] Tarea 5.2: Gr&#xE1;fica financiera comparativa en Dashboard
- [ ] Tarea 5.3: KPI "Cobrado Aplicado a Eventos del Mes"
- [ ] Tarea 5.5: Notificaciones Push (infraestructura base)

---

## Funcionalidades de Producci&#xF3;n (Extras al Roadmap Original)

Se implementaron funcionalidades de producci&#xF3;n no previstas en el roadmap original:

- [x] `app.config.ts` para configuraci&#xF3;n din&#xE1;mica (bundleIdentifier, package, scheme)
- [x] Archivos `.env` y `.env.production` para gesti&#xF3;n de entornos
- [x] ErrorBoundary component con UI de recovery
- [x] Splash screen gestionado con expo-splash-screen (sin flash blanco)
- [x] Global error handlers (unhandled JS errors + promise rejections)
- [x] Sentry crash reporting (skip silencioso si no hay DSN)
- [x] App Store review prompt (3 PDFs compartidos o 5 eventos creados)
- [x] Protecci&#xF3;n de endpoints debug de RevenueCat en producci&#xF3;n

---

## Resumen de Dependencias entre Fases

```
Fase 1 (Settings) &#x2713; ─────────────────→ Fase 3 (PDFs) &#x2713;
         &#x2502;                                    &#x2502;
         └── Fase 2 (Pagos/Dashboard) &#x2713;         &#x2502;
                                              &#x2502;
                              Fase 4 (Suscripci&#xF3;n) &#x2713;
                                              &#x2502;
                              Fase 5 (Pulido) ~85%
```

---

## Criterios de Completitud por Fase

### Fase 1 &#x2705; Completa
### Fase 2 &#x2705; Completa
### Fase 3 &#x2705; Completa
### Fase 4 &#x2705; Completa

### Fase 5 ~85% Completa cuando:
- [x] Reset password funciona via deep link desde email
- [ ] Dashboard muestra gr&#xE1;fica financiera comparativa
- [ ] KPI de cobrado muestra distinci&#xF3;n por fecha de evento
- [x] Links en About son funcionales (web, email)
- [ ] Infraestructura de push notifications registra tokens
