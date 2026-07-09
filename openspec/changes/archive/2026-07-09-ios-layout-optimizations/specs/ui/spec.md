# Delta Specification: iOS Layout Optimizations (UI Domain)

## Purpose
Define the iOS layout and navigation optimization specifications for iPad and macOS to adhere to native Apple design standards, focusing on adaptive navigation, dynamic detail columns, and form width capping.

## Requirements

| ID | Title | Description | Domain |
| :--- | :--- | :--- | :--- |
| **REQ-LAY-01** | Adaptive Navigation Layout | Toggle between sidebar and tab bar based on size classes and macOS window width. | Navigation |
| **REQ-LAY-02** | Dynamic Detail Columns | Toggle between single column and double column dynamically based on second-column content. | UI / View |
| **REQ-LAY-03** | Form Constraints | Cap form width to 640pt and style with inset grouped lists in regular size class. | UI / Form |

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
