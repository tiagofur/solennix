# Proposal: StoreKit 2 Purchase Flow

## Intent
Provide a robust native fallback purchase flow for iOS using StoreKit 2 when RevenueCat is unconfigured or offline.

## Scope
### In Scope
- Background Transaction listener (Transaction.updates) at app launch.
- Local cryptographic verification of Apple transaction signatures.
- Local fallback entitlement checks and status synchronization.
- SwiftUI Pricing/Settings view fallback triggers.
- Unit/mock tests for updated components.

### Out of Scope
- Direct App Store receipt validation on backend (relies on RevenueCat webhook only).
- Android/Web billing logic modifications (already handles Google Play/Stripe).

## Approach
Implement a background Transaction updates listener in SubscriptionManager. StoreKit 2 verification ensures only Apple-signed purchases unlock Premium local features when RevenueCat key is missing/offline.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `ios/Packages/SolennixNetwork/Sources/SolennixNetwork/SubscriptionManager.swift` | Modified | Add updates listener task, cryptographic verification, and local entitlements fallback. |
| `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Settings/Views/PricingView.swift` | Modified | Update fallback triggers and pricing text for StoreKit products. |

## Parity Check (All Platforms)
- iOS: New StoreKit 2 fallback implemented.
- Android: Already has RevenueCat / Google Play integration. No changes needed.
- Web: Already has Stripe integration. No changes needed.
- Backend: Already has RevenueCat and Stripe webhook handlers. No changes needed.

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Double-finishing transactions | Low | Keep finishing idempotent and verify before finishing. |

## Rollback Plan
Revert changes to `SubscriptionManager.swift` and `PricingView.swift` to restore the pre-existing pure RevenueCat flow.

## Dependencies
- iOS 17+ / StoreKit 2 framework.

## Success Criteria
- [ ] Transaction listener runs on app launch.
- [ ] Offline purchase / restore works in StoreKit direct sandbox mode.
- [ ] `./init.sh` validation suite passes.
