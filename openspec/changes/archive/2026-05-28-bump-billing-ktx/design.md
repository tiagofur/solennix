# Design: Bump billing-ktx from 8.3.0 to 9.0.0

## Technical Approach
Upgrading `com.android.billingclient:billing-ktx` to `9.0.0` in the central version catalog `libs.versions.toml`. Compilation tests will verify that Hilt injection and settings build targets succeed.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|----------|--------|-------------------------|-----------|
| Dependency Scope | Update catalog only | Update RevenueCat | Bumping just `billing` isolates the scope. Upgrading RevenueCat requires cross-platform parity checks. |

## Data Flow
No changes to runtime data flow. All in-app purchase actions still flow through `BillingManager.kt` via RevenueCat SDK.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `android/gradle/libs.versions.toml` | Modify | Change `billing` version variable value from `8.3.0` to `9.0.0`. |

## Interfaces / Contracts
No changes to public interfaces or contracts.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Compile | Settings module build | Run `./gradlew :feature:settings:assembleDebug` |
| Manual | Settings screen load | Run app and verify subscription settings screen loads |

## Migration / Rollout
No data migration required. Feature is rolled out as a simple dependency update.

## Open Questions
None.
