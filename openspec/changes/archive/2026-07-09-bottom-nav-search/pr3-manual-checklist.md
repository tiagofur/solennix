# PR3 Verification — bottom-nav-search (automated vs manual)

> Strict-TDD change. This record distinguishes what was **automated** (XCTest /
> XCUITest, deterministic, green) from what remains **human-manual** (needs a
> live backend, system-driven nav state, or a non-iOS-26 simulator) per the
> SDD testing strategy.

Build base: `main` @ `2779c35e` (PR1 #613 + PR2 #615 merged). PR3 branch:
`feat/bottom-nav-search-pr3`. Simulator: `iPhone 17 Pro Max`, iOS 26.5, Xcode 26.5.

---

## AUTOMATED (green, permanent regression guards)

| Req | Test | Target | Verdict |
|-----|------|--------|---------|
| **R5** Entity-type filtering | `SearchScopeFilterTests` (7) | `SolennixTests` | ✅ all/clients/events/products/inventory narrow correctly; nil-results stay nil (no re-query) |
| **F-1** Spotlight clears stale query | `SpotlightClearOnExitTests` (5) | `SolennixTests` | ✅ leaving `.search` via Spotlight clears; non-search origins don't; end-state zeroes query |
| **R7** Text clears on tab exit | `ClearOnExitTests` (7) — PR2 | `SolennixTests` | ✅ (unchanged, re-run green) |
| **R3/R9** resolveTabChange reducer | `ResolveTabChangeTests` (6) — PR1 | `SolennixTests` | ✅ (unchanged, re-run green) |
| Tab metadata | `TabMetadataTests` (4) — PR1 | `SolennixTests` | ✅ |
| **R6** Empty query = blank surface | `SearchTabEmptyStateTests` (1) | `SolennixUITests` | ✅ `cells.count == 0`, no "Sugerencias" header. Evidence: `pr3-empty-state-pr3.png` |
| **R2** 5-slot fit, no overflow | `TabBarSlotFitTests` (1) | `SolennixUITests` | ✅ `count=5`, labels=`["Inicio","Eventos","Clientes","Más","Buscar"]`. Evidence: `pr3-slotfit-pr3.png`, `pr3-slotfit-pr3-labels.txt` |

Full scheme `xcodebuild test` → **TEST SUCCEEDED** (see `executive_summary` for counts).

**API symbol verified against live iOS 26.5 SDK** (`SwiftUI.swiftmodule`): the
scope control is `searchScopes(_:scopes:)` (**plural**, iOS 16.0+), tagged with
`.tag()` — NOT the singular `.searchScope($scope)` referenced in `design.md`.
Recorded as a verified deviation. No `#available` guard needed (iOS 16+).

---

## HUMAN-MANUAL (not automatable in this environment — run before merge on a device/sim with a backend)

These need either a running backend with seed data, system-driven dismiss/restore
nav state, or an iOS 17–25 / iPad simulator that is not provisioned in this
agent environment. Each has explicit steps + EXPECTED result.

### R4 — Global search results render in-tab + selecting opens detail
**Why manual:** the search calls the real `GET /api/search?q=`; with no backend
the query returns nothing, so "results render across 4 entities" cannot be
asserted deterministically.
**Steps:**
1. Run the backend locally (or point the app at a seed-data environment).
2. Open the app → tap the **Buscar** tab → type a query matching clients, events, products, AND inventory.
3. **EXPECTED:** four grouped sections render in-tab (Clientes, Eventos, Productos, Inventario); the scope bar (`searchScopes`) appears once text is entered.
4. Tap a result.
**EXPECTED:** that entity's detail screen pushes within the search tab's nav stack.
5. Change the scope to e.g. **Clientes**.
**EXPECTED:** only the Clientes section remains.

### R3 — Dismiss restores previous tab + nav state
**Why manual:** relies on the system-managed `.tabViewSearchActivation` dismiss gesture, not reproducible via deterministic XCUITest taps.
**Steps:**
1. On the **Eventos** tab, push into an event detail.
2. Tap **Buscar**, type a query.
3. Dismiss search (tap Cancel / the prior tab).
**EXPECTED:** the **Eventos** tab is re-selected AND the prior event detail is restored (not reset to root) — `resolveTabChange` preserved `eventsPath` on the search transition.

### R9 — Re-tap-after-restore still pops to root (F1 edge)
**Why manual:** depends on `selectedTab` sync after the system restore.
**Steps:** after the R3 restore above (on Eventos detail), tap **Eventos** again.
**EXPECTED:** the Eventos stack pops to root. Re-tap-pop coexists with search dismiss-restore.

### R8 — Local in-list `.searchable` (Events/Clients) unchanged
**Why manual:** needs a loaded list (backend data) to filter.
**Steps:** on Eventos/Clientes with a loaded list, type into the list's local search field.
**EXPECTED:** the list filters client-side in place; NO network search call. Files `EventListView.swift` / `ClientListView.swift` untouched (verified by diff).

### R1 (iOS 17–25 fallback) — regular 5th magnifier tab
**Why manual:** only an iOS 26.5 sim is booted here; the legacy branch needs an iOS 17–25 runtime.
**Steps:** run on an iOS 17–25 simulator.
**EXPECTED:** a plain 5th tab with a magnifier icon is present (no search-role, no `.tabViewSearchActivation`), sharing the same `searchTabContent`.

### R10 — iPad sidebar search regression guard
**Why manual:** needs an iPad (regular size class) sim + the sidebar layout.
**Steps:** run on an iPad sim in regular size class; use the sidebar `.searchable`.
**EXPECTED:** existing `.searchable` → `Route.search` behavior preserved. `SidebarSplitLayout.swift` untouched (verified by diff); `CommonStrings.globalSearchPrompt` retained.

### F-1 (Spotlight) — live Spotlight deep-link clears search
**Why manual:** triggering a real Spotlight continuation is not deterministic in XCUITest; the pure decision is unit-tested (`SpotlightClearOnExitTests`).
**Steps:** with a query on the search tab, trigger a Spotlight deep-link (index an item, open it from Spotlight).
**EXPECTED:** the app lands on the home tab+detail AND the search tab's query is empty on return (not stale).

---

## Files touched in PR3
- `ios/.../Search/ViewModels/SearchViewModel.swift` — `SearchScope` enum + `filteredResults(for:)` + scope titles
- `ios/.../Search/SearchStrings.swift` — `scopeAll`
- `ios/.../Search/Views/SearchView.swift` — `.searchScopes` bar + scope-aware `resultList`
- `ios/Solennix/Navigation/Route.swift` — `SpotlightNavigationPlan` + `planSpotlightTransition` (F-1)
- `ios/Solennix/Navigation/CompactTabLayout.swift` — F-1 wiring (both branches) + retire Home `.searchable`
- `ios/SolennixTests/{SearchScopeFilterTests,SpotlightClearOnExitTests}.swift` — new
- `ios/SolennixUITests/SearchTabEmptyStateTests.swift` — new (R6)
- `openspec/changes/bottom-nav-search/{pr3-empty-state-pr3.png, pr3-slotfit-pr3.png, pr3-slotfit-pr3-labels.txt, pr3-manual-checklist.md}` — evidence + this doc
