# Tasks: iOS Feature Gating Enforcement

## Phase 1: iOS Foundation / ViewModels
- [x] 1.1 Add `canCustomizeBranding` computed property checking paid status on `BusinessSettingsViewModel.swift`.

## Phase 2: iOS UI Implementation & Gating
- [x] 2.1 Inject `PlanLimitsManager` in `EventListView.swift` and call `await planLimitsManager.checkLimits()` inside the `.task` block.
- [x] 2.2 Conditionally redirect toolbar '+' button and empty state creation CTA to `.pricing` in `EventListView.swift` if `!planLimitsManager.canCreateEvent`.
- [x] 2.3 Render `UpgradeBannerView` in `safeAreaInset` of `EventListView.swift` if `!planLimitsManager.canCreateEvent`.
- [x] 2.4 Inject `AuthManager` in `BusinessSettingsView.swift` and declare `showPricingSheet` state.
- [x] 2.5 Intercept and swap PhotosPicker in `BusinessSettingsView.swift` with standard button triggering `showPricingSheet = true` when `!viewModel.canCustomizeBranding`.
- [x] 2.6 Intercept and swap ColorPicker in `BusinessSettingsView.swift` with locked HStack triggering `showPricingSheet = true` when `!viewModel.canCustomizeBranding`. Add premium settings section warning banner.
- [x] 2.7 Embed `.sheet` presenting `PricingView` inside `BusinessSettingsView.swift`.
- [x] 2.8 Inject `AuthManager` in `ContractDefaultsView.swift`, declare `showPricingSheet` state, wrap lock banner in a button that triggers the sheet, and embed `.sheet` presenting `PricingView`.

## Phase 3: Testing & Verification
- [x] 3.1 Create mock test and verify `canCustomizeBranding` logic in `BusinessSettingsViewModelTests` (or create a new test file).
- [x] 3.2 Verify project compilation and run iOS unit tests locally using `./init.sh`.

## Phase 4: Documentation / PRD Update
- [x] 4.1 Update `docs/PRD/11_CURRENT_STATUS.md` reflecting the completion of the iOS Feature Gating.
