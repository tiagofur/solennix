# #1343 — Flujo de invitación completo Personal

Objetivo: invitar con login en <1 min sin salir de la app. Rama: `feat/staff-invite-flow-1343`. Estrategia: backend primero, luego web, luego iOS/Android en paralelo. Runner: backend `go test -race`, web `vitest + typecheck + lint`.

## Specs

- S1: "Compartir directo: botón Compartir con share sheet nativo (iOS `UIActivityViewController`, Android intent, Web `navigator.share` con fallback a copy) con texto pre-armado"
- S2: "Link persistente: mostrar la invitación pendiente leyendo el status que ya devuelve `GET /staff` (LEFT JOIN a invite pendiente) en vez de estado en memoria"
- S3: "Onboarding inline: micro-copy que explique el flujo completo (abre el link → crea contraseña → ve 'Mi jornada')"
- S4: "Web i18n: mover todos los strings de invitación a `staff.json` (es/en)"
- S5 (out, opcional): "que el backend envíe email de invitación si el staff tiene email" — NO en este slice (requiere Resend/DKIM)

## Tasks

- T1 (S2, backend, inline tras worker estancado): fragmento compartido `staffPendingInviteJoin` usado en `GetAll`, `GetAllPaginated`, `Search` y `GetByID`. Test estático PASS, integración SKIP sin Docker; `go vet` limpio; fallo `TestCheckPasswordBreachedWithClient` confirmado pre-existente en base limpia. Commit: `a2d671b9`.
- T2 (S1+S2+S3+S4, web, delegated): share (`navigator.share` + clipboard fallback) + pendiente persistente vía `invite_status` + i18n `staff.json` es/en + micro-copy. Tests `StaffDetails.test.tsx` 43/43 + vecinos 67/67 + tsc + eslint + check-i18n. Commit: `7700f4cc`. C4 review: APPROVED (P2 AbortError-fallback + P2/P3 nits, no bloqueantes). Dual ciego: jd-a APPROVED + jd-b APPROVED (cero P0/P1; P2 AbortError y refetch-asimetría quedan como polish futuro). Chained-pr: `size:exception` (635 líneas, prod ~192; exceso es tests atómicos).
- T3 (S1+S2+S3, iOS, delegated): `UIActivityViewController` + pendiente persistente vía `GET Endpoint.staff` detalle + strings + 9 claves xcstrings es/en agregadas en parent. Commit: `f5aa48d2`.
- T4 (S1+S2+S3, Android, delegated): `ACTION_SEND` + pendiente persistente + `strings.xml`. Tests `StaffDetailViewModelTest`. Commit: pendiente.
- T5 (verificación, inline): web 43/43 + vecinos 67/67 + tsc + eslint + check-i18n (ejecutado); backend `go vet` + test estático PASS + integración SKIP sin Docker (ejecutado); iOS `swiftc -parse` + xcstrings JSON (ejecutado); Android tests authored sin ejecutar (Gradle bloqueado en sandbox). C4 `7700f4cc..22bcad2b`: CHANGES_REQUESTED (P1 popover iPad + P2 stale + P3 feedback). Fix commit `97f3399e`. Re-judgment dual ciego del delta: jd-a APPROVED + jd-b APPROVED, cero P0/P1. JUDGMENT: APPROVED. Sin cambios de contrato (modelo `invite_status` ya existía).

## Log

- L1 (usuario, verbatim): "seguimos con las mejoras de personal y business"
- L2 (usuario, verbatim): "si, seguimos"
- L3: scope fijado a #1343 (flujo invitación). S5 email queda fuera. Base `main`.
- L4 (incidente 2026-11-05): un `git stash -u` + `pop` aplicó por error un stash viejo del 2026-10-27 (ruido Xcode). Resuelto con autorización del usuario: 4 archivos revertidos; xcstrings reconstruido (+144/-0 vs `7700f4cc`, solo las 9 claves). Commit fix: `6b11acf5`. Sin amend (skill git); historia publicada intacta.
