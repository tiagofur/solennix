# Tasks — S2 Payment Webhooks

Artifact store: file-based (engram unavailable this session).
Delivery: 3 chained PRs, stacked-to-main.
Design/decisions: see `proposal.md` in this folder and `docs/audit-backend-0609.md` (C2, C3, C4, M3, M8, M10, PRODUCT_CHANGE).

## PR-1 — Idempotency infrastructure (~180 lines)

- [ ] Migration `059_create_processed_webhook_events.up.sql` + `.down.sql`
  - Table: `id UUID PK default gen_random_uuid()`, `event_id TEXT NOT NULL`, `provider VARCHAR(50)`, `event_type TEXT`, `processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `UNIQUE(event_id)`, index on `processed_at`.
- [ ] `repository/processed_webhook_repo.go`: `ProcessedWebhookRepo.TryInsert(ctx, eventID, provider, eventType) (bool, error)` — `INSERT ... ON CONFLICT (event_id) DO NOTHING`; return `RowsAffected() > 0`.
- [ ] Wire `ProcessedWebhookRepository` into `SubscriptionHandler` struct + `user_repository.go` interface + constructor + `cmd/server/main.go`.
- [ ] `StripeWebhook`: after `ConstructEvent`, gate on `TryInsert(event.ID, "stripe", string(event.Type))`; duplicate → 200 + return.
- [ ] `RevenueCatWebhook`: derive key (`revenuecat:{event.id}` or fallback hash) and gate.
- [ ] Integration test: duplicate `event_id` is skipped; first insert returns true, second false.
- [ ] `go build ./...`, `go vet ./...`, targeted tests green.

## PR-2 — Plan synchronization (~220 lines)

- [ ] C3: in `customer.subscription.updated` `Active` branch, call `UpdatePlanByStripeCustomerID` with plan from `sub.Metadata["plan"]`.
- [ ] C4: compare `sub.Metadata["plan"]` vs stored plan; sync `users.plan` + `subscriptions.plan` on tier change.
- [ ] Add `UpdateStatusAndPlanByProviderSubID` (or extend) repo method.
- [ ] M8: rename `UpdateStatusByUserID` → `UpdateStatusByUserIDAndProvider`, add `provider` filter; update interface + callers.
- [ ] Wrap `users.plan` + `subscriptions` co-mutation in a single tx; external effects (RC entitlement, email, Stripe API) post-commit.
- [ ] Monotonic guard against out-of-order events (by `current_period_end`/timestamp).
- [ ] Tests: past_due→active restores tier; Business→Pro downgrade; provider isolation.

## PR-3 — Housekeeping (~120 lines) + S2 release

- [ ] M10: `startStripeSubCacheSweeper(interval)` goroutine with stop channel/context for test lifecycle; call in constructor.
- [ ] PRODUCT_CHANGE: treat like RENEWAL (keep entitlement, upsert subscription with updated expiry).
- [ ] Tests: cache eviction; sweeper stops on teardown; PRODUCT_CHANGE re-syncs.
- [ ] Bump `backend/VERSION` → 1.0.2, add S2 entry to `versioning/releases.json`, regenerate `CHANGELOG.md`.

## Deferred (NOT in S2)

- Multi-provider `users.plan` resolution (highest active provider wins).
- M3 RevenueCat HMAC — unsupported by RevenueCat; operational mitigation only (strong secret ≠ JWT, rotation). Document in audit follow-up.
