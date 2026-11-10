# Tasks: iOS Tests & CI Pipeline

This document defines the task checklist for adding email validation, expanding unit tests, implementing UI tests with mock auth bypass, and pinning the CI simulator target.

## Phase 1: Client Email Validation

- [x] Implement strict regex pattern evaluation in `isEmailValid` property within [ClientFormViewModel.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/ViewModels/ClientFormViewModel.swift).
- [x] Update `isFormValid` and email validation checks in `validateAndSave()` in [ClientFormViewModel.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/ViewModels/ClientFormViewModel.swift).
- [x] Add localized translation keys for email validation empty/invalid errors to [Localizable.xcstrings](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Resources/Localizable.xcstrings).

## Phase 2: Unit Testing Suite

- [x] Create [DashboardViewModelTests.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Tests/SolennixFeaturesTests/Dashboard/DashboardViewModelTests.swift) to test trend points padding, computed KPI fallbacks, attention event prioritization, and status update logic.
- [x] Create [EventListViewModelTests.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Tests/SolennixFeaturesTests/Events/EventListViewModelTests.swift) to test complex filter/date combinations, sorting directions, and CSV content escaping.
- [x] Create [ClientFormViewModelTests.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Tests/SolennixFeaturesTests/Clients/ClientFormViewModelTests.swift) to test validation rules, form states, dirty state toggling, and save success/failure behaviors.

## Phase 3: UI Testing & Bypass

- [x] Inject custom `URLSession` via a custom initializer in [APIClient.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixNetwork/Sources/SolennixNetwork/APIClient.swift) to support mock networking.
- [x] Implement `SOLX_UI_TEST_MOCK_LOGIN` environment flag check in [AuthManager.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixNetwork/Sources/SolennixNetwork/AuthManager.swift) to bypass API authentication during UI tests.
- [x] Expose internal `accessibilityIdentifier` property in [SolennixTextField.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixDesign/Sources/SolennixDesign/Components/SolennixTextField.swift).
- [x] Assign unique accessibility identifiers to the email/password fields and the submit button in [LoginView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Auth/Views/LoginView.swift).
- [x] Create [LoginFlowTests.swift](file:///Users/tiagofur/dev/solennix/ios/SolennixUITests/LoginFlowTests.swift) to verify authentication bypass under the environment flag.
- [x] Create [TabNavigationTests.swift](file:///Users/tiagofur/dev/solennix/ios/SolennixUITests/TabNavigationTests.swift) to verify navigation through Home, Events, Clients, Search, and routing inside the "Más (More)" menu.

## Phase 4: CI Pipeline Pinning & Verification

- [x] Modify [.github/workflows/ios-ci.yml](file:///Users/tiagofur/dev/solennix/.github/workflows/ios-ci.yml) to pin simulator destination to "iPhone 17".
- [x] Run all unit and UI tests locally using the global test runner.
- [x] Verify clean test compilation and CI workflow run execution.
