---
tags:
  - dashboard
  - solennix
aliases:
  - Dashboard
  - Hub
  - Inicio
status: active
verified: 2026-11-10

---

# 🏛️ Solennix — Dashboard Ejecutivo

> [!tip] Punto de entrada diario
> Vista de 30 segundos del estado del producto. Para detalle vivo, ir a las fuentes canónicas.

**4 plataformas en producción:** iOS (App Store MX) · Android (Play Store) · Web (`solennix.com`) · Backend (`api.solennix.com`).

---

## 📊 Fuentes canónicas de estado (leer estas, no este dashboard)

- 📊 **[[PRD/11_CURRENT_STATUS|Estado Actual detallado]]** — fuente viva, actualizada continuamente
- 📅 **[[PRD/09_ROADMAP|Roadmap Maestro]]** — timeline cross-platform
- 💰 **[[PRD/04_MONETIZATION|Tiers + Monetización]]**
- 🏗️ [`AGENTS.md`](../AGENTS.md) — reglas normativas para agentes (router)

> [!important] Dónde está la verdad
> `PRD/11_CURRENT_STATUS.md` es la fuente única y actualizada de estado del producto. Este dashboard es solo un índice de navegación — cualquier métrica concreta (versión, coverage, gaps) vive en PRD/11, no acá.

---

## 🧭 Navegación por área

> [!info] MOCs por plataforma
> - 🍏 [[iOS/iOS MOC|iOS]] · 🤖 [[Android/Android MOC|Android]] · 🌐 [[Web/Web MOC|Web]] · ⚙️ [[Backend/Backend MOC|Backend]]
> - 📋 [[PRD/PRD MOC|Producto (PRD)]] · 📣 [[Marketing/MOC|Marketing]] · 🎬 [[Marketing/videos/MOC|Videos]]

---

## 🔮 Próximo foco de trabajo

Definido por el roadmap vivo en [[PRD/09_ROADMAP]] y las GitHub Issues con DoR (fuente: `docs/factory/human-start.md`). `feature_list.json` (raíz del repo) es **solo contexto de capacidades, no cola operativa**.

### 🔴 Bloqueantes que dependen del usuario

> [!warning] Acciones en dashboards externos (no de código)
> - **Stripe Dashboard** — prices Pro $149 / Business $499 MXN + webhook + secrets en VPS.
> - **App Store Connect** / **Google Play Console** — subscriptions + nuevos SKU para precios vigentes.
> - **RevenueCat Dashboard** — entitlement `pro_access` + offerings + webhook + SKU nuevos.
> - **Resend** — dominio verificado + DKIM/SPF + API key.
>
> Checklist keys: [[PRD/04_MONETIZATION#9. Keys y secrets — no confundir]]

---

## 📚 Archivo histórico

Los trackers, audits y planes cerrados (Portal Cliente, Personal, Calendar parity, Dashboard refactor, SUPER_PLAN de 12 semanas, etc.) se preservan en **[[_archive|docs/_archive/]]** como registro histórico. No están activos — la verdad actual vive en PRD/11 y PRD/09.

---

#dashboard #solennix
