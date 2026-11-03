# Sesión Activa — Solennix Agent Progress

## Estado actual

### Review Personal/Equipos + plan de mejoras (2026-11-02)

- Review funcional completo del feature Personal (catálogo, invitación con login, equipos) en `docs/PRD/21_STAFF_TEAM_REVIEW.md`: matriz de límites real (basic=1, pro=2, business=∞ seats), roles, qué ve un `team_member`, 9 hallazgos (H1–H8) con file:line.
- Corrección clave: el email al asignar colaborador **ya vive** para planes pagos (`crud_handler.go:1180-1231`); lo roto era el copy "Phase 2" en las 3 apps.
- Decisión pendiente documentada (§3): portal en Pro (recomendada, Pro=5) vs Business-only.
- Issues creados: epic [#1349](https://github.com/tiagofur/solennix/issues/1349) + 9 sub-issues [#1340](https://github.com/tiagofur/solennix/issues/1340)–[#1348](https://github.com/tiagofur/solennix/issues/1348) (pricing, staff_seats endpoint, contador+paywall, flujo invitación, copy stale, roles picker, asistencia X/N, rol assistant, paridad).
- Sin cambios de código. `./init.sh` en verde.

### Release train iOS 1.5.1 (build 10) — en branch `fix/ios-event-list-date-shift`

- Bump `ios/project.yml` → `MARKETING_VERSION 1.5.1` + `CURRENT_PROJECT_VERSION 10` (app, widget, notification extension) + `xcodegen generate` (pbxproj/xcschemes regenerados).
- Notas App Store (es/en, corta/larga) en `docs/release-notes/next.md`; CHANGELOG "Versiones actuales" actualizado.
- Contexto: ASC ya muestra 1.5.0 (entrada creada manualmente / Xcode Cloud; el repo nunca tuvo 1.5.0 en git — verificado con `-S`). `xcodecloud/manifest.json` quedó sin trackear (setup de Xcode Cloud local).
- Android se queda en 1.4.0 (10): los cambios del tren son iOS-only.

### Fix desfase de fecha (1 día hacia menos) en lista de eventos iOS

Reporte de usuario: en la lista de eventos la fecha sale un día antes. Diagnóstico punta a punta:

| Capa | Estado | Detalle |
| --- | --- | --- |
| Backend | ✅ OK | `event_date` DATE; entra/sale string `YYYY-MM-DD` (`to_char`), sin timezone en el camino (`crud_handler.go`, `event_repo.go`) |
| iOS detalle | ✅ OK | `fromServerDay` (UTC) + `formattedServerDay` (UTC) en `EventDetailView.swift:462` |
| iOS lista | ❌→✅ | `EventListView.apiDateFormatter` parsea a medianoche **UTC**, pero `formattedDisplayDate`/`formattedShortDate` no fijaban timezone → zona local (UTC-6 MX) → mostraba el día anterior. Fix: ambos formatters fijados a UTC + `static` internal. |

- Test regresión nuevo: `SolennixFeaturesTests/Events/EventListViewDateDisplayTests.swift` (3 tests en verde; 8 snapshot failures de EventListView son preexistentes en main, verificado con stash).
- Nota tests iOS locales: `swift test` no sirve (ActivityKit); correr con `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -scheme SolennixFeatures -destination "platform=iOS Simulator,name=iPhone 17"` desde `ios/Packages/SolennixFeatures`.

### Ops prod: compra App Store RJ COMPANY + suscripciones RC (2026-10-26/27)

- Compra identificada: `rubensjoelpinilla@gmail.com` (RJ COMPANY) — mensual `solennix_premium_monthly`, COP 29.900, 22/10, atribuida a su UUID vía alias RC.
- DB prod: `plan=pro`, `plan_expires_at=2026-11-22` (red de seguridad pedida por usuario; sweep saltea subs activas), fila `subscriptions` apple activa 22/10→22/11 06:17 UTC (fechas exactas de la API RC).
- RC: Secret API key V1 `solennix-backend-prod` creada y cableada (`REVENUECAT_API_KEY` en `.env` VPS, verificada con curl); webhook con Authorization header (estaba vacío) + `REVENUECAT_WEBHOOK_SECRET` rotado; Send test → 200 en backend; webhook muerto `Eventos Ap` (api-eventos.creapolis.dev) eliminado — era la causa de que la compra original nunca llegó (4 entregas fallidas).
- Próximo hito: renovación real 22/11 06:17 UTC (primer webhook real).

### Fix emails de reseñas (2026-10-27, commit `2b27c3a8` en `fix/review-emails-date-scan`)

- `event_review_repo.go`: `e.event_date::text` (pgx binario no escanea DATE→string); job cada 6h fallaba y ningún email de reseña salía.
- Test integración RED→GREEN (`TestListPendingEmailCandidates`, testcontainers + colima: `DOCKER_HOST=$(docker context inspect colima ...)` + `TESTCONTAINERS_RYUK_DISABLED=true`). Suite repository completa OK.

### Fix iOS: login RC tras sign-in (2026-10-27, mergeado como #1305)

- `AuthManager.onSessionStart` hook (signIn/Apple/Google/team invite) → app lo conecta a `SubscriptionManager.login` + flush mutaciones (causa raíz de compras anónimas `$RCAnonymousID`).
- `SubscriptionManager.login` ya no traga errores: log con os.Logger.

### Trabajo previo sin commitear (sesiones anteriores)

- `odd/tasks/*` modificados + 4 tests web nuevos sin commit (P1 web leaks/races).

## Siguiente tarea
- Mergear PR del tren 1.5.1, archivar desde Xcode con 1.5.1 (10) y adjuntar a la versión 1.5.1 en ASC.
- Decidir si se commitea `xcodecloud/manifest.json` (setup Xcode Cloud).
- Renovación RC 22/11: verificar primer webhook real.
