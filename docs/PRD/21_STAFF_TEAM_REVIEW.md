# 21 — Personal / Equipos: revisión funcional y plan de mejoras

> Review puntual (2026-11-02) de la función **Personal** (catálogo de colaboradores, invitación con login, equipos) para convertirla en una función "poderosa" — el caso objetivo son **equipos de meseros / banquetería** de 3–20 personas.
> Matriz comercial de referencia: [[04_MONETIZATION]] §2.4. Estado vivo: [[11_CURRENT_STATUS]].

---

## 1. Cómo funciona HOY (verificado en código, no en docs)

"Personal" mezcla **3 conceptos distintos** que la UI no distingue:

1. **Catálogo de colaboradores** (tabla `staff`, `backend/internal/database/migrations/042_create_staff_and_event_staff.up.sql`). Contacto con `role_label` en **texto libre** ("Mesero, DJ, Fotógrafa"). Es solo una etiqueta visual — **no es un permiso**. Solo lo ve el organizador.
2. **Invitación con login** (`POST /staff/{id}/invite`). Convierte un colaborador del catálogo en un `users` real (rol `team_member`) que se loguea y ve el **portal "Mi jornada"**. Requiere email y plan Pro+. Token SHA-256, expira en 7 días (`staff_handler.go:393`). **El backend NO envía email de invitación**: devuelve un `accept_url` que el organizador debe copiar y enviar por su cuenta.
3. **Equipos / cuadrillas** (`staff_teams`, migración 044). Grupos ("Meseros Plata") que la **UI expande** en filas de `event_staff` al asignar (no hay endpoint bulk en backend). Acceso: fila "Equipos" dentro de Personal, no es tab propio.

### 1.1 Matriz de límites por plan (código real)

Fuente: `backend/internal/handlers/staff_handler.go` (`basic→1`, `pro→5`, Business ∞; invite `team_member` Pro+, `assistant` Business-only), `backend/internal/handlers/plan_utils.go:89,111,134`.

| Capacidad | Gratis (basic) | Pro | Business |
| --- | --- | --- | --- |
| Filas en catálogo (`staff` seats) | **1** | **2** | **∞** |
| Invitar con acceso (login + portal) | ❌ 403 | ✅ | ✅ |
| Rol "Secretario" (`assistant`) | ❌ | ❌ | ✅ (no expuesto en ninguna UI) |
| Email al colaborador al asignar | ❌ | ✅ **ya funciona** | ✅ |
| Equipos (`staff_teams`) | ✅ sin límite | ✅ | ✅ |

- **Los seats NO se facturan**: son un tope de filas. Cero referencias a seats en Stripe/RevenueCat services.
- El límite se aplica **solo en backend** (`withPlanLimit` con advisory lock, `planlimit/planlimit.go`). Ninguna de las 3 apps muestra "1/5 asientos" ni tiene paywall propio de staff (Clientes/Productos sí tienen gating client-side; Personal no).
- El PRD confirma los números: "Staff Pro = 5" ([[04_MONETIZATION]] §2.3).

### 1.2 Qué puede hacer un colaborador invitado (`team_member`)

Al aceptar (`POST /auth/team-invite/accept`, `auth_handler.go:1016`) crea contraseña y queda logueado con cuenta nueva (plan `basic`). En las 3 plataformas la app **entera se reemplaza por el portal**:

- iOS `ios/Solennix/ContentView.swift:130` (`role == "team_member"` → `TeamMemberPortalView`)
- Android `android/app/src/main/java/.../MainNavHost.kt:110`
- Web `web/src/components/ProtectedRoute.tsx:29` (redirect a `/team/work`)

Funciones del portal (las 3 plataformas):

- **Mi jornada**: asignaciones con evento, fecha, ubicación + Maps, **contacto del cliente** (nombre + teléfono), notas del organizador, rol, turno entra/sale, fee ("Pago").
- **RSVP**: aceptar / rechazar. Con **grupos de oferta** (`offer_group_id`/`offer_slots`): primeros N que aceptan confirman, el resto se auto-rechaza (`staff_repo.go:633-697`).
- **Calendario** de sus eventos + timeline "Cambios recientes" (`team_member_change_events`, migración 052).
- **Disponibilidad**: bloquear fechas; el organizador ve "Ocupado ese día" al asignar (`staff_repo.go:368-418`).
- **Checklist de ejecución** por asignación (llegada / montaje / cierre) + notas rápidas, server-synced (`event_staff.execution_state` JSONB, migración 063; #875).

Lo que **no** puede: ver clientes, cotizaciones, finanzas ni nada del organizador. No hay niveles intermedios: portal fijo o app completa.

### 1.3 Email al asignar — estado real (corrección a la creencia general)

**Ya está implementado y activo para planes pagos**: `crud_handler.go:1180-1231` — al guardar el evento se envía `SendCollaboratorAssignedLocalized` a cada asignación con `notification_sent_at IS NULL` + `notification_email_opt_in=true` + email presente (`event_repo.go:778-785`). Una sola vez por asignación; el resultado queda en `NotificationSentAt/LastResult` (web muestra badge "Aviso enviado").

→ El problema no es el feature sino el **copy**: las 3 apps todavía dicen "Phase 2 (próximamente)" (`ios/.../StaffStrings.swift:67,107`, Android `staff_form_notification_description`, web `staff.json form.help_text`).

---

## 2. Hallazgos: por qué se siente confusa

| # | Hallazgo | Evidencia |
| --- | --- | --- |
| H1 | **Contradicción pricing ↔ código**: web pricing y PRD dicen "portal de colaboradores (login)" solo Business, pero el backend lo permite desde Pro (`plan != pro && != business` → 403). Pro obtiene el portal "de regalo" sin que el marketing lo prometa. | `web/src/locales/es/pricing.json`; `04_MONETIZATION.md:142`; `staff_handler.go:351-354` |
| H2 | **Límite de asientos invisible**: ninguna app muestra uso ("1/2") ni tiene CTA de upgrade en Personal. El free/pro llena el formulario y recibe 403 genérico después. | `PlanLimitsManager.swift` (sin staff); `web/src/hooks/usePlanLimits.ts` (sin staff); `PlanLimitsManager.kt` (sin staff) |
| H3 | **Mensaje de upgrade incorrecto**: el error genérico `plan.limit_exceeded` dice "Actualiza a **Pro**" incluso para un Pro que ya llegó a 5 y necesita Business. | `backend/internal/i18n/messages.go:128`; iOS lo muestra como footnote (`StaffDetailView.swift:420-425`) |
| H4 | **Invitación sin email y sin explicación**: el backend no manda correo de invitación; la UI no explica que hay que copiar el link. En iOS el link es memory-only (se pierde al navegar). | `staff_handler.go:411-430` (solo log si emailSvc nil); `StaffDetailView.swift:336,393-429` |
| H5 | **Copy stale "Phase 2"** en el toggle de notificaciones de las 3 apps, cuando el email al asignar ya está vivo para Pro+. | §1.3 arriba |
| H6 | **`assistant` (Secretario) es deuda muerta + bug latente**: existe en backend (Business-only) y en tipos de web, pero ninguna app puede invitarlo (las 3 mandan body vacío / `{}`). Y el gating solo chequea `role == "team_member"`: un `assistant` vería la app completa de organizador en iOS. | `APIClient+StaffInvites.swift` (body vacío); `web/src/services/staffService.ts:56-58` (`{}`); `ContentView.swift:130-136` |
| H7 | **Doble significado de "Rol"**: etiqueta libre de trabajo vs permiso real (`team_member`/`assistant`) sin explicación en UI. Placeholders distintos por plataforma ("Fotógrafa · DJ · Coordinador" vs "…· Mesero"). | `StaffFormView.swift:113-116`; `web/src/locales/es/staff.json:86` |
| H8 | **Parity drift**: strings de invitación hardcodeadas en español en web (cero claves `invite` en `staff.json`); semántica de borrado contradictoria (web: "se elimina de los eventos" vs Android: "las asignaciones no se borran"); política de contraseña distinta (Android exige símbolo, web no); auto-expansión de equipo desde producto (Ola 3) existe en web pero no en Android/iOS. | `web/src/pages/Staff/StaffDetails.tsx` (inline defaults); `TeamInviteAccept.tsx` vs `TeamInviteAcceptScreen.kt`; `EventForm.tsx:578-652` |
| H9 | **Pro (2 asientos) no sirve al segmento objetivo**: banquetería chica real = 3–8 meseros. El valor del portal (menos WhatsApp, RSVP, checklist) aparece con 3+. | análisis de producto |

## 3. Decisión tomada (P0 resuelto): opción A — portal en Pro

Decisión del dueño (2026-11-05, issue #1340): **opción A**.

- **A (adoptada): portal en Pro con más asientos con login** (Pro = 5, Business = ∞). El portal es el mejor loop de adquisición B2B2C: cada mesero que se loguea ve la marca Solennix. El catálogo ilimitado por sí solo vale menos. Alineado en: `staff_handler.go` (Gratis=1, Pro=5, Business=∞; invite `team_member` Pro+, `assistant` Business-only), `plan_utils.go` (`unlimited_staff_seats`), `pricing.json` es/en, PRD 04 §2.3–§2.4, iOS `SubscriptionView` (beneficio staff por plan).
- **B (descartada): respetar Business-only.** Riesgo: el feature deja de ser útil para el 80% del segmento objetivo.

Matriz final: Gratis = 1 seat catálogo, sin login · Pro = 5 seats + portal + email al asignar · Business = ∞ + Secretario + branding.

Nota histórica: este doc citaba `pro→2` y líneas viejas de `staff_handler.go`; la fuente vigente es el código (seats 1/5/∞) y PRD 04 §2.4.

## 4. Plan de mejoras priorizado

| Fase | Mejora | Impacto | Issue |
| --- | --- | --- | --- |
| **P0** | Decidir pricing del portal (§3) y alinear todo el copy | desbloquea todo lo demás | #2 (epic) |
| **P0** | Exponer `staff_seats` (uso/límite) desde backend | base para contador | |
| **P0** | Contador de asientos + paywall específico + mensaje de upgrade correcto (3 apps) | el usuario finalmente entiende el límite | |
| **P0** | Invitación completa: compartir directo (WhatsApp/share sheet), link persistente, copy que explique el flujo, i18n en web | cierra el embudo de adopción | |
| **P0** | Corregir copy stale "Phase 2" (3 apps) | trust | |
| **P1** | Roles sugeridos en picker (Mesero, Capitán, DJ, Fotógrafo + texto libre) | dato limpio + descubribilidad | |
| **P1** | Resumen de asistencia por evento ("9/12 confirmados") | killer feature para equipos grandes | |
| **P1** | Decidir `assistant`: exponer en 3 UIs o eliminar del backend + fix gating iOS | cierra deuda + bug | |
| **P2** | Parity cleanup: delete semantics, password policy, expansión de equipo desde producto en Android/iOS, deep links del portal | calidad | |

## 5. Apéndice: referencias rápidas

- Backend: `staff_handler.go` (seats/invite), `staff_team_handler.go`, `staff_repo.go` (portal queries, offer groups, timeline), `staff_team_repo.go`, `planlimit/planlimit.go`, `auth_handler.go:1016` (accept), `email_service.go:104` (assigned email).
- OpenAPI: `backend/docs/openapi.yaml:3627-3800`.
- iOS: `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Staff/` (+ `TeamMemberPortalView.swift`), invite en `StaffDetailView.swift`.
- Android: `android/feature/staff/`, portal `TeamMemberPortalScreen.kt`.
- Web: `web/src/pages/Staff/`, portal `web/src/pages/TeamMember/`.
- Migraciones: 042 (staff/event_staff), 043 (shift/status), 044 (teams), 045 (product.staff_team_id), 048 (invites), 049/051 (roles), 050 (offer fields), 052 (timeline), 063 (execution_state).
