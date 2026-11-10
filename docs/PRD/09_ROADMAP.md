---
tags:
  - prd
  - roadmap
  - timeline
  - solennix
aliases:
  - Roadmap
  - Timeline
date: 2026-03-20
updated: 2026-11-10
status: active
verified: 2026-11-10

---

# Roadmap

> [!tip] Documentos relacionados
>
> - [[PRD MOC]] — índice del PRD
> - [[11_CURRENT_STATUS|Estado Actual]] — snapshot de qué hay hoy
> - [[02_FEATURES|Features]] — catálogo y paridad
> - [[15_MARKETPLACE_V2|v2.0 Discovery & Inbound]] — norte de producto post-core
> - Histórico de sprints 2026-Q2 → `docs/_archive/prd-history/09_ROADMAP_full_2026-07.md`
> - SUPER_PLAN (12 semanas, cerrado) → `docs/_archive/SUPER_PLAN/`

---

## Estado de producción

| Componente | Canal | Notas |
| :--- | :--- | :--- |
| iOS | App Store MX | Versión en `versioning/releases.json` |
| Android | Google Play | Pareada con iOS en releases móviles |
| Web | solennix.com | React 19 SPA |
| Backend | api.solennix.com | Go + PostgreSQL |

No copiar números de versión aquí: el manifest es la fuente de verdad.

---

## Now (activo)

Trabajo que **ya está en vuelo** o es el siguiente slice natural. GitHub Issues es la única cola operativa; el estado de sesión vive en `progress/current.md`.

1. **Business plan — Fases 2 y 3** (#1350 cerró Fase 1: staff seats, asistencia, P&L, export contable). Desglosar en issues.
2. **Fix #1303** — logIn/sync de identidad RevenueCat en Android (paridad móvil).
3. **Bug cron de review-emails** — cadencia/scope de emails programados.
4. **Monetización operativa** — SKU nuevos en RevenueCat + ASC/Play para precios $149/$499; keys/secrets en dashboards externos (Stripe, stores, Resend). Ver [[04_MONETIZATION]].
5. **Release train iOS** — siguiente bump post-1.5.1 (estado ASC en `progress/current.md`).

---

## Next (planificado, no en construcción día a día)

| Tema | Documento / notas |
| :--- | :--- |
| Paridad móvil perfil público + v2 inbound restante | [[15_MARKETPLACE_V2]] — **no es marketplace**; NG1 intacto |
| Experiencia cliente (ideas A–G / A–L) | [[14_CLIENT_EXPERIENCE_IDEAS]], [[12_CLIENT_TRANSPARENCY_AND_DELIGHT]] — priorizar solo si no compiten con Now |
| Paridad PDF / plantillas de contrato | [[20_SERVER_SIDE_PDF_GENERATION]] |
| i18n governance (post-epic) | [[19_I18N_STRATEGY]] |

---

## Later / no-goals

- **Intermediar pagos** organizador↔cliente o facturación fiscal — **prohibido** (decisión 2026-05-01). Ver [[11_CURRENT_STATUS]].
- Marketplace two-sided donde Solennix cobrare comisión por match — **fuera de v2** (reformulado en [[15_MARKETPLACE_V2]]).
- Reabrir el SUPER_PLAN de 12 semanas como plan activo — histórico en `_archive`.

---

## Cómo mantener este archivo

1. **Solo forward:** Now / Next / Later. Sin sprint diary.
2. Al cerrar un tema de Now → una línea en [[11_CURRENT_STATUS]] (snapshot) + release notes si aplica.
3. Cambios grandes → GitHub Issue con DoR (factory), no append aquí.
4. Si necesitás el diario de sprints abr–jul 2026 → archivo en `docs/_archive/prd-history/`.
