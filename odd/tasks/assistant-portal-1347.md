# #1347 — Portal Secretario Business-only + picker de invitación

Decisión usuario (verbatim): "solo business, pero tenemos que hacer el portal propio para dar al assistant las funciones que caben a el". Alcance v1 confirmado (verbatim propuesta aceptada): "agenda de próximos eventos, dotación por evento (quién va + RSVP + resumen de asistencia) y directorio de personal en lectura, más el picker Miembro/Secretario en la invitación. Sin finanzas, sin clientes, sin mutaciones."

Rama: `feat/assistant-portal-1347` (desde `feat/assistant-gating-1347`, trae el gating defensivo). Backend sin cambios (endpoints y gates existen).

## Specs

- S1: "solo business" — invitar como Secretario exige plan Business (backend ya 403 `staff.assistant_plan_required`); el picker solo ofrece Secretario en Business.
- S2: portal Secretario propio de solo lectura: agenda (upcoming events), dotación por evento (staff asignado + estados RSVP + attendance summary), directorio de personal en lectura. Cierra el hueco actual: hoy un assistant muta RSVP/checklist/disponibilidad en el portal de mesero.
- S3: picker de invitación Miembro/Secretario en las 3 apps, mandando `target_role` (`POST /staff/{id}/invite` acepta `team_member|assistant`, default `team_member`).
- S4: bifurcación por rol: `assistant` → portal Secretario, `team_member` → portal Mi jornada, resto → app organizador.

## Tasks

- T1 (S1+S2+S3+S4, web, delegated): `web/src/pages/Assistant/*` + rutas `/assistant/*` + guard por rol + picker en `StaffDetails` + `target_role` en `staffService`. Tests. Commit: pendiente.
- T2 (S1+S2+S3+S4, iOS, delegated): portal Secretario (vistas+viewmodel) + bifurcación en `ContentView` + `targetRole` en invite API. Commit: pendiente.
- T3 (S1+S2+S3+S4, Android, delegated): portal Secretario (screen+viewmodel) + bifurcación en `MainNavHost` + `target_role` en repo. Tests. Commit: pendiente.
- T4 (verificación+review+PR, inline): C4 del rango + PR. Commit: pendiente.

## Log

- L4: C4 del rango portal: APPROVED cero P0/P1. Fix P2 (target_role en entities.ts, commit aparte `3ef5e499`). P3s como follow-ups: picker Android no reevalúa plan sin recargar; redirect assistant en dos saltos en web.
- L1 (usuario, verbatim): "solo business, pero tenemos que hacer el portal propio para dar al assistant las funciones que caben a el"
- L2 (usuario, verbatim): "confirmado" (alcance v1 propuesto por el parent)
- L3: base `feat/assistant-gating-1347` (gating defensivo ya revisado APPROVED, PR #1360 CI pendiente). Backend sin cambios (verificado en brief de explorer).
