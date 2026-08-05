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
updated: 2026-08-05
status: active
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

Trabajo que **ya está en vuelo** o es el siguiente slice natural. Detalle de sesión: `progress/current.md`. Specs: `openspec/changes/`.

1. **Cerrar v2 inbound / solicitudes** — geo search, directorio, inbox, anti-spam, funnel visitante, paridad móvil restante.
2. **Perfil público móvil** — settings + superficies que faltan en iOS/Android respecto a web.
3. **Calidad de admin / analytics** — fidelidad de métricas y funnel de registro (slices product analytics).
4. **Monetización operativa** — completar keys/secrets en dashboards externos (Stripe, stores, RevenueCat, Resend). Ver [[04_MONETIZATION]].

---

## Next (planificado, no en construcción día a día)

| Tema | Documento / notas |
| :--- | :--- |
| Discovery layer v2 (directorio, SEO, inbound) | [[15_MARKETPLACE_V2]] — **no es marketplace**; NG1 intacto |
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
3. Specs de cambio grande → `openspec/`, no append aquí.
4. Si necesitás el diario de sprints abr–jul 2026 → archivo en `docs/_archive/prd-history/`.
