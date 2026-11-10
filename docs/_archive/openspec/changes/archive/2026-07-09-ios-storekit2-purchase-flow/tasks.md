# Tasks: StoreKit 2 Purchase Flow

## Phase 1: iOS Network / Foundation (SubscriptionManager)
- [x] 1.1 Add `updatesTask` property to [SubscriptionManager.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixNetwork/Sources/SolennixNetwork/SubscriptionManager.swift) and start the Transaction background listener task inside `init` with weak self capture.
- [x] 1.2 Implement `@MainActor private func handleTransactionUpdate(_ result: VerificationResult<Transaction>) async` in [SubscriptionManager.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixNetwork/Sources/SolennixNetwork/SubscriptionManager.swift) to verify and finish transactions locally.
- [x] 1.3 Implement `@MainActor private func refreshLocalStoreKitEntitlements() async` in [SubscriptionManager.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixNetwork/Sources/SolennixNetwork/SubscriptionManager.swift) to scan `Transaction.currentEntitlements` for active subscriptions.
- [x] 1.4 Modify `checkEntitlementStatus()` and `restorePurchases()` in [SubscriptionManager.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixNetwork/Sources/SolennixNetwork/SubscriptionManager.swift) to fallback to direct StoreKit local checks when `isConfigured` is false.

## Phase 2: iOS UI Integration (PricingView)
- [x] 2.1 Update [PricingView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Settings/Views/PricingView.swift) to fetch and render fallback monthly/yearly direct StoreKit products.
- [x] 2.2 Update monthly/yearly trigger buttons in [PricingView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Settings/Views/PricingView.swift) to call `purchaseStoreKitProduct(_:)` when using fallback direct StoreKit flow.

## Phase 3: Testing & Verification
- [x] 3.1 Create/update unit tests to verify direct StoreKit fallback entitlement checks and error scenarios when RevenueCat is unconfigured.
- [x] 3.2 Verify the compilation of the iOS packages and run `./init.sh` validation suite to ensure it compiles successfully.

## Phase 4: Documentation / PRD Update
- [x] 4.1 Update [11_CURRENT_STATUS.md](file:///Users/tiagofur/dev/solennix/docs/PRD/11_CURRENT_STATUS.md) reflecting the completion of the StoreKit 2 fallback flow.
