# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Issue:** #834 — fix(android): Upcoming widget UTC date('now') and missing QUOTED events
- **Estado:** done (pendiente PR)
- **Branch:** `fix/android-upcoming-widget-utc-quoted-834`

## Root cause
`EventDao.getUpcomingEvents` usaba SQLite `date('now')` (UTC) como lower bound de fecha. En LATAM (UTC-6), `date('now')` salta al día siguiente a las 18:00 local → eventos de hoy desaparecen del widget "Próximos Eventos" y del dashboard upcoming list.

## Cambios
- **EventDao:** reemplazado `date('now')` por parámetro `:today` en ambas sobrecargas de `getUpcomingEvents`. El caller pasa `LocalDate.now().toString()` (fecha local).
- **EventRepository:** `getUpcomingEvents(limit, today)` con default `today = LocalDate.now().toString()`.
- **UpcomingEventsWidget:** pasa `today = LocalDate.now().toString()` explícito con comentario de por qué (paridad iOS `Calendar.current.startOfDay`).

## Decisión de scope
- El issue mencionaba "missing QUOTED events" pero iOS actual (`WidgetSyncCoordinator.swift:139`) filtra confirmed-only también. Se mantiene CONFIRMED para paridad con iOS. El bug real y verificable era el UTC.

## Verificación
- `:feature:dashboard:testDebugUnitTest`: verde
- `assembleDebug`: APK generado OK
- `./init.sh`: verde

## Bloqueos
- Ninguno.
