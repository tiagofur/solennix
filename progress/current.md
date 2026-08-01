# Sesión Ativa — Solennix Agent Progress

## Estado actual

### v2.0 — Discovery & Inbound Layer (planeamiento completo, sin código todavía)

Sesión de **planeamiento estratégico + creación de backlog**. NG1 ratificado (no marketplace). v2.0 = inbound tooling del proveedor.

**Resumen del encuadre (2026-07-31):**
- **NG1 se mantiene íntegro.** No somos marketplace, no conectamos dos lados del mercado.
- v2.0 añade al SaaS del proveedor: directorio `/proveedores`, perfil público indexable, solicitudes de cotización estructuradas.
- **No hay cuenta de cliente, no hay pay-per-lead, no hay intermediación de pagos.**
- Objetivo: ser la referencia en LATAM para contratar servicios de eventos vía inbound orgánico del proveedor.

### Documentación escrita/actualizada
- ✅ `docs/PRD/15_MARKETPLACE_V2.md` — PRD formal v2.0 (11 secciones, NG1 ratificado).
- ✅ `docs/PRD/01_PRODUCT_VISION.md` — NG1 restaurado + nota aclaratoria.
- ✅ `docs/PRD/09_ROADMAP.md` — Sprint 12-16 mapeados a fases, tabla con issues.

### GitHub — Milestone `Solennix v2.0 — Discovery & Connection Layer` (#1)
**20 issues abiertos + 2 cerrados** (los 2 cerrados eran inconsistentes con NG1):

| Sprint | Fase | Issues | Alcance |
| --- | --- | --- | --- |
| **S12** | F0 | #1112, #1113 | Decisiones fundacionales (ToS reforzado + monetización confirmada) |
| **S13** | F1 | #1115, #1116, #1117, #1118, #1119, #1120 | Foundation backend + web (directorio + solicitudes + SEO + sharing) |
| **S14** | F2 | #1121, #1122, #1123, #1124, #1125, #1126 | Provider Mobile Parity (inbox + push + responder + UI PublicProfile iOS/Android) |
| **S15** | F3 | #1127, #1128, #1129, #1130, #1131 | Discovery Polish (geo + filtros + featured ranking + moderación + analytics) |
| **S16** | F4 | #1132 | PWA + polish (opcional) |

**Cerrados (inconsistentes con NG1):** #1111 (levantar NG1), #1114 (account_type — construiría lado cliente).

**Cadena de dependencias:**
- S13 ← S12 (ToS antes de producción de F1).
- S14 ← S13 (mobile consume F1 endpoints).
- S15 ← S13 (geo en paralelo a S14 posible si hay manos).
- S16 ← S13 completo (PWA empaqueta el flujo F1-F3).

### Pendientes
- Commitear los cambios de docs (PRD v2.0 + vision + roadmap + este archivo).
- Issues están en `status:ready` — esperan revisión y `status:approved` del maintainer antes de empezar.
- Issue #1112 (ToS reforzado) conviene revisión con abogado antes de producción de F1.

## Siguiente tarea — orden recomendado de ejecución

**Sprint 12 (F0) — paralelo, sin código:**
- #1112 (ToS reforzado) → revisar con abogado.
- #1113 (monetización docs) → extender `04_MONETIZATION.md`.

**Sprint 13 (F1) — el primero con código, orden interno:**
1. #1115 (PublicRequest + PublicResponse) — fundación del flujo.
2. #1116 (GET /api/public/organizers con filtros) — depende de #1115.
3. #1117 (página /proveedores web) — depende de #1116.
4. #1118 (form solicitud en /u/:slug) — depende de #1115, #1112.
5. #1120 (criterio publicable + sharing fácil) — depende de #1116, #787.
6. #1119 (SEO sitemap + schema.org) — depende de #1116, #1117.

**Sprint 14 (F2) — después de S13 en verde:**
- #1121 (backend inbox) → #1122/#1123 (iOS/Android inbox) → #1124 (push) → #1125 (responder móvil) → #1126 (UI PublicProfile, deuda #1102).

**Sprint 15 (F3)** y **Sprint 16 (F4)** — condicionados a métricas de S13/S14 (PRD §9).

## Notas de contexto
- El PR actual (#1102, branch `feat/public-profile-settings-polish`) sigue abierto con cambios de portfolio/packages/is_featured. No se tocó código en esta sesión.
- v2.0 es **aditivo y reversible** por sprint. Ningún sprint debe romper las apps existentes.
- **Lección de la sesión:** la primera formulación levantaba NG1. El usuario corrigió: mantener las decisiones originales. v2.0 se reformuló como inbound tooling del proveedor. Cualquier feature que construya un "lado cliente" (cuenta de cliente, account_type, pay-per-lead, comisión) queda **explícitamente descartada para v2.0** y postergada a v3.0 si se decide levantar NG1 con eyes wide open.
- **Driver de monetización de v2.0:** featured ranking (#1129) + listings destacados Business. Sin pay-per-lead. La economía funciona SI y SOLO SI los proveedores comparten su `/u/:slug` activamente (CAC ~$0).
