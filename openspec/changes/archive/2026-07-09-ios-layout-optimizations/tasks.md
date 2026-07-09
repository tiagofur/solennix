# Tasks: ios-layout-optimizations

## Phase 1: Adaptive Navigation
- [x] Add `@Environment(\.verticalSizeClass)` to [ContentView.swift](file:///Users/tiagofur/dev/solennix/ios/Solennix/ContentView.swift).
- [x] Implement computed property `isRegularSizeClass` checking both horizontal and vertical size classes are `.regular`.
- [x] Modify `mainLayout` in [ContentView.swift](file:///Users/tiagofur/dev/solennix/ios/Solennix/ContentView.swift) to switch strictly on `isRegularSizeClass` and remove `GeometryReader` dimensions check.

## Phase 2: Form Capping
- [x] Add `@Environment(\.horizontalSizeClass)` to [EventFormView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventFormView.swift).
- [x] Modify `formContent` in [EventFormView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventFormView.swift) to constrain content width using `.frame(maxWidth: horizontalSizeClass == .regular ? 640 : .infinity)` and center it with Spacers.
- [x] Update outer view background to Apple's native `systemGroupedBackground` (`Color(uiColor: .systemGroupedBackground)`) when size class is `.regular`.

## Phase 3: Dynamic Detail Columns
- [x] Add `sizeClass` environment property and `hasSecondaryContent: Bool` local computed property to [EventDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventDetailView.swift) (returns true if `!viewModel.payments.isEmpty || !viewModel.eventPhotos.isEmpty`).
- [x] Implement conditional two-column `ScrollView` wrapped in `HStack` inside [EventDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventDetailView.swift) when `sizeClass == .regular` and `hasSecondaryContent` is true; otherwise, fall back to standard `List`.
- [x] Add `sizeClass` environment property and `hasSecondaryContent: Bool` local computed property to [ClientDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/Views/ClientDetailView.swift) (returns true if `!events.isEmpty`).
- [x] Implement conditional two-column layout using `ScrollView` with `HStack` columns inside [ClientDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/Views/ClientDetailView.swift) when `sizeClass == .regular` and `hasSecondaryContent` is true; otherwise, fall back to standard `List`.

## Phase 4: Verification
- [x] Run iOS UI tests and verify iPad simulator sidebar behaves as native overlay in Portrait and split screen in Landscape.
- [x] Verify macOS application layout resizing to compact collapses the sidebar to a bottom tab bar.
- [x] Verify form constraints capping at 640pt and centering horizontally in `.regular` size class.
- [x] Validate detail screens dynamically collapse to single column and split to dual column based on the presence of secondary content.
