# Proposal: iOS Feature Gating Enforcement

## Intent
Enforce client-side feature limits and premium branding restrictions on the iOS application based on the user's plan tier (Basic vs. Paid).

## Scope
### In Scope
- Event creation gating in `EventListView.swift` using `PlanLimitsManager`.
- Upgrade banner placement in `EventListView.swift` for locked events count.
- Custom branding (logo upload and brand color picker) gating in `BusinessSettingsView.swift`.
- Lock indicators and paywall sheet integration (`PricingView` modal).
- Local tests for new limits logic.

### Out of Scope
- Backend enforcement logic updates (already handles plan limits and returns 403 `plan_limit_exceeded`).
- Web client feature gating modifications (already implemented).
- Android client feature gating modifications (scoped separately, maintains current parity).

## Approach
Introduce conditional layout branching in iOS views:
1. In `EventListView.swift`, redirect toolbar and empty state creation triggers to `Route.pricing` when `!planLimitsManager.canCreateEvent`.
2. In `BusinessSettingsView.swift`, swap PhotosPicker and ColorPicker for custom buttons that trigger a shared `PricingView` sheet modal when `!viewModel.canCustomizeBranding` (free plan).

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventListView.swift` | Modified | Add `UpgradeBannerView`, `checkLimits()` on task load, and route redirect to pricing. |
| `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Settings/ViewModels/BusinessSettingsViewModel.swift` | Modified | Add `canCustomizeBranding` property checking paid user status. |
| `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Settings/Views/BusinessSettingsView.swift` | Modified | Intercept and block logo / brand color pickers, adding locked visual states and paywall sheet trigger. |
| `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Settings/Views/ContractDefaultsView.swift` | Modified | Wrap lock banner inside a button linking to the paywall sheet. |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| UI tap gestures blocked by SwiftUI List rows | Medium | Replace interactive picker cells entirely with custom lock rows instead of modifying `.disabled()` properties. |
| Stale limits state after upgrade | Medium | Ensure limits are re-checked when the user returns to gated screens. |

## Rollback Plan
Revert changes to `EventListView.swift`, `BusinessSettingsViewModel.swift`, `BusinessSettingsView.swift` and `ContractDefaultsView.swift` to restore the pre-existing un-gated flows.

## Dependencies
- Backend subscription webhook integration (already active).

## Success Criteria
- [ ] Users on Basic plan cannot navigate to the new event form if they hit the event limit, and see an Upgrade banner.
- [ ] Users on Basic plan see lock badges on logo and brand color options, and tapping them opens the Paywall modal sheet.
- [ ] Unit/UI tests pass successfully.
