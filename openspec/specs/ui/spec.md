# Specification: Mobile Currency Wiring (UI Domain)

## Purpose
Define the mobile client specifications (iOS and Android) for dynamic, multi-currency support in the user interface and models, ensuring dynamic formatting instead of hardcoded MXN.

## Requirements

| ID | Title | Description | Domain |
| :--- | :--- | :--- | :--- |
| **REQ-EV-01** | Event Currency Mapping | Event model maps backend `currency` field. Defaults to MXN if null or empty. | Model |
| **REQ-USR-01** | User Default Currency Mapping | User model maps backend `default_currency` field. Defaults to MXN if null or empty. | Model |
| **REQ-UI-01** | Dynamic UI Currency Formatting | Format all prices/amounts using event or user currency code instead of hardcoded MXN. | UI / View |
| **REQ-UI-02** | iOS Event Creation Gating | When basic plan event limit is reached, event creation is blocked. | UI / View |
| **REQ-UI-03** | iOS Custom Branding Gating | When user is not on a paid plan, custom branding settings are locked. | UI / View |
| **REQ-LAY-01** | Adaptive Navigation Layout | Toggle between sidebar and tab bar based on size classes and macOS window width. | Navigation |
| **REQ-LAY-02** | Dynamic Detail Columns | Toggle between single column and double column dynamically based on second-column content. | UI / View |
| **REQ-LAY-03** | Form Constraints | Cap form width to 640pt and style with inset grouped lists in regular size class. | UI / Form |


---

### Requirement: REQ-EV-01 (Event Currency Mapping)
The iOS and Android `Event` models must include a `currency` property (mapping the backend `"currency"` field).

#### Scenario: iOS Event Model Fallback
- **GIVEN** an API response for an Event where `currency` is null or missing
- **WHEN** decoding or initializing the Event model on iOS
- **THEN** the Event `currency` property MUST default to `"MXN"`
- **AND** the application must build and pass existing model tests.

#### Scenario: Android Event Model Fallback
- **GIVEN** a JSON payload for an Event where `currency` is null or missing
- **WHEN** deserializing the Event model using `kotlinx.serialization` on Android
- **THEN** the Event `currency` property MUST default to `"MXN"`
- **AND** the application must compile and pass model unit tests.

---

### Requirement: REQ-USR-01 (User Default Currency Mapping)
The iOS and Android `User` models must include a `defaultCurrency` property (mapping the backend `"default_currency"` field).

#### Scenario: iOS User Model Fallback
- **GIVEN** an API response for a User where `default_currency` is null or missing
- **WHEN** decoding or initializing the User model on iOS
- **THEN** the User `defaultCurrency` property MUST default to `"MXN"`.

#### Scenario: Android User Model Fallback
- **GIVEN** a JSON payload for a User where `default_currency` is null or missing
- **WHEN** deserializing the User model on Android
- **THEN** the User `defaultCurrency` property MUST default to `"MXN"`.

---

### Requirement: REQ-UI-01 (Dynamic UI Currency Formatting)
UI elements displaying prices or amounts must dynamically format values based on the event's currency (when displaying event-specific info) or the user's default currency (when displaying user-scoped or aggregated info).

#### Scenario: Dynamic Event Price Formatting on iOS
- **GIVEN** an iOS Event details screen displaying an event with currency `"COP"`
- **WHEN** formatting a currency amount (e.g., `1234.56`)
- **THEN** the formatting call site MUST call `formattedCurrency(code: "COP")`
- **AND** the formatted string must display using Colombian Peso symbol and code suffix.

#### Scenario: Dynamic Event Price Formatting on Android Compose
- **GIVEN** an Android Event Checklist or Details screen displaying an event with currency `"USD"`
- **WHEN** formatting a currency amount (e.g., `1234.56`)
- **THEN** the screen MUST invoke `.asCurrency("USD")`
- **AND** the Compose text must render the formatted amount dynamically.

#### Scenario: Dashboard User Default Currency Formatting
- **GIVEN** a dashboard or client detail screen displaying aggregated financials
- **WHEN** formatting a currency amount (e.g., `5000`)
- **THEN** the UI MUST format the amount using the logged-in user's `defaultCurrency` (falling back to `"MXN"` if null).

---

### Requirement: REQ-UI-02 (iOS Event Creation Gating)
When `isBasicPlan` is true and `eventsThisMonth` reaches or exceeds `PlanLimitsManager.freePlanEventLimit`, new event creation MUST be blocked in the UI.

#### Scenario: Gated Toolbar New Event Button
- **GIVEN** a user on the Basic plan who has reached the monthly event limit (4 events)
- **WHEN** the user taps the '+' button in the event list toolbar
- **THEN** the app redirects the user to the Pricing view (Route.pricing) instead of opening the event creation form.

#### Scenario: Gated Empty State CTA
- **GIVEN** a user on the Basic plan who has reached the monthly event limit
- **WHEN** the user taps the 'Crear evento' CTA button in the empty state
- **THEN** the app redirects the user to the Pricing view (Route.pricing).

#### Scenario: Upgrade Banner Presentation
- **GIVEN** a user on the Basic plan who has reached the monthly event limit
- **WHEN** the Event list screen is presented
- **THEN** an UpgradeBannerView is displayed at the top of the event list.

---

### Requirement: REQ-UI-03 (iOS Custom Branding Gating)
When `user?.plan.isPaid` is false, custom branding settings (logo upload and brand color picker) MUST be locked.

#### Scenario: Logo Upload Locked
- **GIVEN** a user on the Basic plan viewing the Business Settings screen
- **WHEN** the user tries to upload/change the business logo
- **THEN** the app presents the Pricing view as a modal sheet instead of opening the photo picker.

#### Scenario: Brand Color Picker Locked
- **GIVEN** a user on the Basic plan viewing the Business Settings screen
- **WHEN** the user tries to select a brand color
- **THEN** the app presents the Pricing view as a modal sheet instead of opening the color picker.



### Requirement: iOS Calendar Mode Event Card Redirection
La lista filtrada de eventos en la vista de Calendario (.calendario) en iOS MUST permitir que al presionar (tap) cualquier tarjeta de evento, el usuario sea redirigido de forma inmediata a la vista de detalle correspondiente (Route.eventDetail).

#### Scenario: Tap Event in Calendar Filtered List
- GIVEN el usuario se encuentra en la pantalla de Eventos en la vista de Calendario
- WHEN el usuario hace tap sobre una tarjeta de evento en la lista de eventos filtrados de la fecha seleccionada
- THEN la aplicación navega a la pantalla de Detalle del Evento (Route.eventDetail) correspondiente al id del evento.

---

### Requirement: REQ-LAY-01 (Adaptive Navigation Layout)

The iOS/macOS application navigation layout MUST adapt based on size classes and window dimensions.

#### Scenario: Sidebar Split Navigation in Double Regular Class
- **GIVEN** an iPad or macOS device running the app
- **WHEN** both horizontal and vertical size classes are `.regular`
- **THEN** the navigation MUST display as a sidebar split layout.

#### Scenario: Native Sidebar Overlay on iPad Portrait
- **GIVEN** an iPad in Portrait orientation
- **WHEN** the sidebar is accessed
- **THEN** the sidebar MUST behave as a native swipeable/overlay view.

#### Scenario: macOS Sidebar Collapse on Narrow Window
- **GIVEN** a macOS client window
- **WHEN** the window is resized narrow such that its horizontal size class becomes `.compact`
- **THEN** the sidebar navigation MUST collapse
- **AND** the compact bottom tab bar MUST be displayed.

---

### Requirement: REQ-LAY-02 (Dynamic Detail Columns)

The detail screens (`EventDetailView` and `ClientDetailView`) MUST dynamically adjust their layout based on second column content.

#### Scenario: Single Column Detail View
- **GIVEN** an `EventDetailView` or `ClientDetailView`
- **WHEN** the secondary column has no content
- **THEN** the view MUST render as a single centered column.

#### Scenario: Dynamic Two-Column Detail View
- **GIVEN** an `EventDetailView` or `ClientDetailView` in a `.regular` horizontal size class
- **WHEN** the secondary column has content
- **THEN** the view MUST dynamically split into two columns (primary on left, secondary on right).

---

### Requirement: REQ-LAY-03 (Form Constraints)

The `EventFormView` MUST apply native styling and layout constraints in regular size classes.

#### Scenario: Max Width Capping on iPad/macOS
- **GIVEN** an `EventFormView` in a `.regular` horizontal size class
- **WHEN** rendering the form
- **THEN** the form's content width MUST be capped to `640pt`
- **AND** the form MUST be centered horizontally within the container.

#### Scenario: Standard Apple Grouped Inset List Styling
- **GIVEN** an `EventFormView` in a `.regular` size class
- **WHEN** applying background styles and spacing
- **THEN** the form MUST style contents using native Apple grouped/inset list styling
- **AND** the background color MUST be set to `Color(uiColor: .systemGroupedBackground)`
- **AND** standard margins MUST be enforced.
