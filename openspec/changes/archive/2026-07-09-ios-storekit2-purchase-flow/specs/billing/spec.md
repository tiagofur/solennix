# Delta for Billing (iOS StoreKit 2)

## ADDED Requirements

### Requirement: iOS StoreKit 2 Background Listener
The iOS SubscriptionManager MUST initialize and run a background Task listening to `Transaction.updates` continually from app launch to handle asynchronous purchase updates.

#### Scenario: Background Purchase Event
- GIVEN the application has finished launching
- WHEN the App Store emits a transaction update (e.g. renewal or refund) via `Transaction.updates`
- THEN SubscriptionManager processes the transaction update and verifies the signature.

### Requirement: iOS Cryptographic Transaction Verification
The iOS SubscriptionManager MUST cryptographically verify all transactions received from StoreKit 2. Only successfully verified transactions SHALL be finished using `transaction.finish()`. Unverified transactions MUST NOT be finished and must be logged to Sentry.

#### Scenario: Successful Direct Purchase
- GIVEN a direct StoreKit 2 purchase is initiated
- WHEN StoreKit returns a verified transaction
- THEN the transaction is finished locally and synced with RevenueCat (if configured).

#### Scenario: Cryptographic Verification Failure
- GIVEN a direct StoreKit 2 purchase is processed
- WHEN StoreKit returns an unverified transaction
- THEN the transaction is NOT finished and an error is logged to Sentry.

### Requirement: iOS Local Entitlement Fallback
When RevenueCat is unconfigured or offline, SubscriptionManager MUST query `Transaction.currentEntitlements` directly to determine the user's premium status based on active, verified StoreKit 2 transactions.

#### Scenario: Offline Entitlement Check
- GIVEN RevenueCat is unconfigured
- WHEN SubscriptionManager checks the entitlement status
- THEN premium status is set to true if a valid, unexpired verified transaction exists for `solennix_premium_monthly` or `solennix_premium_yearly`.

### Requirement: Pricing and Settings View Fallback Support
All SwiftUI Settings/Pricing views MUST display localized product information and support direct StoreKit 2 fallback purchases when RevenueCat offerings are unavailable.

#### Scenario: Load Offerings Fallback
- GIVEN RevenueCat offerings fail to load or are unconfigured
- WHEN PricingView is presented
- THEN fallback StoreKit products are loaded and displayed with App Store localized prices.
