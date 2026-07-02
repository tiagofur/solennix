---
tags:
  - status
  - android
  - solennix
type: status
status: active
date: 2026-04-29
updated: 2026-05-13
---

# 🟢 Android — Estado Plataforma

**Última actualización:** 2026-05-13

> [!info] Fuente viva de estado
> Este documento se actualiza cada vez que hay cambios significativos en la plataforma Android.

## Estado general

Android está estable en producción a nivel funcional (MVP + features core + suscripciones), con foco actual en calidad de tests y hardening incremental.

### Snapshot técnico

- Arquitectura multi-módulo MVVM activa y estable.
- Play Billing, SSO, SSL pinning y offline sync disponibles.
- Riesgo principal actual: `baselineprofile` está cubierto solo en instrumentado (sin suite JVM) y falta gate de ejecución performance en CI.

### Baseline de calidad (medido)

- 88 tests unitarios debug.
- 0 failures, 0 errors, 0 skipped.
- 18/19 módulos Android con suites JVM (`src/test`/`src/androidTest`) + 1 módulo macrobenchmark instrumentado (`baselineprofile`).
- 2 smoke tests instrumentados (`androidTest`) en verde (auth + dashboard).
- Detalle completo en [[Testing]].

## Play Store

- **Versión actual:** 1.2.0 (versionCode 6)
- **Status:** ✅ Activo
- **Últimas novedades:** Fase 4.5 completada con gate de cobertura expandido a 13 módulos

## Cambios recientes

- Se ejecutó baseline de tests debug en 18 módulos con resultado verde.
- Se completaron Fase 1 y Fase 2 del plan incremental de hardening.
- Se completó Fase 3 con smoke `androidTest` conectados en emulador.
- Se completó Fase 4.1 con gate de cobertura por módulo en CI (`core/model`, `core/database`, `feature/auth`).
- Se completó Fase 4.2 con expansión del gate a `feature/clients`, `feature/products`, `feature/inventory`.
- Se completó Fase 4.3 con subida gradual de thresholds por módulo y validación verde del comando completo en local.
- Se completó Fase 4.4 con expansión del gate a `feature/search`, `feature/payments`, `feature/settings`, `feature/calendar`.
- Se completó Fase 4.5 con expansión del gate a `app`, `core:designsystem`, `widget`.
- Se agregó compile gate de `baselineprofile` en CI (`:baselineprofile:compileNonMinifiedReleaseKotlin`).
- Se agregó workflow dedicado para `baselineprofile` macrobenchmark (`.github/workflows/android-baselineprofile.yml`, manual + nocturno).
- Se agregó threshold automático de startup median/p50 en el workflow (`STARTUP_P50_THRESHOLD_MS`, default 1800ms).

## Bloqueantes

No hay bloqueantes de release inmediatos.

Riesgos activos de calidad:

1. `baselineprofile` no tiene suite JVM (solo macrobenchmark/instrumentado).
2. Falta calibrar umbral de startup con serie histórica para reducir falsos positivos.

## Próximas prioridades

1. Calibrar y versionar threshold de startup (`STARTUP_P50_THRESHOLD_MS`) con histórico CI.
2. Expandir smoke instrumentados a 1 flujo más (search o settings).

---

**Nota:** Para arquitectura de Android, ver [[Arquitectura General]].
**Nota:** Para ejecución de calidad incremental, ver [[../PRD/09_ROADMAP|Roadmap maestro]] y [[Testing]].

Relacionado: [[../00_DASHBOARD|← Dashboard ejecutivo]]
