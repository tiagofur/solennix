# Tasks: bottom-nav-search (iOS)

> Global search becomes a 5th bottom-nav destination on iPhone (compact), reusing
> `SearchView` + `GET /api/search?q=`. iOS 26+ = `Tab(role: .search)`; iOS 17–25 =
> regular 5th magnifier tab. A **spike gates the branch**. Strict TDD: pure logic
> is XCTest RED→GREEN→REFACTOR; visual/restore behaviors are manual (live iOS 26 sim).
> Local in-list `.searchable` (Events/Clients) + iPad sidebar = untouched.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines (total / per PR) | ~530 total · PR1 ~140 · PR2 ~200 · PR3 ~190 |
| 800-line budget risk (per PR) | Low — each PR < 400 |
| 400-line budget risk (per PR) | Low |
| Chained PRs recommended | Yes (spike gates branch + independent deliverables + force-chained) |
| Suggested split | PR 1 → PR 2 → PR 3 (stacked to main) |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main (PR #N+1 targets main tip after PR #N merges) |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

Chain map (each PR body MUST include its own 📍 copy per chained-pr skill):
`main ◀── PR1 (spike+reducer) ◀── PR2 (tab UI+context) ◀── PR3 (scope+cleanup)`

### Suggested Work Units

| Unit | Goal | PR | Base | Req covered |
|------|------|----|------|-------------|
| 1 | Spike verdict + `Tab.search` + pure `resolveTabChange` reducer (TDD) | PR1 | main | R1, R3, R9 |
| 2 | Search tab in both branches + `SearchView.context=.bottomNavTab` + clear-on-exit | PR2 | main (post-PR1) | R1(both), R4, R6, R7 |
| 3 | `.searchScope` filter + blank empty state + retire Home `.searchable` + manual checklist + PRD | PR3 | main (post-PR2) | R2, R5, R6, R8, R10 |

## Phase 1 — PR1: Spike + Foundation & Pure Reducer (base: main)

- [x] **1.1 Spike (GATING)** — Add minimal `Tab(role: .search) { Text("spike") }` to `ios26TabView` in `CompactTabLayout.swift`; run on **iOS 26 iPhone simulator**. PASS = exactly 5 directly-tappable items render with NO 6th system-overflow item (the legit `.more` "Más" tab IS one of the 5 and is expected — it is NOT an overflow), search pinned trailing → ship **Primary** (`Tab(role:.search)`). FAIL = a 6th overflow item appears → ship **Fallback** (regular 5th tab). Record verdict + verify exact API symbols (`.tabViewSearchActivation(.searchTabSelection)`, `.searchScope($scope)` signature) in PR1 notes. Rollback: delete spike line. *(Gates R1 branch; validates R2)*
- [x] **1.2 RED** — Create `ios/SolennixTests/ResolveTabChangeTests.swift`: assert re-tap resets (events→events resets events), search-enter preserves (events→search keeps path), search-leave preserves (search→events keeps), regular→regular resets (events→clients resets events). Run → fail (no `resolveTabChange`). *(R3, R9)*
- [x] **1.3 GREEN** — `ios/Solennix/Navigation/Route.swift`: add `case search` to `Tab` enum + `iconName == "magnifyingglass"` + `title == CommonStrings.tabSearch` (string already exists). Add `struct TabSelectionEffect { var resetTab: Tab? }` + `func resolveTabChange(current:next:)` (search-scoped: re-tap→reset; `next==.search||current==.search`→preserve; else reset current). `CompactTabLayout.swift`: route both `ios26TabSelection` + `legacyTabSelection` `else` branches through `resolveTabChange`. Run 1.2 → green. *(R1, R3, R9)*
- [x] **1.4 REFACTOR + commit** — Add `TabMetadataTests` (icon/title asserts); dedupe the two bindings around `resolveTabChange`. Work-unit commit: `feat(nav): add search tab enum + resolveTabChange reducer with tests`. `xcodebuild test` green.

## Phase 2 — PR2: Search Tab UI + Presentation Context (base: main, post-PR1)

- [x] **2.1 iOS 26 search tab** — `CompactTabLayout.swift`: add `@State private var searchPath = NavigationPath()` + `resetPath(for:)` `case .search`. Add `Tab.search` to `ios26TabView` — Primary `Tab(role: .search) { searchTabContent }` (spike-pass) else regular `Tab(.search)`; add `searchTabContent` builder → `NavigationStack(path: $searchPath) { SearchView(context: .bottomNavTab) }`. iOS 26 wires `.searchable(text: $vm.query)` + `.tabViewSearchActivation(.searchTabSelection)` on the TabView. **On-device validation (REQUIRED, real app):** on the REAL app (debug/auth-bypassed build if needed — the real app is auth-gated, so the PR1 replica spike does NOT count), verify **exactly 5 directly-tappable tab items** render with **NO 6th system-overflow item**; **RETAIN a screenshot + the recorded label list** in `openspec/changes/bottom-nav-search/`. If a 6th overflow appears → switch this PR to the regular 5th-tab Fallback. *(The legitimate `.more` tab labeled "Más" is one of the 5 and is EXPECTED — it is NOT an overflow.)* *(R1 iOS26, R2)*
- [x] **2.2 iOS 17–25 fallback** — `legacyTabView`: add `Tab.search` as regular 5th magnifier tab → `searchTabContent` (no role, no activation). *(R1 iOS17–25)*
- [x] **2.3 RED+GREEN (context)** — `Search/Views/SearchView.swift`: add `enum SearchPresentationContext { case pushed, bottomNavTab }` + `init(initialQuery:context:)` (default `.pushed` keeps callers). `.bottomNavTab` renders results in-tab (reuses `SearchViewModel`→`GET /api/search?q=` across 4 entities), selects open detail; omits custom `searchField`; structured blank surface for future recents. `query` already lives on `SearchViewModel`. *(R1, R4, R6 structure, R7 vm owns query)*
- [x] **2.4 RED+GREEN (clear-on-exit)** — `ClearOnExitTests`: assert query empty after leaving `.search`. `searchTabContent`: add `.onChange(of: selectedTab)` → when leaving `.search` call `vm.clearSearch()` (method already exists). Run → green. Commit: `feat(nav): present SearchView in bottom-nav tab with clear-on-exit`. *(R7)*

## Phase 3 — PR3: Scope Filter + Empty State + Cleanup (base: main, post-PR2)

- [x] **3.1 RED** — `ios/SolennixTests/SearchScopeFilterTests.swift`: stubbed grouped `SearchResults{clients,events,products,inventory}`; assert `filteredResults(for: .clients)` → clients only; `.all` → all four. Run → fail. *(R5)*
- [x] **3.2 GREEN** — `SearchViewModel.swift`: add `enum SearchScope: String, CaseIterable, Hashable { all, clients, events, products, inventory }` + `filteredResults(for:)` (client-side filter on already-grouped arrays, no re-query). `SearchView` `.bottomNavTab`: add `.searchScope($scope)` (iOS 26 guarded). Run 3.1 → green. *(R5)*
- [x] **3.3 GREEN (blank empty state)** — `.bottomNavTab` with empty query renders blank surface (no recents/suggestions/history); recents code stays dormant/hostable later. *(R6)*
- [x] **3.4 Cleanup — retire Home `.searchable`** — `CompactTabLayout.swift`: remove Home `.searchable(text: $homeSearchText...)` + `searchMinimizedIfAvailable()` + `homeSearchText` + `appendSearchRoute` + local `globalSearchPrompt` computed prop. Keep underlying `CommonStrings.globalSearchPrompt` (sidebar still uses it). `SidebarSplitLayout.swift` + `EventListView`/`ClientListView` = untouched. *(R7 no duplicate; R8/R10 untouched)*
- [x] **3.5 MANUAL checklist (live iOS 26 sim)** — Verify: (a) 5-slot fit = exactly 5 directly-tappable items and NO 6th system-overflow item (the legit "Más" more-tab is expected and is not an overflow), search tappable *(R2)*; (b) selecting search focuses field, dismissing restores prior tab + deep nav detail *(R3)*; (c) **after search→dismiss→restore, re-tap restored tab still pops to root (F1 edge) *(R9)***; (d) iOS 17–25 sim shows working 5th magnifier tab *(R1)*; (e) select result opens detail *(R4)*; (f) Events/Clients local `.searchable` filters in place, no backend call, no diff to those files *(R8)*; (g) iPad regular-size-class sidebar `.searchable`→`Route.search` unregressed *(R10)*. Record verdicts.
- [x] **3.6 PRD update** — `docs/PRD/11_CURRENT_STATUS.md`: record bottom-nav-search shipped (always-last task per config). Final commit: `feat(nav): add entity-type scope filter + blank empty state; retire Home searchable`.

## Verification

- Automated: `cd ios && xcodebuild test ...` (XCTest) — PR1 reducer/metadata, PR2 clear-on-exit, PR3 scope-filter suites green before each PR merges.
- Manual: Phase 3.5 checklist (visual slot-fit, focus, dismiss-restore, re-tap-after-restore, fallback, iPad) — only automated where the skill admits no automation.
- Every spec scenario (R1–R10) is mapped above; `sdd-verify` will diff implementation vs each scenario.
