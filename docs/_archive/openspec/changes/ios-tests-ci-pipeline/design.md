# Technical Design: iOS Tests and CI Pipeline

This document details the technical design for adding client form email validation, extending unit test coverage for `DashboardViewModel`, `EventListViewModel`, and `ClientFormViewModel`, implementing automated UI tests with a mock authentication bypass, and pinning the CI pipeline simulator destination.

## 1. Technical Approach

### 1.1 Client Email Validation & Mandatory Logic
- **`ClientFormViewModel`**: 
  - Define `isEmailValid` using `NSPredicate` evaluating a strict regex pattern (`"^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}$"`).
  - Update `isFormValid` to evaluate `isNameValid && isPhoneValid && isEmailValid`.
  - Update `validateAndSave()` to validate the email. If empty, fail with `clients.form.validation.email_empty` ("El correo electrónico es obligatorio"). If invalid, fail with `clients.form.validation.email_invalid` ("Formato de correo inválido").
- **Localizations**: Update `Localizable.xcstrings` within `SolennixFeatures` resources directory to add keys:
  - `clients.form.validation.email_empty`: `"El correo electrónico es obligatorio"` (es), `"Email is required"` (en)
  - `clients.form.validation.email_invalid`: `"Formato de correo inválido"` (es), `"Invalid email format"` (en)

### 1.2 UI Test Accessibility & Mock Auth Bypass
- **`AuthManager`**: Implement a mock authentication bypass inside `signIn(email:password:)` under `#if DEBUG` check. If the process environment contains `SOLX_UI_TEST_MOCK_LOGIN` set to `"1"`, return a mock authenticated user without performing any network calls.
- **`SolennixTextField`**: Add an optional `accessibilityIdentifier: String?` property. Apply it to the inner `TextField` and `SecureField` components.
- **`LoginView`**: Provide unique accessibility identifiers:
  - Email field: `"login_email_field"`
  - Password field: `"login_password_field"`
  - Submit Button: `"login_submit_button"`

### 1.3 CI Destination Pinning
- **`ios-ci.yml`**: Simplify simulator retrieval logic by strictly targeting the simulator destination using `-destination "platform=iOS Simulator,name=iPhone 17"`, eliminating dynamic fallback search logic.

---

## 2. Architecture Decisions

### 2.1 Debug-Only Auth Bypass
- **Decision**: Introduce a compilation-gated environment bypass `SOLX_UI_TEST_MOCK_LOGIN` in `AuthManager` under `#if DEBUG`.
- **Tradeoff**: Avoids deploying mock logic to production while permitting rapid, deterministic UI tests without managing complex local HTTP mock servers in CI.

### 2.2 APIClient Custom Session Injection for Unit Testing
- **Decision**: Add a debug-only constructor to `APIClient` accepting a custom `URLSession` to allow network requests mocking via `URLProtocol` interception.
- **Tradeoff**: Keeps production initialization clean while granting unit tests a structured way to intercept and mock backend responses.

```
[LoginView] (SOLX_UI_TEST_MOCK_LOGIN = "1")
   |
   +---> Bypass Network Auth ---> [Tab Bar Navigation]
                                       |
    +-----------+-----------+----------+----------+
    |           |           |          |          |
    v           v           v          v          v
  [Home]    [Events]    [Clients]   [Search]   [Más (More)]
                                                  |
                                                  v
                                      [Products, Inventory, Settings]
```

---

## 3. File Changes

| Path | Action | Description |
| :--- | :--- | :--- |
| `ios/Packages/SolennixFeatures/Sources/.../Clients/ViewModels/ClientFormViewModel.swift` | Modify | Implement email regex validation, update `isFormValid`, and add localized validations in `validateAndSave`. |
| `ios/Packages/SolennixFeatures/Sources/.../Resources/Localizable.xcstrings` | Modify | Add translations for `clients.form.validation.email_empty` and `clients.form.validation.email_invalid`. |
| `ios/Packages/SolennixNetwork/Sources/SolennixNetwork/AuthManager.swift` | Modify | Add `#if DEBUG` mock authentication logic when `SOLX_UI_TEST_MOCK_LOGIN` environment variable is `"1"`. |
| `ios/Packages/SolennixNetwork/Sources/SolennixNetwork/APIClient.swift` | Modify | Add a custom init to inject `URLSession` in debug mode to facilitate HTTP mocking. |
| `ios/Packages/SolennixDesign/Sources/.../Components/SolennixTextField.swift` | Modify | Add `accessibilityIdentifier` property and map it to internal text fields. |
| `ios/Packages/SolennixFeatures/Sources/.../Auth/Views/LoginView.swift` | Modify | Assign identifiers to email, password text fields, and submit button. |
| `.github/workflows/ios-ci.yml` | Modify | Pin simulator target strictly to `"platform=iOS Simulator,name=iPhone 17"`. |
| `ios/Packages/SolennixFeatures/Tests/.../Dashboard/DashboardViewModelTests.swift` | Create | Unit test trend points padding, computed KPI fallbacks, attention event prioritization, and status update logic. |
| `ios/Packages/SolennixFeatures/Tests/.../Events/EventListViewModelTests.swift` | Create | Unit test complex filter/date combinations, sorting directions, and CSV content escaping. |
| `ios/Packages/SolennixFeatures/Tests/.../Clients/ClientFormViewModelTests.swift` | Create | Unit test client validation rules, form states, dirty state toggling, and save success/failure behaviors. |
| `ios/SolennixUITests/LoginFlowTests.swift` | Create | UI test verifying login using mock bypass and transition check. |
| `ios/SolennixUITests/TabNavigationTests.swift` | Create | UI test verifying navigation through tabs and routing inside the "Más" menu. |

---

## 4. Testing Strategy

### 4.1 Unit Testing
- Test view model components in isolation using XCTest:
  - **`ClientFormViewModel`**: Validate rules (empty, incorrect, valid values) and verify that `isDirty` behaves correctly. Mock APIClient via `URLProtocol` for save scenarios.
  - **`DashboardViewModel`**: Make helper methods (`makeAttentionEvents`, `compareAttentionEvents`) internal under `#if DEBUG` to unit test attention event sorting and prioritization without mocking the full network layer. Test trend points calculations.
  - **`EventListViewModel`**: Test in-memory query filters, sorting logic, and CSV cell escaping (escapes double quotes and wraps values containing commas/newlines/quotes in double quotes).

### 4.2 UI Testing
- Use **XCUITest** to verify visual integration:
  - Launch with `SOLX_UI_TEST_MOCK_LOGIN = "1"`.
  - Type mock credentials, press submit, and check transition to tab bar.
  - Click through tab views (Home, Events, Clients, Search, Más). In "Más", assert that option cells route correctly.
