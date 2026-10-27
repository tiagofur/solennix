# Sesión Activa — Solennix Agent Progress

## Estado actual

### Ops prod: compra App Store RJ COMPANY + suscripciones RC (2026-10-26/27)

- Compra identificada: `rubensjoelpinilla@gmail.com` (RJ COMPANY) — mensual `solennix_premium_monthly`, COP 29.900, 22/10, atribuida a su UUID vía alias RC.
- DB prod: `plan=pro`, `plan_expires_at=2026-11-22` (red de seguridad pedida por usuario; sweep saltea subs activas), fila `subscriptions` apple activa 22/10→22/11 06:17 UTC (fechas exactas de la API RC).
- RC: Secret API key V1 `solennix-backend-prod` creada y cableada (`REVENUECAT_API_KEY` en `.env` VPS, verificada con curl); webhook con Authorization header (estaba vacío) + `REVENUECAT_WEBHOOK_SECRET` rotado; Send test → 200 en backend; webhook muerto `Eventos Ap` (api-eventos.creapolis.dev) eliminado — era la causa de que la compra original nunca llegó (4 entregas fallidas).
- Próximo hito: renovación real 22/11 06:17 UTC (primer webhook real).

### Fix emails de reseñas (2026-10-27, commit `2b27c3a8` en `fix/review-emails-date-scan`)

- `event_review_repo.go`: `e.event_date::text` (pgx binario no escanea DATE→string); job cada 6h fallaba y ningún email de reseña salía.
- Test integración RED→GREEN (`TestListPendingEmailCandidates`, testcontainers + colima: `DOCKER_HOST=$(docker context inspect colima ...)` + `TESTCONTAINERS_RYUK_DISABLED=true`). Suite repository completa OK.

### Fix iOS: login RC tras sign-in (2026-10-27, implementado)

- `AuthManager.onSessionStart` hook (signIn/Apple/Google/team invite) → app lo conecta a `SubscriptionManager.login` + flush mutaciones (causa raíz de compras anónimas `$RCAnonymousID`).
- `SubscriptionManager.login` ya no traga errores: log con os.Logger.
- Pendiente: build xcodebuild en curso.

### Trabajo previo sin commitear (sesiones anteriores)

- `progress/current.md`, `odd/tasks/*` modificados + 4 tests web nuevos sin commit (P1 web leaks/races).

### v2.0 remediation — hallazgos review perfil público + directorio (cerrados en código)

Branch de trabajo: `feat/v2-geo-search-web` (sobre main con S13 + #1127).

| Hallazgo review | Fix |
| --- | --- |
| Geo handler no parseaba lat/lng/radius | `SearchOrganizers` + tests |
| Geo web #1128 incompleto | Near me + sort + radius_km=50 + i18n |
| `client_token` con `json:"-"` | DTO create-only con token |
| Anti-spam incompleto | Honeypot `website` (fake 201) |
| Sitemap ≠ publicable | `ListEnabledSlugs` alineado a criterios de directorio |
| Cover OR logo vs PRD | Directorio exige `cover_url` |
| `service_radius_km` muerto | Upsert API + filtro geo + settings UI |
| Dual PublicLead | Deprecation headers + OpenAPI `deprecated` |
| Sin inbox web proveedor | `/requests` + service + nav |
| Funnel visitante ciego | `/solicitud/:id` + accept/decline |
| robots/sitemap proxy | `nginx.conf` + robots con URL API |
| progress/current stale | Este archivo |

### Backend tocado
- `handlers/public_profile_handler.go` — geo query params
- `handlers/public_request_handler.go` — token create DTO, honeypot, GetRequest full
- `handlers/public_profile_config_handler.go` — service_radius_km
- `handlers/public_lead_handler.go` — Deprecation
- `repository/public_profile_repo.go` — cover-only, sitemap publicable, radius filter
- `docs/openapi.yaml`, `models.go` comment
- tests handlers/repo

### Web tocado
- Proveedores geo finish
- publicRequestService + PublicLeadModal honeypot/token
- PublicRequestStatusPage `/solicitud/:id`
- RequestsInboxPage `/requests`
- PublicProfileSettings radius
- Layout nav, App routes, i18n, nginx, robots

### Tests
- Backend: handlers SearchOrganizers + CreatePublicRequest OK; repository search OK
- Web: 71 tests en paths tocados OK

### Gaps menores restantes
- Regenerar `web/src/types/api.ts` desde OpenAPI (`npm run openapi:types` si existe)
- Inbox sin paginación UI >50; sin badge de unread en nav
- Captcha real (Turnstile) no implementado — honeypot + rate-limit es el piso F1
- Mobile S14 intacto (fuera de scope)

## Siguiente tarea
- Review + commit(s) + PR(s)
- Regenerar OpenAPI types
- S14 mobile inbox cuando toque

## P0 review web — dual-transport + FCM + OpenAPI (2026-10-15, MERGEADO #1276)

- T1 dual-transport: comentario de contrato en `auth_handler.go` + `TeamInviteAcceptResponse` sin `tokens` (móvil intacto).
- T2 OpenAPI: 98→131 paths, servers 8080, `cookieAuth`, `api.ts` regenerado (33 commits `docs(api)` + fix nullable + fix description login por contract test).
- T3/T4 FCM: unregister en `signOut` y logout 401; init idempotente por usuario.
- Issue #1275, PR #1276 mergeado.

## P1 review web — leaks, carreras y refetch (2026-10-15, implementado, SIN commit)

Rama `fix/p1-web-leaks-races-refetch` desde main (post #1276).
- P1.1 Layout resize: cleanup por `pointercancel`/unmount + ref de drag activo (Layout 18 tests OK).
- P1.2 `checkAuth` con generación: logout invalida `/auth/me` en vuelo, sin sesión zombie (AuthContext 14 tests OK).
- P1.3 hydrate-once en `EventForm` (5 fuentes) y `ClientForm`: el refetch no pisa ediciones (45 tests OK).
- P1.4 checklist: intersección con ids vigentes, purga de huérfanos, progreso capeado + 2 tests nuevos.
- P1.5 sugerencias con debounce 500ms + flag cancelled (33 tests OK).
- P1.6 inbox: paginación UI real con `Pagination` compartido + badge con `refetchInterval` 30s + 2 tests nuevos (6/6 OK).
- `tsc` limpio tras cada ítem. Spec: `odd/tasks/p1-web-leaks-races-refetch.md`.
- Pendiente: commit(s) + PR (decisión del usuario).

## Backend security remediation (2026-10-19)

Auditoría completa (4 subagentes + spot-checks): 41 hallazgos S1-S41 documentados en `odd/tasks/backend-security-remediation.md` + Engram obs 2273.

Branch `fix/backend-security-remediation` (2 commits, verificación independiente PASS en ambos):
- `f8c8ad11` T1/S1: Apple sign-in ya no confía en email del body/form — solo id_token verificado (`trustedAppleEmail`); 12/12 tests Apple.
- `2a654927` T2/S2: NaN/±Inf rechazados en parse de submissions, `ValidatePayment` fails-closed y `ReviewSubmission` valida antes de crear payment (filas legacy).
- `afdee55d` T3/S3: purge de retention ahora anonimiza+tombstone (`AnonymizeUserForRetention`) en vez de `DELETE` cascade — payments/events/submissions sobreviven; gate de email en stages 1-3 (outage congela el lifecycle). Cubre inactividad 210d y self-deletion 90d. Verificación independiente PASS + suite repository completa (Docker).
- `5c5f17c5` T4/S4: fetch de logos con política SSRF (`checkLogoFetchTarget`: scheme/IP/DNS/redirects/5MB) + contención traversal (Abs+prefijo, Stat 10MB) + validación LogoURL/CoverURL en `UpdateProfile` (400). RED en todos los vectores; suite handlers completa (21.5s). Verificador externo caído 2× → auto-verificación sustituta documentada en L7.
- `497f1f90` T5/S5: claim `TryInsert` + flag `applyFailed` en 15 mutaciones core + `Delete` marker y 5xx en fallo (Stripe + RevenueCat); 4xx deterministas y best-effort intactos. RED genuino en ambos providers; suite handlers completa (18s, 0 regresiones). Verificador externo caído 2× → auto-verificación sustituta documentada en L8.
- `8e932bed` T6/S6: deducción de stock idempotente (ledger `event_supply_deductions`, migración 086, UNIQUE(event_id,inventory_id)), sin GREATEST (shortage honesto) y atómica (`UpdateEventWithSideEffects`: evento+stats+deduct en tx con rollback); handler surfacea 500 y deduct solo en quoted→confirmed. 7 tests preexistentes migrados a la API atómica; 2 `StillReturns200` re-fijados a 500 (S6). Verificación independiente PASS (4 reglas + 5 probes). Advisory nuevo registrado: S42 (auto-confirm sin deducción, baseline).

Pendiente: T7 goroutines → T8/T9 → T10 cierre. `progress/current.md` sin commitear (mezcla contenido previo de sesión P1 web).

## Plan limit en conversión de solicitudes públicas (2026-10-19)

Hallazgo del review cross-platform "free con 10 eventos en 1 día": `ConvertToEvent`/`auto_event` creaba Client+Event sin gate de plan (bypass 4 eventos/mes + 20 clientes).

Branch `fix/plan-limit-request-conversion` (base: `fix/backend-security-remediation`, archivos tocados idénticos a main):
- Nuevo `backend/internal/planlimit`: única fuente de límites basic (4 eventos/mes por `event_date`, 20 clientes), SQLs canónicos y `CheckTx` (advisory lock + count en tx abierta).
- `public_request_service.go`: `enforceConvertPlanLimits` (basic: events→clients; errores de infra envueltos en `errConvertGateFailed`), tipo `PlanLimitError`; `autoEventConvertTx` con fallback a request pendiente (el visitante nunca ve error); gate al tope de `convertToEventInTx`; `SetUserLookup(userRepo)` wireado en `main.go`.
- Handlers: `ConvertToEvent` mapea `PlanLimitError` → 403 `plan_limit_exceeded` estándar (upgrade prompt); `withPlanLimit` y crud create event/client ahora usan `internal/planlimit` (DRY).
- Docs: OpenAPI 403 en convert-to-event; PRD `04_MONETIZATION` §2.1 enforcement + nota de semántica de conteo por `event_date` y fallback `auto_event`.
- Tests: 11 nuevos (gate unit con fakeTx: límites, paid skip, nil lookup, infra wrap, fallback ×2, convert OK; handler 403). RED→GREEN; suite backend completa 12 pkgs ok, 0 FAIL.

Pendiente: `./init.sh` final + commit.
