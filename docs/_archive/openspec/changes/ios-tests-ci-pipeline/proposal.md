# Proposal: iOS Tests & CI Pipeline

## Intent
Improve the iOS application's stability and testing coverage by adding unit tests for view models, introducing UI tests with a mock authentication bypass, and pinning the CI workflow destination.

## Scope
### In Scope
- **Email Validation**: Make client email mandatory in [ClientFormViewModel.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/ViewModels/ClientFormViewModel.swift) and validate it using a strict regex.
- **Unit Tests**:
  - `DashboardViewModel`: KPIs, fallback metrics, trend points, attention events.
  - `EventListViewModel`: Filters, sorting direction, CSV escaping.
  - `ClientFormViewModel`: Mandatory fields, email validation, dirty state.
- **UI Tests**:
  - Login flow bypass using environment flag `SOLX_UI_TEST_MOCK_LOGIN = "1"` (allows `test@solennix.com` or other valid format).
  - Basic tab navigation navigating between Home, Events, Clients, Search, and "Más (More)" (`AppTab.more`) tabs.
  - Verifying the "Más" tab correctly displays and navigates to the list of extra options (Products, Inventory, Settings).
- **CI Pipeline**: Target `'iPhone 17'` simulator in [.github/workflows/ios-ci.yml](file:///Users/tiagofur/dev/solennix/.github/workflows/ios-ci.yml), removing dynamic fallbacks.

### Out of Scope
- Integration tests targeting the live production API.
- End-to-end testing of full user workflows beyond login and tab navigation.

## Approach
- Add regex-based validation and mandatory status for email in [ClientFormViewModel.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/ViewModels/ClientFormViewModel.swift).
- Implement `SOLX_UI_TEST_MOCK_LOGIN` in [AuthManager.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixNetwork/Sources/SolennixNetwork/AuthManager.swift) behind `#if DEBUG` gate.
- Implement UI tests verifying tab navigation, including the "Más (More)" tab and its routing to extra options (Products, Inventory, Settings).
- Update GitHub Actions workflow to strictly search for and run on `iPhone 17`.

## Affected Areas
- [ClientFormViewModel.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/ViewModels/ClientFormViewModel.swift) (validation, constraints)
- [AuthManager.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixNetwork/Sources/SolennixNetwork/AuthManager.swift) (debug mock login bypass)
- [DashboardViewModelTests.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Tests/SolennixFeaturesTests/Dashboard/DashboardViewModelTests.swift) (new unit tests)
- [EventListViewModelTests.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Tests/SolennixFeaturesTests/Events/EventListViewModelTests.swift) (new unit tests)
- [ClientFormViewModelTests.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Tests/SolennixFeaturesTests/Clients/ClientFormViewModelTests.swift) (new unit tests)
- [LoginFlowTests.swift](file:///Users/tiagofur/dev/solennix/ios/SolennixUITests/LoginFlowTests.swift) (new UI tests)
- [ios-ci.yml](file:///Users/tiagofur/dev/solennix/.github/workflows/ios-ci.yml) (CI workflow update)

## Risks & Mitigations
- **Simulator availability in CI**: `iPhone 17` might not be pre-installed on macOS runner.
  - *Mitigation*: Run pre-flight check in CI setup.

## Rollback Plan
- Revert commits on the main branch. Re-enable dynamic simulator queries if necessary.

## Success Criteria
- Xcode tests pass locally and in CI.
- Email validation rejects invalid formats and allows valid ones.
- UI tests run successfully on the `iPhone 17` simulator in CI.
