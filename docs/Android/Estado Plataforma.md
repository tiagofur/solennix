---
tags:
  - status
  - android
  - solennix
type: status
status: active
date: 2026-04-29
updated: 2026-08-05
---

# 🟢 Android — Estado Plataforma

**Última actualización:** 2026-08-05

> [!info] Fuentes de verdad
> - Estado producto cross-platform: [[../PRD/11_CURRENT_STATUS]]
> - Versión publicada: `versioning/releases.json` (no duplicar números aquí)
> - Detalle de tests: [[Testing]]

## Estado general

Android está en producción (MVP + features core + suscripciones + solicitudes). Paridad con iOS en releases móviles; gaps conocidos de v2 (perfil público / directorio) viven en el status PRD.

### Snapshot técnico

- Arquitectura multi-módulo MVVM activa y estable.
- Play Billing, SSO, SSL pinning y offline sync disponibles.
- Calidad: suites JVM por módulo + instrumentados smoke; ver [[Testing]] para conteos actuales (no fijar números en este doc).

## Play Store

- **Versión:** ver `versioning/releases.json` → `currentVersions.android`
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
