# Exploration: Bump billing-ktx from 8.3.0 to 9.0.0

## Current State
- The Android project uses `com.android.billingclient:billing-ktx` version `8.3.0`.
- It also uses RevenueCat SDK `com.revenuecat.purchases:purchases` version `10.6.0`.
- RevenueCat 10.6.0 transitively depends on Google Play Billing Library 8.3.0.
- `libs.billing` is implemented explicitly in `feature/settings/build.gradle.kts`, locking/forcing version 8.3.0.
- There are no direct usages of `com.android.billingclient` APIs in the Solennix Kotlin code. All purchases go through RevenueCat's `BillingManager.kt`.

## Affected Areas
- `android/gradle/libs.versions.toml` — contains the `billing` version definition.
- `android/feature/settings/build.gradle.kts` — implements `libs.billing`.

## Approaches
1. **Force Bump billing-ktx to 9.0.0 (Keep RevenueCat 10.6.0)**
   - Pros: Directly satisfies the version bump request with minimal lines of code changed.
   - Cons: Potential binary incompatibility at runtime. Google Play Billing Library 9.0.0 introduces breaking changes (such as `getLinkUri` nullability) which may cause crashes inside RevenueCat's internal classes if forced.
   - Effort: Low

2. **Remove explicit billing-ktx dependency (Let RevenueCat manage it)**
   - Pros: Eliminates duplicate dependency declarations. RevenueCat automatically brings in its tested/compatible version of Google Play Billing Library (currently 8.3.0).
   - Cons: The project doesn't run the latest Google Play Billing Library 9.0.0 directly.
   - Effort: Low

3. **Bump both RevenueCat and billing-ktx**
   - Pros: Aligns both libraries to their latest versions, ensuring full compatibility under official support.
   - Cons: Might require testing and potential cross-platform parity verification if RevenueCat makes changes.
   - Effort: Medium

## Recommendation
We recommend Approach 1 as a test to check for compile/runtime issues, but if incompatibility arises, Approach 2 or keeping 8.3.0 is safer. Since Billing Library 9.0.0 is very fresh (May 19, 2026), keeping 8.3.0 or letting RevenueCat manage it (Approach 2) is the most robust production path.

## Risks
- Runtime crashes inside RevenueCat due to binary signature changes in Play Billing Library 9.0.0 (e.g., Nullability changes).
- Gradle build caching / sync issues.

## Ready for Proposal
Yes. The next step is to present the proposal to the user.
