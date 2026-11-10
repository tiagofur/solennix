# Proposal: ios-layout-optimizations

## Intent
Improve iPad/macOS layout and navigation to follow native Apple design standards, optimizing information density and screen space.

## Scope
- **In Scope:**
  - Adapt navigation layout using size classes (sidebar on regular, bottom tab bar on compact).
  - Implement dynamic multi-column detail views for Event/Client.
  - Apply standard native form limits (max-width, inset/grouped styling).
- **Out of Scope:**
  - Complete redesign of detail cards.
  - Modifying non-iOS platform layouts.

## Approach
1. **Adaptive Navigation ([ContentView.swift](file:///Users/tiagofur/dev/solennix/ios/Solennix/ContentView.swift)):** Use standard SwiftUI size-class matching (`horizontalSizeClass == .regular && verticalSizeClass == .regular`). For iPad Portrait, use native overlay/swipeable sidebar. For macOS, collapse sidebar to bottom tab bar (compact iPhone design) when the window is resized narrow.
2. **Dynamic Detail Columns ([EventDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventDetailView.swift), [ClientDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/Views/ClientDetailView.swift)):** If no content is present for the second column, display a single centered column. When content is present, split dynamically into two columns.
3. **Form Constraints ([EventFormView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventFormView.swift)):** Implement Apple native grouped/inset list style (`systemGroupedBackground` with margins) and limit max-width to 640.

## Affected Areas
| File | Action |
| --- | --- |
| [ContentView.swift](file:///Users/tiagofur/dev/solennix/ios/Solennix/ContentView.swift) | Swap navigation based on size classes, add narrow macOS collapse. |
| [EventDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventDetailView.swift) | Support dynamic single or double column detail view. |
| [ClientDetailView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Clients/Views/ClientDetailView.swift) | Support dynamic single or double column detail view. |
| [EventFormView.swift](file:///Users/tiagofur/dev/solennix/ios/Packages/SolennixFeatures/Sources/SolennixFeatures/Events/Views/EventFormView.swift) | Apply native inset grouped list styling and max-width. |

## Risks & Mitigations
| Risk | Mitigation |
| --- | --- |
| Layout clipping on narrow screens | Use flexible `HStack` with minimal spacers. |
| SwiftUI List styling inconsistencies | Use `systemGroupedBackground` with custom card modifiers. |

## Rollback Plan
Revert changes using git: `git checkout HEAD -- ios/`

## Dependencies
None.

## Success Criteria
- Native sidebar on iPad (Portrait/Landscape) and macOS wide window.
- macOS narrow window collapses to bottom tab bar.
- Forms centered with max-width.
- Detail views adapt based on second-column content availability.
