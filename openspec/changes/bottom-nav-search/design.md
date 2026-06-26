# Design: bottom-nav-search (iOS)

> Lead-with-answer: global search becomes a **5th bottom-nav destination** on
> iPhone (compact), reusing `SearchView`. iOS 26+ uses `Tab(role: .search)` +
> `.tabViewSearchActivation(.searchTabSelection)`; a device **spike** gates the
> 5-slot fit (prior 5+1=6 overflowed iOS 26.5). On spike-fail / iOS 17–25 a plain
> regular 5th magnifier tab is used. Local in-list `.searchable` is untouched. No
> backend change.

## Technical Approach

Search becomes a destination, not an overlay. iOS 26 spike-pass → `Tab(role: .search)`
(system pins it trailing, supplies title/icon) with `.searchable`+`.tabViewSearchActivation`
driving native focus + dismiss-restore. Spike-fail or iOS 17–25 → regular 5th tab.
All branches share one `searchTabContent` builder and one `Tab.search` enum case.
Maps 1:1 to the proposal's "two native affordances"; satisfies all 10 spec requirements.

## Spike (RISK #1 — first implementation task)

Minimal `SwiftUI.Tab(role: .search) { Text("spike") }` added to the current 4-tab
`ios26TabView`, run on an **iOS 26 iPhone simulator**.

- **PASS**: **exactly 5 directly-tappable items** render (home, events, clients,
  more, search-magnifier pinned trailing) and **NO 6th system-overflow item**;
  every tab directly tappable → ship **Primary**. **Criterion note:** the legitimate
  `.more` tab is labeled **"Más"** and is *expected* (it IS one of the 5) — it is
  NOT an overflow. The overflow failure mode is a *6th* item that iOS spawns when
  the 5-slot limit is exceeded; "no Más" is therefore an ambiguous PASS criterion
  (a correct PASS necessarily *contains* a "Más") — validate by counting items, not
  by the absence of the "Más" label.
- **FAIL**: a 6th system-overflow item appears (i.e. more than the 5 expected items,
  including the "Más" more-tab) → ship **Fallback** (regular 5th tab).
- **API symbol check (F5)**: while spiking, confirm the exact SwiftUI symbol names against
  Apple docs — `.tabViewSearchActivation(.searchTabSelection)` (vs `.onSearchTabSelection`)
  and the `.searchScope($scope)` signature — and record the verified names for apply.

Both branches are fully designed below so apply proceeds regardless of the outcome.

## Architecture Decisions

| # | Decision | Choice | Rejected alternative | Rationale |
|---|---|---|---|---|
| 1 | Search-tab slot (iOS 26) | Primary `Tab(role: .search)`; Fallback regular 5th tab | Morphing shared field; >5 tabs | Apple-native; spike de-risks the overflow regression |
| 2 | Search-text ownership | `SearchViewModel.query` owns text; nav seeds **initial only** | Layout `@State searchText` hoisted into nav | Spec "SearchView owns its text"; never hoist local-list filter state |
| 3 | `.searchable` + activation wiring | `.searchable(text: $vm.query)` **inside** search-tab content; `.tabViewSearchActivation(.searchTabSelection)` on the `TabView` (iOS 26 spike-pass only) | `.searchable` on `TabView` bound to layout state | System field is the input; VM is authoritative; activation drives focus + dismiss-restore |
| 4 | State machine (collision fix) | `resolveTabChange` resets path **only on same-tab re-tap**; nav state preserved **ONLY for search transitions** (entering/leaving `.search`); regular tab→tab switches keep the existing reset behavior | Current `else` branch resets the leaving tab's path; applying preserve to ALL tabs (reviewer F2) | Required for spec "dismiss restores previous tab + nav state" **without** changing existing regular-tab UX (user chose minimal blast radius); re-tap-pop unaffected |
| 5 | `.searchScope` filter | `SearchScope` enum (all/clients/events/products/inventory); render only the selected group from already-grouped `SearchResults` | Re-query backend | `/api/search?q=` already returns all four; client filters grouped arrays |
| 6 | Empty state | Blank surface in `.bottomNavTab`; recents/suggestions code stays **dormant** (hostable later) | Render hints/recents now | Spec "empty = blank, no recents"; structured for the future enhancement |
| 7 | Home top `.searchable` | **Removed** (Home is non-list; search lives in the nav tab) | Keep as push-to-`Route.search` | Removes duplicate entry; iPad sidebar `.searchable` stays (regression guard) |
| 8 | iOS 17–25 | Regular 5th magnifier tab (no role, no activation) | Backport search role | Role + activation unavailable pre-iOS 26 |

### Decision 4 — state-machine collision (detailed)

The existing `ios26TabSelection` / `legacyTabSelection` do `resetPath(for: selectedTab)`
in the `else` (leave) branch — i.e. switching away **destroys** the leaving tab's nav
stack (a deterministic wipe on tab switch, **not** a concurrency race — reworded per
reviewer F3). That directly violates spec scenario *"Dismiss restores previous tab and nav
state"*: entering search would wipe `eventsPath`, so the system's restore lands at root,
not the prior detail. `tabViewSearchActivation` also mutates selection on dismiss, which
compounds this wipe.

**Resolution (scoped to search per user decision — minimal blast radius):** extract the
decision into a pure `resolveTabChange(current:next:)` that:
- resets the path **only when `current == next`** (re-tap → pop to root), AND
- preserves the leaving tab's path **only when the transition involves `.search`**
  (`next == .search` entering, or `current == .search` leaving), AND
- otherwise (regular tab → different regular tab) **resets the leaving tab** = the
  existing behavior, unchanged.

```swift
func resolveTabChange(current: Tab, next: Tab) -> TabSelectionEffect {
    if current == next { return .init(resetTab: next) }                       // re-tap → pop to root
    if next == .search || current == .search { return .init(resetTab: nil) }  // search transition → preserve
    return .init(resetTab: current)                                           // regular→regular → reset (unchanged)
}
```

Both bindings call it. Result: re-tap still pops to root (spec ✓); entering search
preserves `eventsPath` so system dismiss-restore reshows the deep detail (spec ✓); regular
tab→tab switches keep today's reset-on-switch UX (user-blessed scope, reviewer F2 resolved).

**Correctness note (reviewer F1):** spec R3 ("dismiss restores previous tab + nav state")
depends on the leaving tab's path surviving **entry** into search — which the `next == .search`
branch guarantees **regardless** of whether the binding's `set` fires on the system-driven
dismiss-restore. So even in the worst case (binding silent on restore), R3 holds. The one
residual edge case — `selectedTab` staying stale (=`.search`) if the restore bypasses the
binding, so a subsequent re-tap of the restored tab computes `resolveTabChange(.search, .events)`
→ no reset — is low-likelihood (contradicts SwiftUI's binding contract) and is covered by an
explicit **manual-checklist item** (Testing Strategy): *"after search→dismiss→restore, verify a
re-tap of the restored tab still pops to root."*

## Data Flow

```
┌─ TabView (iOS 26, spike-pass) ──────────────────────────┐
│  .tabViewSearchActivation(.searchTabSelection)           │
│  Tab(home) Tab(events) Tab(clients) Tab(more)            │
│  Tab(role:.search){ searchTabContent }   ← pinned trail  │
└──────────────────────────────────────────────────────────┘
           │ select search → system focuses field
           ▼
searchTabContent: NavigationStack(path:$searchPath){
    SearchView(context:.bottomNavTab)          // owns vm.query
      .searchable(text:$vm.query)              // system input field
      .searchScope($scope)                     // entity-type filter
}
           │ vm.query ── debounce 350ms ──▶ GET /api/search?q=
           ▼
SearchResults{clients,events,products,inventory} ──▶ scope filter ──▶ List
           │ dismiss search → system restores previous tab + nav (no reset)
           ▼
onChange(leave .search) → vm.clearSearch()    // text clears on tab exit
```

## File Changes

| File | Action | Description |
|---|---|---|
| `ios/Solennix/Navigation/CompactTabLayout.swift` | Modify | Add `Tab.search` to both branches; new `searchTabContent` + `searchPath` + `resetPath(.search)` case; iOS 26 wires `.searchable`+`.tabViewSearchActivation` (spike-pass) else regular 5th tab; **refactor both selection bindings via `resolveTabChange` (reset on re-tap; preserve ONLY for search transitions; regular→regular reset unchanged)**; remove Home `.searchable` + `homeSearchText` + `appendSearchRoute` + now-dead `globalSearchPrompt`/`searchMinimizedIfAvailable` on Home (F4 — sidebar keeps its own copies) |
| `ios/Solennix/Navigation/Route.swift` | Modify | Add `Tab.search` case; `iconName = "magnifyingglass"`; `title = CommonStrings.tabSearch` |
| `ios/.../Search/Views/SearchView.swift` | Modify | Add `SearchPresentationContext`; `.bottomNavTab` uses `.searchable($vm.query)` + `.searchScope` + blank empty state, omits the custom `searchField`; add scope-filtered results |
| `ios/.../Search/ViewModels/SearchViewModel.swift` | Modify | Add `filteredResults(for: SearchScope)`; recents code stays dormant |
| `ios/.../Common/Localization/CommonStrings.swift` | Modify | Add `tabSearch` ("Buscar") |
| `ios/Solennix/Navigation/SidebarSplitLayout.swift` | None | Regression guard — untouched |
| `ios/.../Events/Views/EventListView.swift`, `.../Clients/Views/ClientListView.swift` | None | Local `.searchable` unchanged |
| `ios/SolennixTests/*` | Create | Selection-reducer, scope-filter, tab-metadata, clear-on-exit tests |

## Interfaces / Contracts

```swift
// Route.swift (app-local Tab enum)
case search
// iconName: "magnifyingglass", title: CommonStrings.tabSearch

public enum SearchPresentationContext { case pushed, bottomNavTab }

public enum SearchScope: String, CaseIterable, Hashable {
    case all, clients, events, products, inventory
}

// Pure, testable selection decision extracted from the bindings.
struct TabSelectionEffect { var resetTab: Tab? }
func resolveTabChange(current: Tab, next: Tab) -> TabSelectionEffect {
    if current == next { return .init(resetTab: next) }                       // re-tap → pop to root
    if next == .search || current == .search { return .init(resetTab: nil) }  // search transition → preserve
    return .init(resetTab: current)                                           // regular→regular → reset (unchanged)
}

// New per-tab nav state (CompactTabLayout) — add alongside the existing home/events/clients/more paths.
@State private var searchPath = NavigationPath()
// resetPath(for:) switch gains: case .search: searchPath = NavigationPath()

// SearchView gains a context parameter (default keeps current callers).
public init(initialQuery: String = "",
            context: SearchPresentationContext = .pushed)
```

## Testing Strategy (strict TDD, XCTest)

| Layer | What | How |
|---|---|---|
| Unit | `resolveTabChange`: re-tap resets, leave preserves | Pure-function tests, no SwiftUI |
| Unit | `SearchScope` narrows grouped results to one entity | Stubbed `SearchResults` |
| Unit | `Tab.search` icon/title; `vm.clearSearch()` zeroes query+results | Equality asserts |
| Unit | clear-on-exit fires when leaving `.search` | Reducer / onChange hook |
| Manual | 5-slot fit, focus, dismiss-restore nav state, **re-tap-after-restore still pops to root (F1)**, iPad sidebar unregressed | Spike + checklist (live iOS 26 sim) |

The visual slot-fit, field focus, and system-managed dismiss-restore need a live iOS 26
simulator, so they are **manual verification** (gated task + checklist). Every piece of
*decision logic* is pure and fully unit-tested, satisfying strict TDD where automation
is possible.

## Migration / Rollout

No data migration. Revert = restore 4 tabs + Home `.searchable` (single commit, per
proposal rollback plan). Force-chained PRs (apply phase sequences, ≤800 lines each):
**(1)** spike + `Tab.search` + `resolveTabChange` refactor + unit tests;
**(2)** search tab in both branches + `SearchView` presentation context;
**(3)** `.searchScope` + blank empty state + retire Home `.searchable` + manual checklist.

## Open Questions

- [ ] Exact attachment point of `.searchable` for `tabViewSearchActivation` (`TabView`
      vs search-tab content) — confirm in spike/apply via Apple docs; design supports either.
- [ ] Does iOS 26 `tabViewSearchActivation` dismiss auto-clear the field? We clear
      `vm.query` manually on tab exit regardless (safe either way).
- [ ] Does iOS 26.5 still count `Tab(role: .search)` against the 5-slot limit? The spike answers this.
