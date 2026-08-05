---
tags:
  - prd
  - estado
  - paridad
  - solennix
aliases:
  - Estado Actual
  - Current Status
date: 2026-03-20
updated: 2026-08-05
status: active
---

# Estado Actual del Proyecto — Solennix

> [!important] Snapshot vivo (no changelog)
> Este documento es un **resumen operativo**. Historial largo de implementación: `docs/_archive/prd-history/11_CURRENT_STATUS_full_2026-08.md`. Releases: `CHANGELOG.md` + `versioning/releases.json`.

## Decisión de producto (inmutable)

**Solennix NO intermedia pagos entre organizadores y sus clientes.**

- Los "pagos" en la app son **registros manuales** del organizador (tracking interno).
- No hay Stripe (ni otro PSP) para que clientes paguen al organizador dentro de la plataforma.
- No se generan facturas fiscales.
- **Stripe / App Store / Play / RevenueCat** = solo suscripción del organizador a Solennix (B2B).
- Reportes de transferencia (`payment_submissions`) = el cliente declara un pago externo; Solennix no mueve dinero.

## Versiones publicadas

Fuente canónica: `versioning/releases.json` (actualizar ese archivo, no copiar números acá a ciegas).

| Componente | Versión (manifest) | Estado |
| :--- | :--- | :--- |
| iOS | 1.4.0 (build 9) | App Store MX |
| Android | 1.4.0 (versionCode 10) | Google Play |
| Web | 1.0.1 | solennix.com |
| Backend | 1.0.4 | api.solennix.com |

## Qué está en producción (núcleo)

| Área | Backend | Web | iOS | Android |
| :--- | :---: | :---: | :---: | :---: |
| Auth (email + Google/Apple) | ✅ | ✅ | ✅ | ✅ |
| Eventos / clientes / productos / inventario | ✅ | ✅ | ✅ | ✅ |
| Pagos (registro manual) + portal cliente | ✅ | ✅ | ✅ | ✅ |
| Staff / equipos / portal team member | ✅ | ✅ | ✅ | ✅ |
| Suscripciones Gratis/Pro/Business | ✅ | ✅ | ✅ | ✅ |
| i18n ES/EN | ✅ | ✅ | ✅ | ✅ |
| PDF server-side (Go) | ✅ | ✅ (consumo) | ⚠️ paridad | ⚠️ paridad |
| Perfil público `/u/:slug` | ✅ | ✅ | ⚠️ UI | ⚠️ UI |
| Solicitudes unificadas (inbound) | ✅ | ✅ | ✅ | ✅ |
| Directorio / geo search | ✅ | ✅ | — | — |

Leyenda: ✅ shipped · ⚠️ gap / parcial · — no aplica o no prioritario

## Foco reciente (2026-07 → 2026-08)

1. **Unificación Solicitudes** — un dominio `PublicRequest` + links; eliminados `EventFormLink` / `PublicLead` legados. Spec: `openspec/changes/unify-solicitudes-forms/`.
2. **Perfil profesional público** (#787) — web + backend; UI móvil de settings/perfil pendiente de paridad completa.
3. **v2 inbound** — directorio, geo, inbox, anti-spam, conversion CTAs. Norte: [[15_MARKETPLACE_V2]].
4. **Analytics product** — slices admin (DAU/WAU/MAU, funnel registro, page views).

## Gaps abiertos (prioridad)

| Gap | Notas |
| :--- | :--- |
| Paridad móvil del perfil público / directorio | Backend+web adelante; iOS/Android settings y discovery |
| Captcha real (Turnstile) en leads públicos | Honeypot + rate-limit son el piso |
| Paridad total de PDFs client vs server | Backend genera; clientes aún pueden tener generadores locales residuales — ver [[20_SERVER_SIDE_PDF_GENERATION]] |
| Keys externos de monetización | Stripe prices, RevenueCat, stores, Resend — checklist en [[04_MONETIZATION]] |
| Inbox solicitudes: paginación UI / badges | Mejoras UX post-S14 |

## Dónde NO documentar

| Evitar | Usar en su lugar |
| :--- | :--- |
| Append de cada PR a este archivo | `CHANGELOG.md` / `versioning/releases.json` / commit |
| Diario de sprint | `progress/current.md` → `progress/history.md` |
| Spec de un cambio grande | `openspec/changes/<name>/` |
| Arquitectura de capas | `docs/{plataforma}/Arquitectura General.md` |

## Enlaces canónicos

- Roadmap forward → [[09_ROADMAP]]
- Features / paridad / gates runtime → [[02_FEATURES]] (v2.0)
- v2 discovery & inbound → [[15_MARKETPLACE_V2]]
- MOCs plataforma → [[../iOS/iOS MOC|iOS]] · [[../Android/Android MOC|Android]] · [[../Web/Web MOC|Web]] · [[../Backend/Backend MOC|Backend]]
- Histórico completo de este status → `docs/_archive/prd-history/11_CURRENT_STATUS_full_2026-08.md`
