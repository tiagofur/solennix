# Exploration: iOS Layout Optimizations (Issue #788)

This document maps out the findings, analysis, and proposed changes to optimize layout and navigation on iPad and macOS for the Solennix iOS application.

## Current State

1. **Navigation Structure (`ContentView.swift`):**
   - Navigation adapts dynamically to screen geometry: if the horizontal size class is `.compact`, it displays the tab bar (`CompactTabLayout`).
   - If the horizontal size class is `.regular`, it checks the dimensions using `GeometryReader` (`geo.size.width > geo.size.height`). If in landscape (width > height), it shows `SidebarSplitLayout`; otherwise (in portrait), it falls back to the tab-bar-based `CompactTabLayout`.
   - On iPad Portrait (which has a `.regular` horizontal size class), the user gets a stretched, non-native feeling bottom tab bar instead of a professional sidebar structure.

2. **Detail Views (`EventDetailView.swift` & `ClientDetailView.swift`):**
   - Both hub screens are currently implemented as single-column vertical `List` containers.
   - On wide screens (iPad Landscape, macOS), this stretched list results in huge empty spaces on the sides, poor information density, and a suboptimal user experience.
   - Content and tools components are not organized in columns or grids on large screens.

3. **Forms (`EventFormView.swift`):**
   - The multi-step event wizard form is displayed using a `TabView` that occupies the entire width of the screen.
   - For wide displays, inputs and text fields stretch too far, violating standard HIG layout guidelines for forms on iPad/macOS.

---

## Affected Areas

- [ContentView.swift](file:///Users/tiagofur/dev/solennix/ios/Solennix/ContentView.swift): Modify adaptive navigation to check size classes rather than raw dimensions. Use `SidebarSplitLayout` for `.regular` horizontal and vertical size classes.
- [EventDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventDetailView.swift): Split details into two columns inside a scrollable view when `sizeClass == .regular`.
- [ClientDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/Views/ClientDetailView.swift): Split details into two columns inside a scrollable view when `horizontalSizeClass == .regular`.
- [EventFormView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventFormView.swift): Apply a maximum width constraint of `640` and center it on large screens.

---

## Approaches

### 1. Unified Navigation Strategy
- Currently, `ContentView.swift` uses a `GeometryReader` check to decide between sidebar and tab bar on iPad.
- **Proposed Approach:** Leverage SwiftUI's size classes explicitly:
  ```swift
  @Environment(\.horizontalSizeClass) private var horizontalSizeClass
  @Environment(\.verticalSizeClass) private var verticalSizeClass

  private var isRegularSizeClass: Bool {
      horizontalSizeClass == .regular && verticalSizeClass == .regular
  }
  ```
- Render `SidebarSplitLayout` whenever `isRegularSizeClass` is true, and `CompactTabLayout` otherwise. This guarantees a native sidebar on iPad Portrait/Landscape and macOS, while reverting to tab bars on iPhones or iPad multitasking split/slide-over views.

### 2. Double-Column Detail Views
- Implement screen-width-aware layouts in `EventDetailView` and `ClientDetailView` checking `horizontalSizeClass`.
- If `sizeClass == .regular`, display the content in a `ScrollView` with a horizontal stack (`HStack`) split into columns:
  - **EventDetailView:**
    - Left Column (~55%): `EventDetailHeaderCard`, `EventDetailNotesCard`, `EventDetailContentGridSection` (grouped in a custom card container), and Tools.
    - Right Column (~45%): `EventDetailFinanceSummaryCard`, `EventDetailPaymentSummaryCard`, `EventDetailDocumentsCard`, Photos, and Live Activity.
  - **ClientDetailView:**
    - Left Column (~50%): `clientHeaderCard` (avatar, basic info, stats), address details, client notes.
    - Right Column (~50%): Action card (Create event), `clientInsightsCard` (revenue chart and requested services badge), Event History list.

### 3. Maximum Width on Large Screen Forms
- Limit horizontal stretching of `EventFormView` on iPad and macOS.
- Update `formContent` layout inside `EventFormView.swift` to cap the width:
  ```swift
  private var formContent: some View {
      VStack(spacing: 0) {
          // ...
      }
      .frame(maxWidth: sizeClass == .regular ? 640 : .infinity)
      .frame(maxWidth: .infinity, alignment: .center)
  }
  ```

---

## Recommendation

Implement Approach 1, 2, and 3. This resolves Issue #788 by providing:
- Clear size class detection to swap navigation correctly.
- Two-column layouts on detail screens, enhancing readability and content density.
- A capped, centered form presentation to avoid stretched input fields.

---

## Risks

- **SwiftUI List to ScrollView transition:** Replacing `List` with `ScrollView` for detail columns will require styling adjustments to keep the background colors and card margins consistent with the existing theme.
- **Multi-column scaling on small iPads (e.g., Mini in Portrait):** Ensure padding and column distributions are flexible so that contents don't clip on screens with less horizontal space.
- **State Restoration:** Since `SidebarSplitLayout` handles paths differently from `CompactTabLayout`, switching orientation (and thus changing layout) should preserve or elegantly reset the paths. This is already handled by the existing `@SceneStorage` persistence, but verifying it under the new size-class rules is critical.

---

## Ready for Proposal
Yes
