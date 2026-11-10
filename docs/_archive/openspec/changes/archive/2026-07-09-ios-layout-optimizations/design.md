# Design: ios-layout-optimizations

## Technical Approach

To improve information density and comply with Apple's Human Interface Guidelines (HIG) on iPad and macOS, we will optimize the app's layout across navigation, form wizards, and details hubs.

1. **Adaptive Navigation (`ContentView.swift`):** Remove raw dimension (`GeometryReader`) orientation checks. Swap navigation structure strictly using `sizeClass` (which represents the horizontal size class). If size class is `.compact`, display `CompactTabLayout` (bottom tab bar). If `.regular`, display `SidebarSplitLayout` (native sidebar with overlay behaviors).
2. **Dynamic Detail Columns (`EventDetailView.swift` & `ClientDetailView.swift`):**
   - Introduce a local computed property `hasSecondaryContent: Bool`.
     - **For EventDetailView:** `!viewModel.payments.isEmpty || !viewModel.eventPhotos.isEmpty` (payments or photos present).
     - **For ClientDetailView:** `!events.isEmpty` (associated events present).
   - If horizontal size class is `.regular` and `hasSecondaryContent` is true, layout sections inside a scrollable, two-column `HStack` of `VStack` columns. Left column wraps metadata and notes; right column wraps finances, payments, documents, photos, or activity. Individual card blocks are styled using `.solennixCard()`.
   - Otherwise, fallback to the standard single-column `List` layout.
3. **Form Constraints (`EventFormView.swift`):** Introduce `@Environment(\.horizontalSizeClass)`. When class is `.regular`, center the form horizontally using an `HStack` and `Spacer`s, constrain its width to `640pt`, set the outer background to Apple's native system-grouped color (`Color(uiColor: .systemGroupedBackground)`), and display the form content using `surfaceGrouped` as the column surface.

---

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
| :--- | :--- | :--- | :--- |
| **Size-Class Navigation** | Switch strictly on `horizontalSizeClass`. | `GeometryReader` checking width vs height. | Fixes stretched bottom tab bar in iPad Portrait. Integrates with iPad multitasking sizes and macOS window resizing natively. |
| **Two-Column Details** | `ScrollView` wrapping `HStack` of columns when `.regular` & content exists. | Nesting multi-column views inside standard SwiftUI `List`. | SwiftUI `List` cannot render distinct card columns cleanly. `ScrollView` with `.solennixCard()` provides native card visual styling. |
| **Outer Form Centering** | Outermost `HStack` wrapper around `formContent` at `EventFormView` layer. | Applying individual `maxWidth` limits inside sub-steps. | Wrapping at the top level maintains consistent layout, stepper indicator alignment, and wizard wizard-nav sizes with a single modifier. |

---

## Data Flow

```
                  [ Device / Size Class ]
                             │
            ┌────────────────┴────────────────┐
     [ ContentView ]                   [ Event/Client Details ]
            │                                 │
     isCompact?                        isRegular & HasContent?
      /      \                            /             \
    YES       NO                         YES             NO
    /          \                         /                 \
[Tab Bar]  [Sidebar]               [Dual Column]     [Single List]
                                   (ScrollView)         (List)
```

---

## File Changes

| File | Action | Description |
| :--- | :--- | :--- |
| `ios/Solennix/ContentView.swift` | Modify | Switch `mainLayout` strictly on `sizeClass` (horizontal size class). Remove `GeometryReader` landscape check. |
| `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventDetailView.swift` | Modify | Detect horizontal size class. Calculate `hasSecondaryContent`. Render two-column `ScrollView` or standard single-column `List`. |
| `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/Views/ClientDetailView.swift` | Modify | Add `sizeClass` environment. Calculate `hasSecondaryContent`. Render two-column `ScrollView` or standard single-column `List`. |
| `ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventFormView.swift` | Modify | Add `horizontalSizeClass` environment. Center `formContent` with Spacers and constrain width to `640` in regular size class. Style backgrounds. |

---

## Interfaces / Contracts

No public API contract modifications. The view layouts introduce local computed state properties:

```swift
// EventDetailView.swift
@Environment(\.horizontalSizeClass) private var sizeClass

private var hasSecondaryContent: Bool {
    !viewModel.payments.isEmpty || !viewModel.eventPhotos.isEmpty
}

// ClientDetailView.swift
@Environment(\.horizontalSizeClass) private var sizeClass

private var hasSecondaryContent: Bool {
    !events.isEmpty
}

// EventFormView.swift
@Environment(\.horizontalSizeClass) private var horizontalSizeClass
```

---

## Testing Strategy

| Layer | What to Test | Approach |
| :--- | :--- | :--- |
| **Unit** | `hasSecondaryContent` conditions. | Inject mocked view-model states to verify logic returns correct boolean values. |
| **Integration** | Navigation layout swap. | Verify `ContentView` renders `SidebarSplitLayout` when size class is mocked to `.regular`. |
| **Snapshot** | Layout display on different devices. | Execute `assertSnapshot` testing on compact (iPhone) and regular (iPad/macOS) layout sizes for EventDetailView, ClientDetailView, and EventFormView. |

---

## Migration / Rollout

No migration required.

---

## Open Questions

None.
