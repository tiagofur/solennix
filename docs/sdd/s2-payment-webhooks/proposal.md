# Proposal: S2 — Remediación de Webhooks de Pago

> Fuente: `docs/audit-backend-0609.md` (C2, C3, C4, M3, M8, M10, BAJO PRODUCT_CHANGE).
> Exploración engram `sdd/s2-payment-webhooks/explore` no accesible en este contexto (tools Engram no disponibles); propuesta anclada al audit + lectura de `subscription_handler.go` y `subscription_repo.go`.

## Intent

Los webhooks de pago no garantizan procesamiento exacto-una-vez ni sincronización completa de `users.plan`. Riesgos de negocio activos:

- **Doble-grant (C2):** reintentos/replay de Stripe y RevenueCat re-ejecutan grants de entitlement + correos. Sin idempotencia.
- **Plan desincronizado (C3):** `past_due → active` no llama `UpdatePlanByStripeCustomerID`; el usuario queda en `basic` y pierde features Pro pese a pagar.
- **Downgrade Business→Pro nunca baja (C4):** cambio de tier mid-cycle en el portal de Stripe deja `plan="business"` → acceso gratis a features Business.
- **Cancelación cruza providers (M8):** `UpdateStatusByUserID` cancela TODAS las subs del usuario; un evento RC apaga una sub Stripe activa (o viceversa).
- **Memory leak (M10):** `stripeSubCache` global crece sin GC.
- **PRODUCT_CHANGE inerte (BAJO):** RC `PRODUCT_CHANGE` no toca plan/sub → estado stale tras upgrade/downgrade mobile.

## Scope

### In Scope

- **Migración 059** `processed_webhook_events` (`provider`, `event_id`, `received_at`, PK/UNIQUE compuesto) + repo `ProcessedWebhookRepo.TryInsert` (insert-or-skip atómico).
- **Gate de idempotencia** al inicio de `StripeWebhook` (clave: `event.ID`) y `RevenueCatWebhook` (clave derivada, ver Decisiones) → si ya procesado, `200 OK` y salir.
- **C3:** en rama `Active` de `customer.subscription.updated`, actualizar `users.plan` (no solo `subscriptions`).
- **C4:** detectar cambio de tier vía `sub.Metadata["plan"]` en `customer.subscription.updated` y sincronizar `users.plan` + entitlement RC.
- **M8:** `UpdateStatusByUserID` → filtrar por provider (cambio de firma de interfaz; añadir `provider` al `WHERE`).
- **M10:** goroutine sweeper para `stripeSubCache` por TTL, con lifecycle start/stop para tests (no leak en suites).
- **PRODUCT_CHANGE (RC):** tratar como RENEWAL (re-sincronizar plan + upsert sub con producto nuevo).
- **Co-mutación transaccional** de `users.plan` + `subscriptions` en una sola tx por cada transición de plan.

### Out of Scope (deferred)

- **Resolución multi-provider de `users.plan`** (provider activo de mayor tier gana): se documenta el modelo, no se codea. Requiere diseño dedicado de prioridad de providers.
- **M3 HMAC para RevenueCat:** RC NO soporta HMAC en webhooks (solo secreto en header `Authorization`). Solo **mitigación operativa documentada** (rotación de secreto, allowlist de IPs, TLS) — no se codea verificación HMAC.

## Capabilities

### New Capabilities
- `webhook-idempotency`: garantía exacta-una-vez para webhooks de pago (Stripe + RevenueCat) vía tabla persistente.

### Modified Capabilities
- `subscription-plan-sync`: `users.plan` se sincroniza en toda transición (active recovery, tier change, product change) de forma atómica con `subscriptions`, filtrada por provider.

## Approach

Tabla de idempotencia persistente (**Approach A**) como gate de entrada en ambos webhooks: el primer `TryInsert(provider, eventID)` que gana procesa; los duplicados retornan `200 OK` sin efecto. La sincronización de plan pasa a ser **atómica** (`users.plan` + `subscriptions` en la misma tx) y **provider-aware** (M8). El cache de Stripe gana un sweeper con ciclo de vida controlable.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `internal/database/migrations/059_*` | New | tabla `processed_webhook_events` |
| `internal/repository/processed_webhook_repo.go` | New | `TryInsert` insert-or-skip |
| `internal/repository/subscription_repo.go` | Modified | `UpdateStatusByUserID` filtra por provider (M8); helper tx co-mutación |
| `internal/handlers/subscription_handler.go` | Modified | gates idempotencia; C3/C4 sync; PRODUCT_CHANGE; sweeper M10 |

## Decisiones arquitectónicas

| Decisión | Elegida | Tradeoff |
|----------|---------|----------|
| Idempotencia | **A: tabla persistente** | Sobrevive reinicios y multi-instancia. Costo: 1 migración + 1 INSERT por evento. Alternativas descartadas: cache en memoria (no multi-instancia, se pierde al reiniciar), dedupe en Redis (infra extra no presente). |
| Clave RC | `revenuecat:{event.id}` si el payload trae `id`; fallback `revenuecat:{app_user_id}:{type}:{event_timestamp_ms}` | RC v2 incluye `id` de evento — usarlo. El fallback compuesto evita falsos duplicados pero depende de estabilidad de timestamp (riesgo, ver Risks). |
| Límite transaccional | tx envuelve SOLO mutaciones de DB (`users.plan` + `subscriptions` + `TryInsert`). RC entitlement, emails y llamadas a Stripe API quedan FUERA de la tx (fire-and-forget, post-commit) | Evita tx largas/bloqueantes por I/O externo. Costo: entitlement RC puede divergir transitoriamente si falla post-commit (mitigado por reconciliación futura). |

## Slicing / entrega (>400 líneas → PRs encadenados)

| PR | Contenido | Líneas est. | Boundary |
|----|-----------|-------------|----------|
| **PR-1** | Infra idempotencia: migración 059 + `processed_webhook_repo` + gates en ambos webhooks | ~180 | Autónomo; webhooks ya no doble-procesan |
| **PR-2** | Sync de plan: C3 + C4 + co-mutación tx + M8 (firma provider-aware) | ~220 | Depende de PR-1; transiciones de plan correctas y atómicas |
| **PR-3** | Housekeeping: M10 sweeper (con stop) + PRODUCT_CHANGE como RENEWAL | ~120 | Depende de PR-1; limpieza y paridad RC |

Total est. ~520 líneas → 3 PRs encadenados (cada uno <400). `Chained PRs recommended: Yes`.

## Success Criteria

- [ ] Reintento/replay de un webhook (mismo `event.ID`) NO re-ejecuta grants ni correos (C2).
- [ ] `past_due → active` deja `users.plan` en el tier correcto (C3).
- [ ] Cambio de tier Business→Pro en portal Stripe baja `users.plan` y entitlement (C4).
- [ ] Evento RC de un provider NO cancela subs de otro provider (M8).
- [ ] `stripeSubCache` no crece sin límite; sweeper se detiene en teardown de tests (M10).
- [ ] RC `PRODUCT_CHANGE` re-sincroniza plan + sub (BAJO).
- [ ] `users.plan` y `subscriptions` nunca divergen tras una transición (atomicidad).

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Orden de eventos (out-of-order delivery) | Med | Usar `current_period_end`/timestamp como guardia; no degradar plan con evento más viejo que el último aplicado |
| Estado multi-provider ambiguo | Med | Deferred a diseño dedicado; PR actual filtra por provider para no apagar otros (M8) |
| Estabilidad de hash/clave RC (fallback) | Med | Preferir `event.id`; documentar fallback; aceptar reproceso raro antes que skip incorrecto |
| Atomicidad parcial (DB commit ok, RC entitlement falla) | Low | Mutaciones DB en tx; efectos externos post-commit con log de error para reconciliación |

## Rollback Plan

- PR-3/PR-2 revertibles por revert de commit (sin cambios de schema destructivos).
- PR-1: `059_*.down.sql` hace `DROP TABLE processed_webhook_events`. Revertir el revert de schema solo si no hay dependencias en vuelo. Los gates degradan a comportamiento previo (procesar siempre) si la tabla no existe — fail-open consciente solo durante rollback.

## Dependencies

- Ninguna externa nueva. Reusa `pgx` pool, `models.Subscription`, `rcService`, `emailService` ya presentes.
