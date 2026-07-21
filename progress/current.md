# Sesión Activa — Solennix Agent Progress

## Feature en curso
- **Tarea:** `user-cleanup-lifecycle` — Automatización de ciclo de vida para cuentas no confirmadas (60d) y cuentas Free inactivas (12m).
- **Estado:** Implementado, verificado al 100% y archivado SDD.
- **Branch:** `feat/1031-user-cleanup-lifecycle`

## Resumen
- **DB Migración (`065_add_user_cleanup_lifecycle.up.sql`)**: Agregado de columnas de rastreo de inactividad (`inactivity_stage`, `inactivity_warning_sent_at`) e índice de escaneo parcial (`idx_users_inactivity_cleanup`).
- **Modelo (`models.User`)**: Campos agregados al struct `User`.
- **Repositorio (`UserCleanupRepo` & `UserRepo`)**: Métodos de escaneo de candidatos por lote, stage updates y purga dura `HardDeleteUser`. Actualizado `UpdateLastActiveAt` para reseteo automático de advertencias ante actividad.
- **Servicio y Envíos de Correo (`UserCleanupService` & `EmailService`)**: Orquestador del ciclo de vida y plantillas de correo bilingües (`es`/`en`) para aviso de inactividad.
- **Worker en Segundo Plano (`cmd/server/main.go`)**: Cron goroutine ejecutada diariamente a las 03:00 UTC.
- **Pruebas (`user_cleanup_service_test.go`)**: Cobertura completa de pruebas unitarias verificadas con `go vet` y `go test`.

## Últimas sesiones cerradas
- #1029 fix(backend): correct mobile registration platform tracking and backfill unknown users — Branch `fix/1029-mobile-registration-platform-unknown`.
- #855 feat(android): widget font scaling — PR #1016 merged.
- #853 feat(android): TalkBack audit — PR #1017.

## Bloqueos
- Ninguno.

