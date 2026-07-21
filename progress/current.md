# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Tarea:** Corrrección de rastreo de plataforma de registro para Mobile (Unknown -> iOS/Android/Web) y retroactivo para usuarios existentes.
- **Estado:** Implementado y verificado cross-platform (iOS, Android, Web, Backend + Migración 064).
- **Branch:** `fix/android-search-appbar-1021`

## Resumen
- **iOS (`APIClient.swift`)**: Se agregó el header `X-Client-Platform: ios` en todas las peticiones salientes.
- **Android (`KtorClient.kt`)**: Se configuró `X-Client-Platform: android` en `defaultRequest`.
- **Web (`web/src/lib/api.ts`)**: Se agregó `X-Client-Platform: web` en los headers por defecto.
- **Backend (`auth_handler.go` & `user_repo.go`)**: Se incluyó `registration_platform` en la creación de usuarios via OAuth (Google / Apple) y `CreateWithOAuth`.
- **Backend Middleware (`auth.go`) & Repo (`user_repo.go`)**: Se actualizó `ActivityTracker` para que actualice retroactivamente la plataforma en la siguiente interacción de usuarios cuyo `registration_platform` sea `'unknown'` o vacío.
- **Migración DB (`064_backfill_unknown_registration_platforms.up.sql`)**: Inferencia e ingesta directa de plataforma para usuarios `'unknown'` basada en `device_tokens` y `user_platforms`.

## Últimas sesiones cerradas
- #855 feat(android): widget font scaling — PR #1016 merged (872b5f78).
- #853 feat(android): TalkBack audit — PR #1017 abierto, CI verde.
- #902 fix(backend): i18n writePlanLimitError + dashboard errors — PR #1012 merged.
- #904 feat(backend): start_date/end_date aliases en GET /events — PR #1013 merged.
- #890 epic security hardening — cerrado (18 sub-issues backend + 9 deps client-side todos CLOSED).
- #1014 fix(backend): staff handler i18n (71 strings) — PR #1015 merged.

## Bloqueos
- Ninguno.
