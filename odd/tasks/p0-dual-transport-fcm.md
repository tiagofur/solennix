# P0 — Contrato dual-transport + FCM + OpenAPI

Fixes del review web аут: documentar y blindar el contrato auth dual (body para móvil, cookies para web), FCM huérfano tras logout, init duplicado, y ~30 endpoints fuera del OpenAPI.

## Specs

- S1: `POST /api/auth/team-invite/accept` (y `Login`) mantienen `{user, tokens}` en el body porque iOS (`AuthManager.swift:415` hace `storeTokens`) y Android (`AuthManager.kt:190` usa `AuthEnvelope`) los necesitan; la web los ignora y usa cookies httpOnly + `checkAuth()`. Backend: comentario de contrato en el handler. Web: `TeamInviteAcceptResponse` ya no expone `tokens` para que nadie los consuma por accidente.
- S2: `contracts/openapi.yaml` incluye los ~30 endpoints que la web consume y hoy faltan (staff CRUD, payment-submissions + públicas, team-invite/accept, verify-email+resend, page-views, registration-funnel, dashboard/summary, equipment/availability, reviews, admin inactive/empty-resources/verify-email/block/listing-moderation); se documenta el esquema dual (bearer móvil + cookies/CSRF web); se regenera `web/src/types/api.ts` con `npm run openapi:types`.
- S3: `signOut` web llama a `unregisterPushNotifications` (best-effort) con el token cacheado antes de limpiar estado, para que el push no siga llegando tras logout.
- S4: `initPushNotifications` no registra `onMessage` duplicado ante re-ejecuciones (guard por usuario + unsubscribe previo).

## Tasks

- T1 (S1, inline, parent): comentario contrato en `auth_handler.go` + achicar tipo web. Commit: pendiente (sin commit por política: el usuario no lo pidió explícitamente).
- T2 (S2, worker background): paths OpenAPI + regen api.ts. Worker: 31 paths/38 ops; parent agregó submit-for-review + fix schema OrganizerPublicProfile. Commit: pendiente (ídem).
- T3 (S3, inline, parent): cache de token + unregister en `signOut` y en logout por 401. Commit: pendiente (ídem).
- T4 (S4, inline, parent): guard idempotente en `initPushNotifications`. Commit: pendiente (ídem).
- T5 (verificación): vitest 48 passed (notifications incl. 3 probes nuevas S3/S4, TeamInviteAccept, Layout, AuthContext) + `go test -run Invite` ok + `tsc -b --noEmit` limpio + `openapi:types` ok + `gentle-ai-verify`: S1/S3/S4 pass, S2 fail→fix→re-verificado por parent (api.ts data=OrganizerPublicProfile).

## Log

- L1 (usuario, verbatim): "hagamos un review de la app web en busqueda de mejoras, errores, fallos de logica, bugs, perdida de memoria o datos... que podemos mejorar en temas de funcionalidades, sugerencias... integracion con Backend..."
- L2 (usuario, verbatim): "vamos con el P0"
- L3 (decisión arquitecto): P0-1 original ("sacar tokens del body") se revierte tras verificar iOS/Android: rompería móvil. Se reemplaza por documentar + blindar (S1).
- L4 (evidencia T5 parcial): vitest notifications + TeamInviteAccept + Layout → 31 passed; `go test ./internal/handlers/ -run Invite` → ok; `tsc -b --noEmit` en web → limpio. Falta: T2 worker + verify independiente.
