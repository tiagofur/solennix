---
tags:
  - status
  - android
  - solennix
type: status
status: active
date: 2026-04-29
updated: 2026-05-12
---

# 🟢 Android — Estado Plataforma

**Última actualización:** 2026-05-12

> [!info] Fuente viva de estado
> Este documento se actualiza cada vez que hay cambios significativos en la plataforma Android.

## Estado general

Android está estable en producción a nivel funcional (MVP + features core + suscripciones), con foco actual en calidad de tests y hardening incremental.

### Snapshot técnico

- Arquitectura multi-módulo MVVM activa y estable.
- Play Billing, SSO, SSL pinning y offline sync disponibles.
- Riesgo principal actual: superficie sin tests en 15 módulos.

### Baseline de calidad (medido)

- 56 tests unitarios totales (debug+release).
- 0 failures, 0 errors, 0 skipped.
- 4/19 módulos Android con tests.
- Sin `androidTest` detectados.
- Detalle completo en [[Testing]].

## Play Store

- **Versión actual:** 1.2.0 (versionCode 6)
- **Status:** ✅ Activo
- **Últimas novedades:** baseline de testing y estrategia de hardening documentadas

## Cambios recientes

- Se consolidó baseline real de tests Android desde reportes JUnit.
- Se documentó matriz de gaps por módulo (4 con tests, 15 sin tests).
- Se actualizó el roadmap con plan incremental en 4 fases.

## Bloqueantes

No hay bloqueantes de release inmediatos.

Riesgos activos de calidad:

1. Falta de tests en módulos críticos (`feature/auth`, `core/database`, `core/model`).
2. Ausencia de smoke tests instrumentados (`androidTest`).
3. Sin gate de cobertura por módulo en CI.

## Próximas prioridades

1. Ejecutar Fase 1 de hardening: `core/model`, `core/database`, `feature/auth`.
2. Ejecutar Fase 2: `feature/clients`, `feature/products`, `feature/inventory`.
3. Introducir smoke `androidTest` + gate de calidad gradual en CI.

---

**Nota:** Para arquitectura de Android, ver [[Arquitectura General]].
**Nota:** Para ejecución de calidad incremental, ver [[Roadmap Android]] y [[Testing]].

Relacionado: [[../00_DASHBOARD|← Dashboard ejecutivo]]
