# Exploration: StoreKit 2 Purchase Flow

This document explores the technical design and architectural choices for integrating **StoreKit 2** as a robust local fallback alongside **RevenueCat** in the Solennix iOS application.

---

## 1. Context & Objectives

Solennix uses **RevenueCat** as its primary purchase management framework. RevenueCat unifies Apple/Google Play subscriptions and notifies the Go backend via webhooks. However, a local fallback using **StoreKit 2** is necessary to ensure monetization and entitlement integrity when:
1. RevenueCat is offline, blocked, or rate-limited.
2. The RevenueCat API key is missing or misconfigured in build settings.
3. Network connectivity prevents the RevenueCat SDK from completing the purchase flow.

### Key Requirements (Issue #784)
- **Background Transaction Listener**: Listen to `Transaction.updates` from app launch.
- **Cryptographic Verification**: Safely verify `VerificationResult<Transaction>` and finish transactions locally.
- **Local Fallback Entitlement Checks**: Query `Transaction.currentEntitlements` when RevenueCat is unconfigured/offline.
- **Dynamic Locale-Based Currency Formatting**: Gracefully format StoreKit product prices using local formatting.
- **UI Support**: Adapt all pricing and subscription views to support direct StoreKit fallback purchases.

---

## 2. Codebase Investigation

We inspected the following files in the workspace:
1. **[SubscriptionManager.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixNetwork/Sources/SolennixNetwork/SubscriptionManager.swift)**: Manages purchases using RevenueCat. Features a basic, non-reactive StoreKit fallback that loads products but lacks background listening, cryptographic validation, and local entitlement caching.
2. **[PricingView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Settings/Views/PricingView.swift)**: Displays the monthly/yearly pricing options. Displays prices using `monthly.storeProduct.localizedPriceString` or `fallback.displayPrice`, but does not listen dynamically to local entitlement changes.
3. **[SolennixApp.swift](file:///Users/tiagofur/dev/solennix/ios/Solennix/SolennixApp.swift)**: Instantiates and configures `SubscriptionManager` on launch, performing a RevenueCat login when the authenticated user is resolved.

---

## 3. Detailed Technical Analysis

### A. Background Transaction Listener
StoreKit 2 provides `Transaction.updates` as a system-wide asynchronous stream that emits new transactions, renewals, and billing issues:
- **Implementation**: We should spawn a long-running, detached `Task` during `SubscriptionManager` initialization.
- **Seam**: This task must capture `[weak self]` to avoid retain cycles and forward emitted transactions to a main-actor handler.
- **Lifecycle**: The listener task reference must be kept in a private property (`updatesTask`) and cancelled in `deinit`.

```swift
private var updatesTask: Task<Void, Never>?

public init() {
    // Start listening on launch
    updatesTask = Task { [weak self] in
        for await verificationResult in Transaction.updates {
            guard let self = self else { break }
            await self.handleTransactionUpdate(verificationResult)
        }
    }
}

deinit {
    updatesTask?.cancel()
}
```

### B. Cryptographic Verification & Finishing Transactions
StoreKit 2 returns transactions wrapped in `VerificationResult<SignedType>`:
- **Unverified**: Represents a transaction that failed cryptographic validation. These should be logged to Sentry but **never** finished or trusted.
- **Verified**: Represents a cryptographically secure transaction signed by Apple. We must:
  1. Extract the underlying `Transaction`.
  2. Perform local state updates.
  3. Call `await transaction.finish()` to notify the App Store that the transaction has been processed. If not finished, the App Store will re-deliver the transaction on next launch.

```swift
@MainActor
private func handleTransactionUpdate(_ verificationResult: VerificationResult<Transaction>) async {
    switch verificationResult {
    case .verified(let transaction):
        // Update local premium state
        await refreshLocalStoreKitEntitlements()
        // Finish the transaction locally
        await transaction.finish()
        
        // Sync with RevenueCat if possible so the backend gets notified
        if isConfigured {
            _ = try? await Purchases.shared.syncPurchases()
        }
    case .unverified(let transaction, let error):
        // Log cryptographic validation error, do NOT finish
        SentryHelper.capture(message: "StoreKit 2 transaction verification failed: \(error.localizedDescription)")
    }
}
```

### C. Local Entitlement Fallback Checks
When `isConfigured` is false (RevenueCat missing/offline), `checkEntitlementStatus()` and `restorePurchases()` should bypass RevenueCat and query `Transaction.currentEntitlements` directly:
- **Active Check**: Loop through `Transaction.currentEntitlements` to find active transactions matching the product identifiers (`solennix_premium_monthly`, `solennix_premium_yearly`).
- **Expiration Check**: Ensure that `expirationDate` is nil (non-expiring, though these are auto-renewing subscriptions) or greater than `Date()`.

```swift
@MainActor
private func refreshLocalStoreKitEntitlements() async {
    var hasActivePremium = false
    for await verificationResult in Transaction.currentEntitlements {
        if case .verified(let transaction) = verificationResult {
            if Self.productIDs.contains(transaction.productId) {
                if let expirationDate = transaction.expirationDate {
                    if expirationDate > Date() {
                        hasActivePremium = true
                    }
                } else {
                    hasActivePremium = true
                }
            }
        }
    }
    self.isPremium = hasActivePremium
}
```

### D. Dynamic Locale-Based Currency Formatting
StoreKit 2's `Product` exposes `displayPrice: String` and `price: Decimal`.
- **App Store Region vs System Locale**: The currency symbol and amount are determined by the user's App Store account.
- **Formatting Best Practice**:
  - `displayPrice` (e.g. `"$6.99"`) is already formatted by the system to match the Apple ID region.
  - If we want dynamic localization parity with the system locale (`FeatureL10n.locale`), we can use the iOS 16+ `priceFormatStyle` or fall back to `displayPrice` for iOS 15.
  - Recommendation: Use `displayPrice` directly for fallback StoreKit products. For RevenueCat, continue using `storeProduct.localizedPriceString`.

---

## 4. Comparison of Approaches

We compared two architectural approaches for managing the fallback:

| Feature / Criteria | Approach A: Minimal StoreKit Fallback (Current) | Approach B: Robust Dual-Pipeline (Recommended) |
| :--- | :--- | :--- |
| **Integrity** | Weak. Purchases only checked on-demand during active purchase. | Strong. Listens to renewals and background transactions via `Transaction.updates`. |
| **Availability** | Medium. Relies on RevenueCat for status checks. | High. Entirely independent entitlement status checks when RevenueCat is down. |
| **Security** | None. Missing local cryptographic verification. | High. Cryptographically verifies Apple signatures locally. |
| **Maintainability** | High. Simple codebase, fewer lines. | Medium. Duplicate listeners (RevenueCat + StoreKit 2) requires careful completion gating. |

### Recommendation
We recommend **Approach B (Robust Dual-Pipeline)**. The duplication of listeners is an Apple-approved practice when wrapping StoreKit with a third-party framework, as long as both finish transactions correctly. This ensures 100% monetization uptime even during third-party service outages.

---

## 5. Risks & Gotchas

1. **Double-Finishing Transactions**: Both RevenueCat and our direct StoreKit 2 code might observe the same transaction. If RevenueCat finishes the transaction first, calling `transaction.finish()` in our fallback listener is safe (it's idempotent in StoreKit 2). However, we must ensure we do not finish unverified transactions.
2. **Sandbox Testing**: In the Sandbox environment, subscription durations are shortened (e.g., a monthly subscription renews every 5 minutes and auto-renews up to 5 times). The background listener must handle rapid renewals cleanly.
3. **App Group Parity**: Entitlement status changes (like `isPremium`) must synchronize correctly, but since `isPremium` in `SubscriptionManager` is `@Observable`, the UI will automatically update. We must also ensure any widgets that depend on premium status are notified to reload.

---

## 6. Next Steps

1. **Proposal (`sdd-propose`)**: Define the spec and interface additions to `SubscriptionManager.swift`.
2. **Specification (`sdd-spec`)**: Draft tests and scenarios for StoreKit 2 fallback purchases, background updates, and unverified transactions.
3. **Design (`sdd-design`)**: Refine the threading constraints (e.g., ensuring all state changes occur on the `@MainActor`).
