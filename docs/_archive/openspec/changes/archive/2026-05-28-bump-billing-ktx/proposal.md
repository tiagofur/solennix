# Proposal: Bump billing-ktx from 8.3.0 to 9.0.0

## Intent
Upgrade Google Play Billing Library to 9.0.0 to keep dependencies modern and prepare for future Play Store update requirements.

## Scope

### In Scope
- Bump `billing` version in Gradle catalog.
- Verify settings feature builds successfully.

### Out of Scope
- Modifying `BillingManager.kt` business logic.
- Upgrading RevenueCat SDK version.

## Approach
Update `billing` variable in `libs.versions.toml` from `8.3.0` to `9.0.0` and compile.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `android/gradle/libs.versions.toml` | Modified | Bump `billing` version. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Binary incompatibility with RevenueCat 10.6.0 | Medium | Fallback to 8.3.0 or let RevenueCat handle transitive dependencies. |

## Rollback Plan
Run `git checkout android/gradle/libs.versions.toml` to revert the version bump.

## Dependencies
- None.

## Success Criteria
- [ ] Android project compiles successfully.
- [ ] Subscription settings flow loads without crashes.
