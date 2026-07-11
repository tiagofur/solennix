## Exploration: ios-tests-ci-pipeline

### Current State
Today, the iOS codebase features some unit tests under `SolennixTests` (61 files testing core logic, localizations, and formatters) and package-specific tests under `SolennixFeaturesTests` (focusing on `EventFormViewModel` and `EventListViewModel` state). Additionally, two UI tests exist in `SolennixUITests` checking the Tab Bar slot fit and Search Tab empty states.
However:
1. `DashboardViewModel` has no unit tests verifying its preloading, fallback KPIs, sorting, and trend metrics calculations.
2. `EventListViewModel` is missing tests for its filter combinations (status, date range, search query), sorting directions, and CSV content escaping.
3. `ClientFormViewModel` lacks unit tests for basic validation and has no email format validation implemented at all.
4. The successful login flow has no automated UI test, as UI test runners run in isolation and cannot login against the real API without a mock auth bypass.
5. The GitHub Actions workflow (`.github/workflows/ios-ci.yml`) is currently searching for a simulator matching `iPhone 16` first, instead of pinning to `iPhone 17`.

### Affected Areas
- `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/ViewModels/ClientFormViewModel.swift` — Need to implement email validation logic (`isEmailValid`, update `isFormValid` and `validateAndSave`).
- `ios/Packages/SolennixFeatures/Tests/SolennixFeaturesTests/Dashboard/DashboardViewModelTests.swift` — New unit tests for KPI preloading, metrics fallbacks, trend point building, and attention events.
- `ios/Packages/SolennixFeatures/Tests/SolennixFeaturesTests/Events/EventListViewModelTests.swift` — New unit tests for filter combinations, custom sorting direction flips, and CSV escaping.
- `ios/Packages/SolennixFeatures/Tests/SolennixFeaturesTests/Clients/ClientFormViewModelTests.swift` — New unit tests for client name, phone, and email validation, dirty state checks, and saving.
- `ios/Packages/SolennixNetwork/Sources/SolennixNetwork/AuthManager.swift` — Add a debug-only bypass flag `SOLX_UI_TEST_MOCK_LOGIN` in `signIn(email:password:)` to simulate login success without real API calls.
- `ios/SolennixUITests/LoginFlowTests.swift` — New UI tests for successful login flow (using the `SOLX_UI_TEST_MOCK_LOGIN` environment) and basic tab navigation.
- `.github/workflows/ios-ci.yml` — Update simulator destination query to target `iPhone 17` explicitly.

### Approaches
1. **Mocking via Environment Bypasses (Recommended)** — Bypassing the authentication calls in the UI test target using compiler gates and env flags (`SOLX_UI_TEST_MOCK_LOGIN = "1"`).
   - Pros: Simple, fast execution, tests the actual UI inputs (`Email/Password` text fields and buttons) without external network dependencies.
   - Cons: Adds minimal debug-only testing code to the production target (under `#if DEBUG`).
   - Effort: Low.

2. **In-Memory Server / Request Interceptor** — Spinning up a local mock web server (like Mocker or wiremock) inside the UI test bundle to intercept and mock the HTTP calls of `APIClient`.
   - Pros: No mock code introduced to the application target.
   - Cons: Increases complexity significantly; requires bundle config updates and local server management in the CI environment.
   - Effort: High.

### Recommendation
Use **Approach 1 (Mocking via Environment Bypasses)**. The app already uses `SOLX_UI_TEST_BYPASS_AUTH` to bypass authentication for navigation checks. Adding `SOLX_UI_TEST_MOCK_LOGIN` allows testing the actual `LoginView` (typing credentials and pressing the button) and verifying that the app transitions to the dashboard.

### Risks
- **Simulator Availability in CI**: If GitHub Actions' `macos-15` runners do not have `iPhone 17` simulator runtimes installed, the build will fail. 
  *Remediation*: We will verify it during implementation and fall back to the most recent available simulator if needed.

### Ready for Proposal
Yes. The exploration outlines a clean, non-disruptive implementation path for both ViewModels unit tests and UI tests, along with the Actions workflow correction.
