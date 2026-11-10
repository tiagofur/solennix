# Proposal: ios-empty-states (Sprint 4)

## Intent

Adopt Apple's `ContentUnavailableView` (CUV) wherever the app shows an empty or error state, retiring the custom `EmptyStateView`. CUV is the canonical first-party pattern (Mail/Files/News): correct scroll, spacing, Dynamic Type, and `.search(text:)` clear-query — for free. Removes the audit's top "not-Apple feel" tell. True scope is **63 call sites** (audit undercounted ~2x) + 1 hand-rolled filtered state.

## Scope

### In Scope
- Migrate all **63** `EmptyStateView(...)` call sites (22 files) → `ContentUnavailableView`.
- Migrate EventListView's hand-rolled filtered-empty block (lines 746–779).
- Field map: icon→`systemImage`, title→`title`, message→`description`, action→`button`/`actions`.
- `.search(text:)` for pure-search sites; plain CUV + clear-filters action for mixed/filter.
- Preserve 8 first-run CTAs + EventListView's filtered-vs-truly-empty distinction.
- **DELETE** `EmptyStateView.swift` once all sites migrate (test-safe).
- Delivered as 3 stacked PRs by category (force-chained, ≤800 lines/PR).

### Out of Scope
- Sprint 5 (rotation/stretch, contrast); non-empty-state UI; no domain/DB/API change.
- Android/Web parity — CUV is SwiftUI-native; parity rule governs shared domain, not native UI primitives.
- Global Search tab recents — owned by `search-empty-state`.

## Capabilities

### New Capabilities
- `ios-empty-states`: canonical ContentUnavailableView empty/error states across list & detail screens; removal of custom EmptyStateView.

### Modified Capabilities
None. (`search-empty-state` covers the global search-tab surface and is NOT changed here.)

## Approach

**Direct migration, not a wrapper** — a wrapper would mute the audit without delivering CUV benefits. Per the taxonomy (24 ERROR / 11 SEARCH / 28 TRULY-empty), ship category-by-category in 3 stacked PRs:

1. **PR1 Search/Filtered** (~12–15 sites) — highest user-felt value; `.search(text:)` for pure-search, plain CUV + clear action for mixed/filter.
2. **PR2 Truly-empty** (28) — teaching message; fold first-run CTAs into `actions:`.
3. **PR3 Error** (24) + delete `EmptyStateView.swift`.

iOS 17 target → CUV fully available, no `@available` guards.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `ios/Packages/SolennixDesign/.../Components/EmptyStateView.swift` | Removed | Deleted in PR3 |
| 22 files under `ios/Packages/SolennixFeatures/...` | Modified | 63 sites + EventListView filtered block |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Brand-gold `iconColor` + `.hierarchical` lost (CUV `systemImage` is monochrome) | High | `.symbolRenderingMode(.hierarchical)` + `.tint` on hero screens; accept system styling elsewhere |
| 8 first-run CTAs (separate NavigationLink) misplaced | Med | Move into CUV `actions:`; verify per screen |
| EventListView filtered-vs-truly-empty blurs | Med | Distinct variants: filtered→clear, truly-empty→teaching |
| 63-site mechanical diff → review fatigue | Med | Category-split PRs, each ≤800 lines |
| Mixed filter sites wrongly use `.search(text:)` | Low | Branch on filter type (4 Product/Inventory sites) |

## Rollback Plan

Each PR is independent — `git revert` it. PR3 (delete) ships last; reverting restores `EmptyStateView.swift`. No schema migration.

## Dependencies

- iOS 17 deployment target (confirmed).

## Success Criteria

- [ ] Zero `EmptyStateView(` references; component deleted.
- [ ] Every list/detail empty + error surface uses ContentUnavailableView.
- [ ] Pure-search sites clear via `.search(text:)`; mixed-filter show clear action.
- [ ] 8 first-run CTAs + EventListView filtered distinction preserved.
- [ ] App builds; no visual regression.
