# Proposal: bottom-nav-search (iOS)

> **Scope lock:** iOS-only for this change. Android + Web parity is intended and
> tracked as **separate follow-up changes** (see Out of Scope). Approach is
> **most Apple-native**. Products/Inventory stay behind More.

## Intent

iOS has 4 bottom-nav tabs; Apple HIG prioritizes a search-role tab when ≤5 tabs.
Today global search is a top-bar `.searchable` that pushes a destination —
discoverable, but not first-class in the nav. Move **global** search into the
bottom nav as an Apple-native destination; **keep** local list filtering where it
already lives. No backend change (`GET /api/search?q=` already covers all entities).

## Scope

### In Scope (iOS only)
- Add `Tab(role: .search)` global search destination in `CompactTabLayout` (iOS 26+).
- Wire `.searchable(text:)` on `TabView` + `.tabViewSearchActivation(.searchTabSelection)` (iOS 26+).
- 5th-tab fallback (magnifier icon → `SearchView`) for iOS 17–25 (no search role).
- Reuse existing `SearchView`/`SearchViewModel` → `GET /api/search?q=`.
- Add an **entity-type filter (scope) control** to `SearchView` (Apple-native `.searchScope`)
  so users can narrow results to clients / events / products / inventory (or all).
- Preserve local `.searchable` in `EventListView` / `ClientListView` (unchanged).

### Out of Scope (follow-up changes, parity intent)
- **Android** bottom-nav search (Material-native) — separate change. Note: Android
  has 5 tabs incl. Calendar; parity may require Calendar-tab unification first.
- **Web** mobile bottom-tab search (desktop Command Palette unchanged) — separate change.
- Products/Inventory promotion to tabs (stays behind More — adding slots re-triggers overflow).
- iPad `SidebarSplitLayout` (no bottom nav; compact/iPhone only).

## Capabilities

### New Capabilities
- `bottom-nav-search`: Global search destination in the bottom nav + preserved local
  in-list filtering; iOS 26 search-role semantics and iOS 17–25 fallback. Android/Web
  satisfy the same capability later via delta specs.

### Modified Capabilities
- None.

## Approach & Key Decisions

The original idea — one morphing nav search field — is **not** Apple-native.
`Tab(role: .search)` is a **destination**, not a shared overlay. Resolution =
**two native affordances**:

| Affordance | Location | Scope | Apple pattern |
|---|---|---|---|
| Global search | `Tab(role: .search)` (iOS 26) / 5th tab (17–25) | Dashboard + all non-list contexts; reuses `SearchView` | search-role tab |
| Local filter | `.searchable` inside each list's `NavigationStack` | Events, Clients | standard list search |

"Context-dependent" = global search lives in the nav search tab; local filtering
lives where the user views a list. **Both are native.** Local `.searchable` is
version-independent. Search results render INSIDE the search tab (destination, not overlay).

**Legacy fallback (iOS 17–25):** regular 5th tab with magnifier icon presenting the
same `SearchView`.

## Confirmed Product Decisions (review round)

| Decision | Resolution | Note |
|---|---|---|
| Search-tab empty state (no query) | **Blank** for this slice | Recents / suggested entities **registered as a future enhancement** (not a separate change yet); empty state renders a clean surface ready to host them later. |
| Search-text persistence | **Clears on tab exit** | Matches Apple's restore-to-previous-tab behavior; `SearchView` owns its text. |
| Global results scope | **Filterable by entity type** | `.searchScope` control (all / clients / events / products / inventory). Was assumed "always all 4" — changed per user. |
| Search history / recents | **Deferred** | Out of scope for this change. |

## Affected Areas

| Area | Impact | Notes |
|---|---|---|
| `ios/.../Navigation/CompactTabLayout.swift` | Modified | Add search-role/5th tab; wire `.searchable`+activation; retire Home top `.searchable` submit-to-push |
| `ios/.../Navigation/Route.swift` | Modified | Likely add `.search` tab case + icon/title |
| `ios/.../Design/ViewModifiers.swift` | Modified | Reuse `searchMinimizedIfAvailable` |
| `EventListView` / `ClientListView` | Unchanged | Local `.searchable` stays |
| Backend / Android / Web | None | Full file list in `exploration.md` |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| 4+1=5 slot fit unverified (prior 5+1=6 overflowed iOS 26.5) | Med | **Spike first** on sim/device before committing |
| Search role still re-triggers overflow despite pinning | Med | Spike validates; fall back to plain 5th tab if needed |
| "Previously selected tab" restore vs existing pop-to-root-on-retap | Med | Design phase specifies state machine; test both behaviors |
| Shared search-text ownership (nav field vs `SearchView`) | Med | `SearchView` owns its text; nav passes initial seed only |
| iPad sidebar search regression | Low | Regression test on regular size class |

## Rollback Plan

Revert `CompactTabLayout.swift` / `Route.swift` to 4 tabs + top `.searchable`.
`SearchView` and backend untouched. Single-commit revert.

## Dependencies

- iOS 26 SDK / Xcode for `Tab(role: .search)` + `.tabViewSearchActivation(.searchTabSelection)`.

## Success Criteria

- [ ] Tapping search tab opens global search; results render in-tab across all 4 entities.
- [ ] Events/Clients local `.searchable` still filters in-place.
- [ ] iOS 17–25 fallback shows a working search tab.
- [ ] 5-slot fit confirmed on device; no overflow.
- [ ] iPad sidebar search unregressed.
