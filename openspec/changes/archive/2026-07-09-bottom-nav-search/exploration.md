# Exploration: bottom-nav-search

> Move search INTO the bottom navigation bar (currently `.searchable` at the top),
> with context-dependent behavior: **local** filtering on item-list screens
> (Events, Clients, Products, ...), **global** app-wide search elsewhere
> (Dashboard, ...). Cross-platform: iOS, Android, Web. Read-only exploration.

---

## Current State

### iOS (SwiftUI, iOS 17+ / 26+ dual-branch)

**Tab bar — `ios/Solennix/Navigation/CompactTabLayout.swift`**
- `Tab` enum (`ios/Solennix/Navigation/Route.swift`) has exactly **4 cases**:
  `home`, `events`, `clients`, `more`. Icons `house.fill`, `party.popper.fill`,
  `person.2.fill`, `ellipsis`. **No `.products`, no `.search`.**
- Two parallel builders keyed off `#available(iOS 26)`:
  - `ios26TabView` — `TabView(selection:)` with `SwiftUI.Tab(_:systemImage:value:)`
    builder + `.tabBarMinimizeBehavior(.onScrollDown)`.
  - `legacyTabView` (iOS 17–25) — `TabView` + `.tabItem { Label }`.
- Both share the same per-tab content builders (`homeTabContent`, etc.), so
  structure can't drift between branches.
- `ios26TabSelection` / `legacyTabSelection` custom bindings pop-to-root on
  same-tab re-tap.
- **Lines 65–69 (known fact, confirmed):** a prior `Tab(role: .search)` was
  REMOVED. With 5 regular tabs + search role = 6, iOS 26.5 spawned a "Más"
  overflow on iPhone; the search role did **not** exempt it from the 5-slot
  limit. Search stayed on `.searchable`. Now there are only 4 regular tabs,
  so 4 + 1 search-role = 5 (proposed fit — still to be validated on device).

**Search today (3 distinct mechanisms on iOS):**
1. **Home/Dashboard → GLOBAL.** `homeTabContent` applies
   `.searchable(text: $homeSearchText)` + `.searchMinimizedIfAvailable()`,
   `.onSubmit(of: .search)` → `appendSearchRoute(...)` pushes
   `Route.search(query:)` onto `homePath`. (CompactTabLayout.swift:159–163)
2. **Events → LOCAL.** `EventListView` owns `.searchable(text: $viewModel.searchQuery)`
   bound to `EventListViewModel.searchQuery` → filters the already-loaded list
   client-side (`viewModel.filteredEvents`). No backend call.
3. **Clients → LOCAL.** `ClientListView` owns `.searchable(text: $viewModel.searchText)`
   bound to `ClientListViewModel.searchText` → `viewModel.filteredClients`.
   Client-side filtering.

**Global search destination.** `Route.search(query: String = "")` (defined in
`SolennixCore/Route.swift`) → `RouteDestination.swift:105` → `SearchView(initialQuery:)`.
`SearchView` (`SolennixFeatures/Search/Views/SearchView.swift`) renders its OWN
custom search field (not `.searchable`) + results list → `SearchViewModel` →
backend `GET /api/search?q=`. Results grouped into clients/events/products/inventory.

**`searchMinimizedIfAvailable()`** (`SolennixDesign/ViewModifiers.swift:95`):
applies `.searchToolbarBehavior(.minimize)` on iOS 26+ only, no-op on 17–25.
Collapses the top search field into a compact magnifier button that expands on
tap (Maps/Music pattern). Must be applied immediately after `.searchable`.

**iPad / regular size class** (`SidebarSplitLayout.swift`): `NavigationSplitView`
sidebar (`SidebarSection.mainSections` = dashboard, events, clients, personnel,
products, inventory, paymentInbox, eventFormLinks, reviews) + the detail uses a
single `.searchable` → `Route.search` (GLOBAL). No tab bar on iPad — this change
is iPhone/compact-only by nature.

**Products on iOS.** EXISTS as `Route.productList/.productDetail/.productForm` and
`SidebarSection.products`, reachable from the **More** menu
(`SidebarSection.moreMenuCatalogSections` = products, inventory, paymentInbox,
personnel, eventFormLinks, reviews) + settings. NOT a top-level tab.

### Android (Jetpack Compose, Material 3)

**Bottom nav — `CompactBottomNavLayout.kt` + `TopLevelDestination.kt`**
- `TopLevelDestination` enum has **5 entries**: `HOME`, `CALENDAR`, `EVENTS`,
  `CLIENTS`, `MORE`. (**Parity gap:** Android still exposes a separate Calendar
  tab; iOS unified Calendar into Events — see `unify-events-calendar-ios` change.)
- `NavigationBar` + `NavigationBarItem`; only shown when `isAtTopLevel`.
- **No search item in the bottom nav.** A `QuickActionsFAB` (new event / quick
  quote) sits at `FabPosition.End`, hidden on More/Clients.
- Bottom bar + NavHost (string routes) in one `Scaffold`.

**Search today (Android):**
- Purely **GLOBAL**, surfaced per-screen as a top-bar affordance: every screen
  takes an `onSearchClick` callback → `navController.navigate(buildSearchRoute())`
  → route `"search?query={query}"` → `SearchScreen` → backend `/api/search?q=`.
- `buildSearchRoute(query)` = `"search?query=" + Uri.encode(query)`.
- **No local in-list filtering** exposed via navigation (list screens filter
  client-side internally only where their own VM supports it).

**Products on Android.** EXISTS (`ProductListScreen`, `ProductDetailScreen`,
`ProductFormScreen`), reachable via More → `onProductsClick` → `"products"`.
NOT a top-level destination.

### Web (React 19 + TS)

**Layout — `web/src/components/Layout.tsx`**
- Desktop: persistent sidebar with **all** sections as flat links (dashboard,
  calendar, events, clients, staff, products, inventory, forms, payments inbox,
  reviews, settings, [admin]). Collapsible.
- Mobile: hamburger drawer + a separate `BottomTabBar` component.
- Search: topbar has a **fake search button** (styled `<button>`) that opens a
  `CommandPalette` (Cmd/Ctrl+K). A real `/search` route → `SearchPage` also exists.
- `searchService.ts` → `GET /api/search?q=` → maps clients/events/products/inventory.

**Products on Web.** EXISTS (`/products`, `/products/new`, `/products/:id`,
`/products/:id/edit`). In the sidebar (not behind a More menu).

### Backend (Go 1.25 + Chi)

Two search endpoints (router.go):
1. **`GET /api/search?q=`** → `SearchHandler.SearchAll`
   (`internal/handlers/search_handler.go`). Fan-out parallel search across
   **clients, products, inventory, events** (max 6/type), scoped by `user_id`.
   This is the GLOBAL unified search all three clients call.
2. **`GET /api/events/search?q=&status=&from=&to=&client_id=`** →
   `crudHandler.SearchEvents` — advanced single-entity event filtering.

Local in-list search (iOS Events/Clients) is **client-side filtering** of
already-loaded data; it does NOT hit the backend.

**Searchable entities today:** clients, products, inventory, events.

---

## Affected Areas

- `ios/Solennix/Navigation/CompactTabLayout.swift` — add search-role/5th tab;
  re-wire `.searchable` submit behavior to be context-dependent on `selectedTab`;
  add a per-tab (or shared) search-text state. Core of the iOS change.
- `ios/Solennix/Navigation/Route.swift` — likely add `.products` to the `Tab`
  enum (if Products becomes a tab) and/or a `.search` tab case; update
  `iconName`/`title`.
- `ios/Solennix/Navigation/SidebarSplitLayout.swift` — iPad already has global
  search; only touched if context-dependent behavior must extend to regular size
  class (probably out of scope — iPad uses sidebar, no bottom nav).
- `ios/.../Features/Events/Views/EventListView.swift`,
  `ios/.../Features/Clients/Views/ClientListView.swift` — local `.searchable`
  bindings may need to relocate to the tab layout to share a single field.
- `ios/.../Design/ViewModifiers.swift` (`searchMinimizedIfAvailable`,
  `solennixSearchable`) — may need a new modifier for bottom-nav search.
- `android/.../ui/navigation/CompactBottomNavLayout.kt` +
  `TopLevelDestination.kt` — add a search `NavigationBarItem` (or docked
  SearchBar); rewire per-screen `onSearchClick` to be context-aware.
- `web/src/components/Layout.tsx` + `BottomTabBar.tsx` — add search to mobile
  bottom tab bar; Command Palette stays for desktop.
- Backend — **no change required.** `/api/search?q=` already covers all
  entities; local filtering is client-side.

---

## Approaches

### 1. iOS 26 `Tab(role: .search)` shared-field (HIG-native, iOS-only optimal)
- **What:** Add `Tab(role: .search)` to `ios26TabView`. The search-role tab
  renders a search surface in the tab bar that expands on tap. Make the
  presented search **context-dependent**: when `selectedTab` is a list screen,
  typing filters that screen in place (local); otherwise push `Route.search`
  (global).
- **Pros:** Matches Apple HIG precisely; single system-owned field; reuses
  `.searchToolbarBehavior(.minimize)` vocabulary already in the app.
- **Cons:** **Semantic risk** — `Tab(role: .search)` presents its OWN search
  interface; it is NOT a transparent shared field overlaid on the active tab.
  Context-dependent "filter the active tab" behavior may fight the system's
  expectation that the search tab is a distinct destination. The 4+1=5 fit
  must be re-validated on device (prior failure was 5+1=6). No equivalent on
  Android/Web → cross-platform divergence.
- **Effort:** Medium–High.

### 2. Plain 5th "Search" tab on all platforms (cross-platform parity)
- **What:** Add a regular 5th tab with a magnifier icon. Tapping it presents
  the global `SearchView`/`SearchScreen`/`SearchPage`. Keep existing per-screen
  LOCAL `.searchable`/filtering untouched. Optionally pre-seed the search tab
  with the active list screen's current query.
- **Pros:** Identical UX across iOS/Android/Web; lowest risk; reuses the
  already-built global search; 5 slots fit cleanly (4 + 1). Local filtering
  stays where it already works.
- **Cons:** "Context-dependent" behavior is weaker — the search tab is always
  global; local filtering still lives in each list screen's top bar. Does not
  fully satisfy "search moved INTO the nav behaves per-context" intent.
- **Effort:** Low–Medium.

### 3. Hybrid: search-role tab (iOS 26) + regular search tab (iOS legacy / Android / Web)
- **What:** iOS 26 gets `Tab(role: .search)` (Approach 1); iOS 17–25 + Android +
  Web get a regular 5th search tab (Approach 2). A shared context-resolver
  decides local-vs-global based on the active destination.
- **Pros:** Best-in-class on iOS 26 without breaking parity; graceful legacy
  fallback.
- **Cons:** Two code paths to maintain; context-resolver logic must be
  platform-portable; larger surface = bigger review (relevant to 800-line
  force-chained budget).
- **Effort:** High.

---

## Recommendation

Defer the final decision to the proposal phase, but surface this tradeoff to the
user explicitly: **the core tension is that iOS 26's `Tab(role: .search)` is a
destination, not a shared field** — so true "filter the active screen" semantics
do not map cleanly onto the search-role tab. If the user's priority is HIG
fidelity on iOS 26, go with Approach 1/3; if the priority is uniform
cross-platform behavior, Approach 2 is simpler and safer. Products is NOT a tab
today anywhere — adding it as a tab would consume a slot and re-trigger the
overflow problem (recommend keeping Products behind More/sidebar).

---

## Risks

- **iOS 26 search-role 5-slot fit unverified.** Prior failure (5+1=6 overflow)
  was real on iOS 26.5. 4+1=5 is *expected* to fit, but the proposal/design
  MUST validate on a device/simulator before committing, and confirm the search
  role genuinely does not count against the slot limit on the target OS.
- **`Tab(role: .search)` is a destination, not a shared field.** Making it
  "filter the active tab in place" may require fighting SwiftUI's search-tab
  semantics (the search tab presents its own search experience). High
  implementation uncertainty — needs an iOS 26 spike.
- **Context-dependent contract is ambiguous for pushed/detail screens.** If the
  user is deep in `eventDetail`, is search local (n/a — no list) or global?
  Needs a precise rule (e.g., local only at list-screen roots; global otherwise).
- **Cross-platform parity gaps pre-exist.** Android has 5 tabs incl. Calendar
  (iOS has 4, unified). Adding a search tab to Android = 6 → overflow. Android
  parity work likely needs Calendar-tab removal first, or a different slot
  strategy. This is a **blocker for a clean cross-platform rollout** and must be
  resolved in the proposal.
- **Shared local-search state across tabs.** Moving each screen's `.searchable`
  binding up to the tab layout risks losing per-screen filter state and breaks
  the existing `EventListViewModel.searchQuery` / `ClientListViewModel.searchText`
  ownership. Needs careful state ownership design.
- **iPad/regular size class unaffected.** This change is compact-only; iPad uses
  the sidebar. Ensure the context-dependent behavior does not accidentally
  regress `SidebarSplitLayout`'s global `.searchable`.

---

## Ready for Proposal

**Yes** — with two questions for the user that the orchestrator should surface:

1. **Priority: HIG fidelity (iOS 26 search-role, Approach 1/3) vs. uniform
   cross-platform behavior (Approach 2)?** This decides the whole architecture.
2. **Android Calendar-tab conflict:** Android currently has 5 tabs (incl.
   Calendar). Adding search there overflows. Should this change also remove the
   Android Calendar tab (parity with the iOS unification), or keep Android at a
   non-tab search affordance?

No backend work is needed; `/api/search?q=` already returns all four entities.
