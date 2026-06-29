# Delta: ios-empty-states

> NEW capability (distinct from `search-empty-state`, untouched here). Direct migration
> of 63 `EmptyStateView` call sites + EventListView's hand-rolled filtered block to Apple
> `ContentUnavailableView` (CUV), then deletion of the custom component. 3 force-chained PRs.

## Non-Goals

- Rewriting Spanish copy (kept verbatim)
- Adding retry to the 10 no-action error sites
- Sprint 5 work (rotation/stretch, contrast)
- Android/Web parity (CUV is SwiftUI-native)
- Global Search tab surface (owned by `search-empty-state`)

## ADDED Requirements

### Requirement: Search & Filtered Empty States

Pure-search empty states MUST use `ContentUnavailableView.search(text:)`. Mixed/filter
empty states (only a non-text filter active) MUST use plain `ContentUnavailableView`
with a clear-filters action — MUST NOT use `.search(text:)` when no text query is active.
Field map: icon→`systemImage`, title→`title`, message→`description`, action→`button`.

#### Scenario: Pure-search with no results
- GIVEN a `.searchable` list (e.g. ClientListView) holds a non-empty query
- WHEN the query yields zero matches
- THEN a `ContentUnavailableView.search(text:)` renders with a clear-query affordance

#### Scenario: Filtered-empty with active non-text filter
- GIVEN a mixed filter site (e.g. ProductListView by category, InventoryListView low-stock)
- WHEN a filter is active and results are empty with no text query
- THEN a plain `ContentUnavailableView` renders with a clear-filters `button`
- AND tapping it resets the active filter

### Requirement: Truly-Empty & First-Run States

Truly-empty surfaces MUST render a `ContentUnavailableView` with a teaching message.
The 8 first-run CTA sites MUST preserve their CTA by moving it into the CUV `actions:`
builder. EventListView MUST keep its filtered-vs-truly-empty distinction
(filtered→clear action, truly-empty→teaching).

#### Scenario: First-run CTA preserved
- GIVEN a first-run screen with an existing NavigationLink CTA
- WHEN the empty state renders
- THEN the CTA appears inside the CUV `actions:` builder, navigation unchanged

#### Scenario: Truly-empty teaching message
- GIVEN a list with no items and no search or filter active
- WHEN the empty state renders
- THEN a CUV shows a teaching description guiding the user to create content

### Requirement: Error States

Error surfaces MUST render `ContentUnavailableView`. Sites that currently offer a retry
action MUST preserve it as the CUV action. The 10 no-action error sites
(exclamationmark.triangle) MUST stay no-retry — MUST NOT add a retry action.

#### Scenario: Error with retry action
- GIVEN an error state that currently offers retry (e.g. wifi.exclamationmark + retry)
- WHEN the error renders
- THEN a CUV renders with the existing retry `button`
- AND tapping retry re-attempts the load

#### Scenario: No-action error stays no-action
- GIVEN a no-action error site (exclamationmark.triangle, no retry today)
- WHEN the error renders
- THEN a CUV renders with no action button
- AND no retry affordance appears

### Requirement: Brand Gold on Hero First-Run Screens

Hero first-run screens MUST preserve brand identity via `.tint(SolennixColors.primary)`
and `.symbolRenderingMode(.hierarchical)` on the CUV icon. Non-hero surfaces MAY accept
default system monochrome styling.

#### Scenario: Hero first-run preserves brand gold
- GIVEN a hero first-run screen where brand identity matters
- WHEN the CUV renders
- THEN the icon uses the brand-gold tint with hierarchical rendering

#### Scenario: Non-hero accepts system styling
- GIVEN a non-hero empty or error surface
- WHEN the CUV renders
- THEN it uses default system icon styling (acceptable)

### Requirement: Component Deletion & Validation Gate

After all 63 sites plus EventListView's filtered block migrate, `EmptyStateView.swift`
MUST be deleted with zero `EmptyStateView(` references remaining. `xcodebuild test` MUST
pass green; all former `EmptyStateView` sites MUST render `ContentUnavailableView`.

#### Scenario: EmptyStateView deleted with zero references
- GIVEN all 63 sites and the EventListView filtered block are migrated to CUV
- WHEN PR3 ships
- THEN `EmptyStateView.swift` is removed from the package
- AND a grep for `EmptyStateView(` across `ios/Packages/` returns zero matches

#### Scenario: Build & test green
- GIVEN migration is complete and the component is deleted
- WHEN `xcodebuild test` runs
- THEN it passes with no new failures
- AND all 63 former `EmptyStateView` sites render `ContentUnavailableView`
