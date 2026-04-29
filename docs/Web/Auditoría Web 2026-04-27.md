---
tags:
  - web
  - auditoria
  - paridad
  - ux
  - solennix
date: 2026-04-27
status: active
---

# Auditoría Web — 2026-04-27

> [!abstract] Resultado
> La app web está **funcionalmente fuerte** y cubre la mayoría del backend productivo: auth, CRUD core, eventos, pagos, dashboard, staff, equipos, formularios públicos, portal cliente, admin, suscripciones, búsqueda y PWA. La deuda principal no es de estructura: está en **contrato OpenAPI incompleto**, **paridad analítica desaprovechada**, **hooks inconsistentes en 2 flujos nuevos** y **narrativa comercial del landing**. Para que la experiencia se sienta impecable, la web debe dejar de parecer “un CRM de eventos” y mostrar con más fuerza el poder real de Solennix: operación, cobro, inventario, personal, portal cliente y formularios públicos en un solo flujo.

---

## 1. Alcance

La auditoría contrastó estas superficies contra el código real:

- Routing web (`web/src/App.tsx`)
- API client y contrato HTTP (`web/src/lib/api.ts`)
- Capa de servicios (`web/src/services/*`)
- Hooks de React Query (`web/src/hooks/queries/*`)
- Dashboard (`web/src/pages/Dashboard.tsx`, `dashboardService.ts`, `activityService.ts`)
- Flujos públicos (`PublicEventFormPage.tsx`, `ClientPortalPage.tsx`)
- Landing pública (`web/src/pages/Landing.tsx`)
- Contrato generado (`web/src/types/api.ts`) y spec backend (`backend/docs/openapi.yaml`)
- Documentación Web y PRD (`docs/Web/*`, `docs/PRD/*`)

---

## 2. Métricas verificadas

| Métrica | Valor auditado | Fuente |
| --- | ---: | --- |
| Rutas declaradas en SPA | **46** | `rg '<Route path=' web/src/App.tsx` |
| Servicios web no-test | **15** | `rg --files web/src/services` excluyendo `.test.ts` |
| Archivos de hooks no-test | **20** | `web/src/hooks/**/*.ts` excluyendo tests |
| Tests unit/component en `web/src` | **95** | `web/src/**/*.{test,spec}.{ts,tsx}` |
| Tests e2e/integration en `web/tests` | **6** | `web/tests/**/*.{test,spec}.{ts,tsx}` |
| Rutas públicas sin auth | **11** | `App.tsx` antes de `ProtectedRoute` |
| Rutas públicas de negocio | **2** | `/form/:token`, `/client/:token` |
| Endpoints dashboard backend | **7** | `backend/internal/router/router.go` |
| Endpoints dashboard consumidos por web | **4** | `dashboardService.ts` + `activityService.ts` |

---

## 3. Lo que sí hace hoy la web

### Núcleo operativo

- Auth con login, registro, reset password, refresh por cookie httpOnly, logout, perfil y cambio de contraseña.
- Google Sign-In y Apple Sign-In conectados al backend.
- CRUD completo de clientes, eventos, productos, inventario, pagos y personal.
- Staff completo: catálogo, disponibilidad, equipos y expansión de equipos en eventos.
- Event Form Links: UI protegida para crear/listar/revocar formularios públicos.
- Formulario público `/form/:token` con branding del organizador, selección de productos sin precios y submit de lead.
- Portal Cliente `/client/:token` con evento, estado, conteo regresivo y resumen de pagos.
- Dashboard con KPIs server-side, revenue chart, eventos por estado, activity feed, alertas operativas, stock bajo y onboarding.
- Admin dashboard y gestión de usuarios/suscripciones.
- Suscripciones Stripe: status, checkout y portal.
- Search global multi-entidad.
- PWA, lazy loading por ruta, ErrorBoundary global, React Query y tests extensos.

### Paridad destacada con backend

| Dominio backend | Estado web | Observación |
| --- | --- | --- |
| Auth core | ✅ Cubierto | Login/register/reset/refresh/me/logout/update profile/change password. |
| OAuth Google/Apple | ✅ Cubierto | Botones web llaman `/auth/google` y `/auth/apple`. |
| CRUD core | ✅ Cubierto | Clientes, eventos, productos, inventario, pagos. |
| Staff + teams | ✅ Cubierto | Rutas `/staff`, `/staff/teams` y servicios/hook layer existen. |
| Event forms | ✅ Cubierto con deuda | UI protegida y página pública existen; spec OpenAPI no cubre todo. |
| Client portal | ✅ Cubierto con deuda | Página pública existe; tipos escritos a mano por falta de OpenAPI. |
| Dashboard KPIs | ✅ Cubierto | KPIs, revenue chart y status chart salen del backend. |
| Dashboard analytics extra | ⚠️ Parcial | `top-clients`, `product-demand`, `forecast` están tipados pero no usados. |
| Device registration | ⚠️ Plataforma | Backend existe; para web depende de decisión de Web Push. |
| Live Activities | N/A web | Correctamente iOS-only. |

---

## 4. Hallazgos confirmados

### W1 — Drift contractual OpenAPI afecta flujos web nuevos

**Severidad:** Alta  
**Categoría:** Paridad backend/web

El backend auditado expone rutas de formularios públicos, portal cliente y staff teams que no están completamente declaradas en `backend/docs/openapi.yaml`. La web ya tuvo que compensar esto con tipos escritos a mano y `fetch` directo en flujos públicos.

Evidencia:

- `ClientPortalPage.tsx` declara tipos locales y documenta que no usa OpenAPI porque el endpoint público todavía no está en `openapi.yaml`.
- `PublicEventFormPage.tsx` usa `fetch` directo contra `${VITE_API_URL}/public/event-forms/{token}`.
- `eventPublicLinkService.ts` y `eventFormService.ts` consumen endpoints que dependen del mismo drift documentado en la auditoría backend.

**Impacto:** la web funciona, pero la garantía de contrato queda rota justo en features nuevas y públicas. Cualquier regeneración de tipos desde OpenAPI no protege estos flujos.

**Acción recomendada:** resolver primero el issue backend #99 y después migrar los tipos públicos web al contrato generado.

---

### W2 — Dashboard desaprovecha endpoints analíticos server-side

**Severidad:** Media  
**Categoría:** Paridad funcional / UX premium

El backend expone 7 endpoints bajo `/dashboard`:

- `/kpis`
- `/revenue-chart`
- `/events-by-status`
- `/top-clients`
- `/product-demand`
- `/forecast`
- `/activity`

La web consume 4 familias: KPIs, revenue chart, events-by-status y activity. Quedan sin experiencia visible:

- `GET /dashboard/top-clients`
- `GET /dashboard/product-demand`
- `GET /dashboard/forecast`

**Impacto:** el backend ya tiene inteligencia comercial que no se muestra. El Dashboard podría ser mucho más convincente para el usuario: mejores clientes, servicios más vendidos y forecast de ingresos futuros.

**Acción recomendada:** agregar widgets compactos al Dashboard usando esos 3 endpoints. Esto mejora paridad y también hace que la app se sienta más “dueña del negocio”, no solo lista de eventos.

---

### W3 — Formularios públicos no distinguen bien estados en carga inicial

**Severidad:** Media  
**Categoría:** UX pública / semántica HTTP

`PublicEventFormPage` marcaba cualquier `!res.ok` como `expired`. Con el fix de semántica HTTP, submit usa `410` para link inválido/expirado/usado y `GET` inicial ahora diferencia `404` (no encontrado) vs `410` (inválido/expirado):

- token inexistente (`404`)
- link expirado/usado (`410`)
- error temporal del servidor (fallback UX de no disponible)

Esto quedó alineado con backend H4 mediante issue #176.

**Impacto:** un cliente puede ver un mensaje de link expirado aunque el problema sea un token incorrecto o una falla temporal. Para un flujo público, esa confusión pega directo en confianza.

**Estado actual:** implementado en #176 para “no encontrado” vs “expirado/usado”. Queda como mejora futura separar explícitamente “no pudimos cargar, intentá de nuevo” cuando el error sea temporal de red/servidor.

---

### W4 — `eventPublicLinkService` no tiene hooks React Query

**Severidad:** Baja  
**Categoría:** Consistencia de arquitectura

La mayoría de dominios nuevos usan `services → hooks/queries → pages`. Event forms sí tienen `useEventFormLinks`, `useGenerateLink` y `useDeleteLink`. En cambio, el portal link del evento se maneja con estado local en `ClientPortalShareCard` y llamadas directas a `eventPublicLinkService`.

**Impacto:** funciona, pero pierde caching, dedupe, invalidación estandarizada y testabilidad homogénea.

**Acción recomendada:** crear `useEventPublicLink`, `useCreateOrRotateEventPublicLink` y `useRevokeEventPublicLink` con query keys por `eventId`.

---

### W5 — Mutaciones de fechas no disponibles siguen fuera del patrón de hooks

**Severidad:** Baja  
**Categoría:** Consistencia de arquitectura

`useUnavailableDatesByRange` existe para lectura, pero las mutaciones (`addDates`, `removeDate`) se llaman directo desde componentes como Calendar/EventForm.

**Impacto:** no rompe producto, pero deja una isla fuera del patrón React Query y puede generar refetch/manual state más frágil.

**Acción recomendada:** agregar hooks de mutación e invalidar `queryKeys.unavailableDates.*`.

---

### W6 — Documentación web vende una paridad más fuerte que la real

**Severidad:** Media  
**Categoría:** Documentación / contrato

La documentación dice que la web está “100% alineada con el contrato del backend” y que `openapi-typescript` protege el build/check. Hoy eso es demasiado fuerte:

- El spec OpenAPI sigue parcial para rutas públicas nuevas.
- `web/src/types/api.ts` incluye dashboard analytics extra, pero esos endpoints no están en la UX.
- `docs/Web/Módulo Formularios Compartibles.md` habla de `/api/v1`, mientras el cliente web por default usa `/api`.
- `docs/PRD/08_TECHNICAL_ARCHITECTURE_WEB.md` todavía contiene referencias heredadas a Zustand como estado global principal y a REST `/api/v1/*`, aunque el código real usa `ApiClient` con `/api` default y React Query + Context como base.

**Impacto:** futuras decisiones pueden apoyarse en una foto vieja. Acá no hay que “creerle al doc”; hay que sincronizarlo con el contrato real.

**Acción recomendada:** mantener este reporte como snapshot y limpiar los docs de arquitectura cuando se cierre #99.

---

## 5. UX/UI — mejoras pequeñas de alto impacto

### U1 — Dashboard: convertir analytics backend en “centro de mando”

Agregar 3 widgets compactos:

- **Top clientes**: quién más factura y cuánto representa.
- **Servicios más pedidos**: productos/event products con demanda real.
- **Forecast**: ingresos futuros por eventos confirmados/cotizados.

Esto usa backend existente y cambia la percepción: el usuario ya no ve solo “qué tengo”, ve “qué negocio estoy construyendo”.

### U2 — Portal cliente: sumar próximos pasos visibles

El portal ya muestra estado y pagos. Para que se sienta premium:

- agregar “Próximo paso” según estado (`quoted`, `confirmed`, `completed`)
- mostrar CTA de WhatsApp/email al organizador
- mostrar vencimiento de anticipo cuando el backend lo soporte
- agregar timeline simple: cotización → anticipo → confirmado → evento

No hace falta rehacer UI. Es microcopy + 1 bloque visual.

### U3 — Formulario público: reducir ansiedad del lead

Antes del submit, agregar copy breve:

- “No vas a pagar ahora.”
- “El organizador revisa tu solicitud.”
- “Los precios finales se confirman por cotización.”

También conviene separar error de red vs link expirado. Un usuario público no entiende estados técnicos.

### U4 — Event Summary: link del cliente más “share-first”

`ClientPortalShareCard` ya copia, rota, revoca y comparte por WhatsApp. Pequeño upgrade:

- previsualización mini de lo que verá el cliente
- indicador de último copiado/compartido
- botón primario único: “Compartir con cliente”
- acciones secundarias en menú: copiar, rotar, deshabilitar

Menos botones visibles, más intención.

### U5 — Onboarding orientado al flujo completo

El onboarding existe, pero debería empujar al “momento aha”:

1. Crear cliente
2. Crear evento
3. Agregar producto/inventario
4. Generar cotización o portal
5. Registrar anticipo

Esa secuencia demuestra el valor real de Solennix en minutos.

---

## 6. Landing — cómo expresar mejor el poder de la app

### Diagnóstico

La landing actual está pulida, tiene mockups, stats, pricing, testimonios, mobile badges y secciones completas. El problema no es “falta de contenido”. El problema es que el hero todavía comunica algo genérico:

> “Gestiona eventos profesionales”

Eso podría decirlo cualquier CRM. Solennix hoy tiene capacidades mucho más específicas:

- inventario con conflictos
- pagos y anticipos
- cotizaciones y PDFs
- portal cliente por enlace
- formularios públicos para leads
- staff/teams
- calendario operativo
- apps móviles, widgets y notificaciones

### Propuesta de narrativa

Cambiar el primer impacto de “gestiona eventos” a “control operativo completo”.

Ejemplo de hero:

> **Tu negocio de eventos, bajo control**  
> Cotizá, cobrá, coordiná inventario, personal y clientes desde un solo lugar.

Subcopy:

> Solennix conecta calendario, CRM, pagos, portal cliente, formularios públicos e inventario para que cada evento avance sin perseguir datos por WhatsApp, hojas de cálculo y notas sueltas.

### Secciones recomendadas

1. **Operación completa en una pantalla** — Dashboard real con KPIs, alertas, pagos pendientes y eventos próximos.
2. **Del lead al evento confirmado** — formulario público → cliente/evento draft → cotización → portal.
3. **Inventario sin choques** — disponibilidad, stock bajo, productos/equipos.
4. **Personal y equipos** — staff, turnos, disponibilidad y equipos asignables.
5. **Tu cliente también ve orden** — portal cliente con estado y pagos.
6. **Disponible en web + móvil** — mantener App Store/Google Play, pero como soporte del flujo, no como eje del hero.

### Ajustes visuales puntuales

- Reemplazar blobs/glows decorativos del hero por una captura o mockup más grande de producto real.
- Reducir tarjetas genéricas de features y priorizar 3 flujos guiados.
- Cambiar stats si no están verificadas; las métricas no verificadas erosionan confianza.
- Mostrar WhatsApp y PDFs como parte del workflow LATAM.
- Usar screenshots/mocks del portal y del formulario público, no solo dashboard.

---

## 7. Prioridades recomendadas

1. Cerrar #99: sincronizar OpenAPI con event forms, public portal y staff teams.
2. Cerrar #102: unificar `404` vs `410` y ajustar estados web públicos.
3. Agregar widgets web para `/dashboard/top-clients`, `/dashboard/product-demand`, `/dashboard/forecast`.
4. Crear hooks React Query para `eventPublicLinkService` y mutaciones de unavailable dates.
5. Reescribir hero/landing para mostrar el flujo completo de Solennix, no solo features sueltas.
6. Actualizar docs Web/PRD que todavía declaran paridad contractual total o rutas `/api/v1` como única realidad.

---

## 8. Fuentes de verdad auditadas

- `web/src/App.tsx`
- `web/src/lib/api.ts`
- `web/src/services/dashboardService.ts`
- `web/src/services/activityService.ts`
- `web/src/services/eventFormService.ts`
- `web/src/services/eventPublicLinkService.ts`
- `web/src/hooks/queries/queryKeys.ts`
- `web/src/hooks/queries/useDashboardQueries.ts`
- `web/src/hooks/queries/useEventFormQueries.ts`
- `web/src/hooks/queries/useUnavailableDatesQueries.ts`
- `web/src/pages/Dashboard.tsx`
- `web/src/pages/PublicEventForm/PublicEventFormPage.tsx`
- `web/src/pages/ClientPortal/ClientPortalPage.tsx`
- `web/src/pages/Events/components/ClientPortalShareCard.tsx`
- `web/src/pages/Landing.tsx`
- `web/package.json`
- `web/src/types/api.ts`
- `backend/internal/router/router.go`
- `backend/docs/openapi.yaml`
- `docs/Web/Módulo Formularios Compartibles.md`
- `docs/Web/Roadmap Web.md`
- `docs/PRD/11_CURRENT_STATUS.md`
- `docs/PRD/08_TECHNICAL_ARCHITECTURE_WEB.md`
