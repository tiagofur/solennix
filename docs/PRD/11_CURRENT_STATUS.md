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
updated: 2026-11-10
status: active
verified: 2026-11-10

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
| iOS | 1.5.1 (build 10) | App Store MX |
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
| Portal asistente / secretaria (read-only) | ✅ | ✅ | ✅ | ✅ |
| Asistencia de staff (RSVP summary) | ✅ | ✅ | ✅ | ✅ |
| P&L por evento + exportación contable CSV (Pro+) | ✅ | ✅ | — | — |
| Suscripciones Gratis/Pro/Business ($149/$499 MXN) | ✅ | ✅ | ✅ | ✅ |
| i18n ES/EN | ✅ | ✅ | ✅ | ✅ |
| PDF server-side (Go) | ✅ | ✅ (consumo) | ⚠️ paridad | ⚠️ paridad |
| Perfil público `/u/:slug` | ✅ | ✅ | ⚠️ UI | ⚠️ UI |
| Solicitudes unificadas (inbound) | ✅ | ✅ | ✅ | ✅ |
| Directorio / geo search | ✅ | ✅ | — | — |

Leyenda: ✅ shipped · ⚠️ gap / parcial · — no aplica o no prioritario

## Foco reciente (2026-10 → 2026-11)

1. **Business plan Fase 1** (#1350, merged) — asientos de staff (Gratis 1 / Pro 5 / Business ∞), resumen de asistencia, P&L por evento, exportación contable CSV (Pro+).
2. **Épico Staff/Team completo** (#1364–#1374) — flujo de invitación, roles sugeridos, gating de rol asistente, portal read-only de secretaria en web+iOS+Android, pulido de paridad.
3. **Pricing relanzado** (#1382) — Pro $149/mes ($1.499/año), Business $499/mes ($4.999/año) MXN en landing y pricing.
4. **Release train iOS 1.5.1 (build 10)** (#1328/#1330) — feature flag de staff seats + fixes.
5. **Hardening backend** — fail-closed scoping, repair de tests rotos (#1372/#1371).

## Gaps abiertos (prioridad)

| Gap | Notas |
| :--- | :--- |
| LogIn RevenueCat en Android (#1303) | Sync de identidad RC — paridad móvil |
| Bug cron de review-emails | Scheduled emails revisar cadencia/scope |
| Business plan Fases 2 y 3 | Pendiente de desglose en issues |
| SKU/entitlement en RevenueCat + ASC | Config de producto para nueva tabla de precios |
| Paridad móvil del perfil público / directorio | Backend+web adelante; iOS/Android settings y discovery |
| Captcha real (Turnstile) en leads públicos | Honeypot + rate-limit son el piso |
| Paridad total de PDFs client vs server | Backend genera; clientes aún pueden tener generadores locales residuales — ver [[20_SERVER_SIDE_PDF_GENERATION]] |
| Keys externos de monetización | Stripe prices, RevenueCat, stores, Resend — checklist en [[04_MONETIZATION]] |

## Dónde NO documentar

| Evitar | Usar en su lugar |
| :--- | :--- |
| Append de cada PR a este archivo | `CHANGELOG.md` / `versioning/releases.json` / commit |
| Diario de sprint | `progress/current.md` + historial de git |
| Spec de un cambio grande | GitHub Issue + `odd/tasks/` (factory) |
| Arquitectura de capas | `docs/{plataforma}/Arquitectura General.md` |

## Enlaces canónicos

- Roadmap forward → [[09_ROADMAP]]
- Features / paridad / gates runtime → [[02_FEATURES]] (v2.0)
- v2 discovery & inbound → [[15_MARKETPLACE_V2]]
- MOCs plataforma → [[../iOS/iOS MOC|iOS]] · [[../Android/Android MOC|Android]] · [[../Web/Web MOC|Web]] · [[../Backend/Backend MOC|Backend]]
- Histórico completo de este status → `docs/_archive/prd-history/11_CURRENT_STATUS_full_2026-08.md`
