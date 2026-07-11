# Specification: iOS Tests and CI Pipeline (UI/Testing Domain)

## Purpose
Define specifications for the iOS client changes including client email validation, view model testing, UI navigation testing, and CI pipeline runner destination pinning.

## Requirements

| ID | Title | Description | Domain |
| :--- | :--- | :--- | :--- |
| **REQ-VAL-01** | Mandatory Client Email & Format | Client email MUST be mandatory and validated via strict regex format. | Form Validation |
| **REQ-TST-01** | ViewModel Unit Tests | Dashboard and EventList view models MUST have comprehensive unit test coverage. | Unit Tests |
| **REQ-UIT-01** | UI Navigation & Bypass Testing | UI tests MUST verify core navigation flows, including a mock login bypass. | UI Tests |
| **REQ-CI-01** | CI Target Destination Pinning | CI workflow MUST strictly pin the simulator testing destination. | CI Pipeline |

---

### Requirement: REQ-VAL-01 (Mandatory Client Email & Format)
The client email in [ClientFormViewModel.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/ViewModels/ClientFormViewModel.swift) MUST be mandatory and validated against a strict format regex.

#### Scenario: Client Form Email Empty
- **GIVEN** a user opens the client creation form
- **WHEN** the user leaves the email field empty
- **THEN** the view model validation MUST fail
- **AND** a localized error message "El correo electrónico es obligatorio" SHALL be generated.

#### Scenario: Client Form Email Invalid Format
- **GIVEN** a user enters "invalid-email" or "invalid@domain" in the email field
- **WHEN** validating the client form
- **THEN** the view model MUST reject the format using a strict regex format containing `@` and a valid domain
- **AND** display a localized error message "Formato de correo inválido".

---

### Requirement: REQ-TST-01 (ViewModel Unit Tests)
Unit tests for [DashboardViewModel.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Dashboard/ViewModels/DashboardViewModel.swift) and [EventListViewModel.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/ViewModels/EventListViewModel.swift) MUST cover core business logic and filtering operations.

#### Scenario: Dashboard ViewModel Calculations
- **GIVEN** a set of active events, quotes, and trend data
- **WHEN** `DashboardViewModel` calculates statistics
- **THEN** the unit test MUST verify metrics calculation accuracy, correct trend points, attention events recognition, and status updates.

#### Scenario: EventList ViewModel Filters and CSV Escaping
- **GIVEN** an `EventListViewModel` initialized with event data
- **WHEN** user updates filter combinations, search queries, or sorting directions, or triggers CSV generation
- **THEN** the unit test MUST verify correct filter and search combinations, and correct sorting direction
- **AND** verify that CSV generation correctly escapes special characters to prevent CSV injection.

---

### Requirement: REQ-UIT-01 (UI Navigation & Bypass Testing)
UI tests MUST simulate successful authentication using a mock bypass and verify tab bar routing.

#### Scenario: UI Test Mock Login
- **GIVEN** the application starts under UI testing with `SOLX_UI_TEST_MOCK_LOGIN = "1"` env flag
- **WHEN** navigating to the login screen and submitting any credentials matching the strict format
- **THEN** `AuthManager` MUST bypass the server login verification
- **AND** establish a successful authenticated session.

#### Scenario: App Navigation and More Options
- **GIVEN** the application is successfully logged in under UI testing
- **WHEN** the user navigates between Home, Events, Clients, and Search tabs
- **THEN** the corresponding views MUST be displayed
- **AND** when the user clicks the "Más (More)" tab, the list MUST display options for "Productos", "Inventario", and "Configuración".

---

### Requirement: REQ-CI-01 (CI Target Destination Pinning)
The GitHub Actions workflow in [ios-ci.yml](file:///Users/tiagofur/dev/solennix/.github/workflows/ios-ci.yml) MUST run tests on a pinned destination.

#### Scenario: Pinning Simulator Target
- **GIVEN** a CI build trigger (pull request or push)
- **WHEN** the `ios-ci.yml` workflow runs testing jobs
- **THEN** the xcodebuild command MUST specify the destination strictly pinned to the "iPhone 17" simulator.
