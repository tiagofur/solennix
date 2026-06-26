# Exploration: search-empty-state (iOS)

> **Lead-with-answer:** Apple's most universal, native search empty/initial state is
> **Recent Searches** — a `clock`-icon list, tappable to re-run, with a "Clear"
> affordance. That is exactly what Maps, Mail, Settings, Music, Files, and the App
> Store show when you open search with no query. It is also the **cheapest path for
> us**: Solennix **already persists recent queries** to `UserDefaults`
> (`solennix.search.recentQueries`, cap 6, dedup'd) on every successful search —
> the code is ~90% built; only the *display* in the bottom-nav tab is gated off.
> **Recommendation: ship a Recents-first empty state now (smallest valuable slice),
> keep browsable categories as an optional second slice.** No backend change.

---

## Quick path (what this change would do)

1. Open the global Search tab with an empty query.
2. See a **"Búsquedas recientes"** section: up to 6 recent query strings, each with a
   `clock.arrow.circlepath` icon; a **"Limpiar"** button clears them.
3. Tap a recent → fills the query + re-runs the search (Apple-standard behavior).
4. (Optional second slice) A **browse** row of category chips (Clients / Events /
   Products / Inventory) under the recents, like Maps' browsable categories.

---

## Current State (verified by reading the code)

The `bottom-nav-search` change (merged) made global search a 5th bottom-nav
destination. Its empty state is **intentionally blank** by design Decision 6 and spec
R6 ("blank for now, hostable later"). The hosting scaffolding already exists:

- **`SearchViewModel`** (`Search/ViewModels/SearchViewModel.swift`) holds:
  - `recentQueries: [String]` — public, loaded from `UserDefaults` in `init`.
  - `saveRecentQuery(_:)` — **called on every successful `search()`** (line ~248);
    dedups case-insensitively, inserts at front, caps at `maxRecentQueries = 6`,
    writes to `UserDefaults` key `solennix.search.recentQueries`.
  - `querySuggestions` — returns all recents when query is empty, filtered recents
    otherwise.
  - `clearRecentQueries()` — clears array + removes the `UserDefaults` key.
  - `applySuggestion(_:)` — sets `query` to the tapped string.
- **`SearchView`** (`Search/Views/SearchView.swift`) already renders a
  `suggestionsSection` (clock icon, "Sugerencias" header, "Limpiar" button) — but
  `resultList` **gates it to `presentationContext == .pushed` only**. In
  `.bottomNavTab` the empty query renders **no section → blank surface**.

**Key correction to the brief:** the recents are **not dormant in persistence** — they
are actively written every time a search succeeds (including from the bottom-nav tab,
since `searchTabQueryBinding` calls `vm.search()` per keystroke). They are simply not
*displayed* in the bottom-nav tab. So on first launch of this feature the empty state
will likely already show real, accumulated recents — instant value, no warm-up period.

**Search lifecycle (verified):** a single `searchViewModel` is hoisted in
`CompactTabLayout`; leaving the `.search` tab calls `clearSearch()` which zeroes
`query`/`results` but **preserves `recentQueries`**. Good — recents survive tab exits.

## Affected Areas

- `ios/.../Search/Views/SearchView.swift` — flip the recents/suggestions gate so the
  empty-query state renders recents in `.bottomNavTab` (the `else if` block in
  `resultList`, lines ~172–177).
- `ios/.../Search/ViewModels/SearchViewModel.swift` — likely no logic change; recents
  plumbing already complete. Possibly a "recent tap re-runs search" helper.
- `ios/.../Search/SearchStrings.swift` — reuse `suggestionsTitle`/`suggestionsClear`
  or add a dedicated `recent_searches` key (localization parity check).
- `openspec/changes/bottom-nav-search/specs/.../spec.md` → **R6 is MODIFIED** by this
  change ("blank" → "recents"). The bottom-nav-search R6 and this delta must reconcile.
- `ios/SolennixUITests/SearchTabEmptyStateTests.swift` — **currently asserts
  `cellCount == 0` and `"Sugerencias"` must NOT exist.** This test MUST be rewritten
  (it will break the moment recents render). This is a hard dependency, not optional.
- **Cross-platform parity (flag only — NOT planned here):** Android/Web global search
  would later want native recents parity via separate delta specs.

## What Apple does (sources, with honesty about fetch limits)

> **Sourcing tiers (transparent):**
> 1. **SwiftUI API docs — fetched & citable** (via context7 `/websites/developer_apple_swiftui`).
> 2. **HIG design pages — URLs cited, but text is JS-gated and could NOT be fetched** by the
>    web fetcher. I do not fabricate HIG quotes; design claims below are tied to either the
>    API docs or to **observable current Apple-app behavior** (verifiable by anyone).

**Observable Apple-app pattern (current):** when you open search with an empty query —
- **Maps:** Recent Searches list + a browsable category grid ("Food", "Gas", etc.).
- **Mail:** mailbox scope + Recent Searches.
- **Settings:** Recent Searches list (tappable, "Clear" via edit).
- **Music / Podcasts / Files:** Recent Searches + sometimes "Suggested".
- **App Store:** Today/featured + suggestions (it is a store, so it leads with content).
- **Contacts:** Recent Searches.

**Distilled pattern:** the *default* Apple search empty/initial state is **Recent
Searches first**; stores/content-apps layer featured/browseable content above/below it.
A bare "tip" or empty illustration is **not** the canonical initial state — Apple uses
recents to give the field immediate utility.

**Relevant SwiftUI primitives (API docs, citable):**
- `.searchable(text:prompt:)` — the input field (already wired).
- `.searchScopes(_:scopes:)` (iOS 16+) — entity-type filter (already wired).
- `.searchSuggestions(_:)` — the native suggestions surface; system may render these
  in a transient overlay depending on context (worth verifying in the iOS 26 spike).
- `ContentUnavailableView.search` — a system **"no results"** empty state (this is for
  *post-search emptiness*, NOT the initial empty-query state we are designing).
- `.searchPresentationToolbarBehavior(.avoidHidingContent)` — controls toolbar hide on
  present (relevant if we show recents that should stay visible).

> Cited URLs: developer.apple.com/documentation/swiftui/performing-a-search-operation,
> .../scoping-a-search-operation, .../contentunavailableview/search,
> .../searchpresentationtoolbarbehavior(\_:).
> HIG (text not fetched): developer.apple.com/design/human-interface-guidelines/search-fields
> and /searching.

## Inventory of available assets

| Asset | Status | Powers which option |
|---|---|---|
| `recentQueries` + `saveRecentQuery` + `clearRecentQueries` + `querySuggestions` (UserDefaults) | **Active** (persisting now) | **A — Recents** ✅ |
| `/events/upcoming` endpoint | Exists, unused by search | B (upcoming events) |
| `/dashboard/top-clients` (`TopClient{id,name,totalSpent,eventCount}`) | Exists, used by Dashboard | B (frequent clients) |
| `/dashboard/product-demand` | Exists, used by Dashboard | B / D (popular products) |
| `/inventory`, `/products`, `/clients`, `/events` list endpoints | Exist | B / C (browse) |
| SwiftData cache (`CachedClient/Event/Product/Inventory`) | Exists (list-fetch cache, **not** a "viewed" log) | Weak signal — avoid coupling |
| Any "recently viewed" / analytics / usage tracking | **None** | B/D not directly available |
| `/search?q=` empty-query support | **No — returns HTTP 400 on empty q** | Empty state **cannot** use the search endpoint |
| Dedicated `/search/recents` or `/search/trending` backend | **None** | D would need a new backend endpoint + aggregation |

## Approaches (options with tradeoffs)

### A. Recents (recent search queries) — **RECOMMENDED first slice**
- **Shows:** up to 6 recent query strings; `clock.arrow.circlepath` icon; "Limpiar".
- **Apple precedent:** Maps, Mail, Settings, Music, Files — the canonical pattern.
- **Data/infra needed:** **None new.** Already persisted in `UserDefaults`; display
  gate just needs flipping. Tap = `applySuggestion` + `search()` (already exist).
- **Effort:** **Low** (mostly view-layer + spec/test updates).
- **Pros:** Most Apple-native; instant value (recents already accumulating); near-zero
  infra; reuses dormant code; private (device-local only).
- **Cons:** First-time users see nothing until they've searched once (matches Apple).

### B. Suggested entities (frequent clients / upcoming events / popular products)
- **Shows:** rows like "Próximos eventos", "Clientes frecuentes", "Productos populares".
- **Apple precedent:** App Store featured; Maps suggestions.
- **Data/infra needed:** New VM methods calling `/events/upcoming`,
  `/dashboard/top-clients`, `/dashboard/product-demand`; loading/empty/error states;
  nav to detail (Routes already exist).
- **Effort:** **Medium** (multiple endpoint integrations + loading UX).
- **Pros:** High value even before the user searches; surface real business data.
- **Cons:** Network cost/latency on every search-tab open; 4 separate loading states;
  dilutes the simple "search" mental model; not the canonical *initial* Apple pattern
  (it's a store/dashboard pattern).

### C. Browsable categories (tap Clients/Events/Products/Inventory to browse)
- **Shows:** a row/grid of 4 category chips → navigates to that entity's list.
- **Apple precedent:** Maps browsable categories below recents.
- **Data/infra needed:** Minimal — the `SearchScope` enum + `Route` list destinations
  already exist. No new endpoints.
- **Effort:** **Low–Medium** (navigation glue + layout).
- **Pros:** Exploration aid; works offline; no backend; pairs naturally with recents.
- **Cons:** Duplicates the bottom-nav destinations somewhat (Clients/Events are
  already tabs) — risk of redundancy. Better as a *second* slice under recents.

### D. Trending / popular (aggregate signals)
- **Shows:** "Popular searches" / trending entities across the team.
- **Apple precedent:** App Store trending (content-store pattern).
- **Data/infra needed:** **New backend endpoint** + cross-user aggregate usage
  tracking (does not exist). Privacy review for sharing team-wide signals.
- **Effort:** **High** (backend + tracking infra + privacy).
- **Pros:** Discoverable; social proof.
- **Cons:** Biggest build; privacy surface; not the Apple *individual-search* pattern.

### E. Tip / onboarding hint only
- **Shows:** an illustration + "Busca clientes, eventos…" (the existing
  `initialStateSection` / `ContentUnavailableView`).
- **Apple precedent:** Apple uses this for *no-results*, not the initial state.
- **Data/infra needed:** None.
- **Effort:** **Low** (already built for `.pushed`).
- **Pros:** Trivial; safe.
- **Cons:** Low long-term value; **not** what Apple shows as the initial state; a dead
  surface after first use. Reject as the primary choice.

### F. Hybrid (Recents + Browsable categories) — **Maps-style**
- **Shows:** Recents list on top; category chips below (Maps parity).
- **Apple precedent:** Maps — the strongest single Apple analog.
- **Data/infra needed:** A + C combined (both low-infra).
- **Effort:** **Medium** (two slices).
- **Pros:** Closest to "lo más Apple posible" for a discovery surface; recents give
  utility, categories give exploration.
- **Cons:** More layout work; category redundancy with bottom nav to resolve.

### Recommendation

**Ship Option A (Recents-first) as the smallest valuable first slice.** It is the
canonical Apple initial-search state, it needs **no new infrastructure** (the recents
are already persisting), and it activates ~90%-built dormant code. Treat **Option F
(Recents + Browsable categories)** as the natural follow-up if the user wants a
Maps-style discovery surface — it layers C onto A without rework. **Defer B/D** until
there is a product pull for pre-query entity surfacing (they cost real backend/UX work
and diverge from the canonical individual-search pattern).

**Why this fits "lo más Apple posible":** Recent Searches is the one element *every*
Apple app with a search field shares as its initial state; it is the most native,
lowest-friction choice, and it is the only option whose data we already collect.

## Cross-platform note (parity intent only — not planned here)

Global search exists on Android and Web. This change is **iOS-first** because the
search tab is iOS-native (`Tab(role: .search)`). When this ships, Android and Web
global search should get **functional parity** (recent searches) via their own delta
specs — but that implementation is explicitly out of scope here and is only flagged as
a downstream parity intent.

## Risks

- **R6 + UITest breakage (hard dependency):** `bottom-nav-search` spec R6 ("blank, no
  recents") and `SearchTabEmptyStateTests.swift` (`cellCount == 0`, `"Sugerencias"`
  must not exist) **both** encode the blank state. This change MUST modify R6 (a
  `MODIFIED` delta) and rewrite the UITest. Not optional.
- **Spec tension with a just-merged change:** R6 was deliberately "blank for now".
  Flipping it to recents reverses an explicit, recent decision — surface this to the
  user so it's a conscious call, not an accident.
- **Privacy (local query storage):** recents store raw query text locally
  (`UserDefaults.standard`, device-only, **not** iCloud-synced, **not** sent to
  backend beyond the search itself). For a business app this may include client/event
  names — acceptable and Apple-matching, but worth a conscious privacy nod.
- **Stale recents on first launch:** because recents already persist, the empty state
  may immediately show real accumulated data — verify this is desired (it is a
  feature, not a bug, but surprises QA).
- **`.searchScopes` interaction:** confirm recents render cleanly under the existing
  scope bar on iOS 26 (manual verification, like the prior change).

## Open product questions (for the user — orchestrator to surface)

1. **Scope of first slice:** Recents-only (Option A), or Recents + Browseable
   categories (Option F, Maps-style) now?
2. **Recent cap:** keep `maxRecentQueries = 6`, or change?
3. **Tap behavior:** tap a recent = **re-run the search** (Apple standard, recommended)
   vs. jump to a remembered entity (needs entity-id tracking we don't have)?
4. **Persistence across launches:** keep recents across app launches (already true) —
   confirm this is wanted, and whether logout should clear them.
5. **Unify contexts:** show recents in **both** `.pushed` and `.bottomNavTab`, or keep
   them distinct? (Recommend unifying to recents in both for consistency.)
6. **Privacy:** local-only raw query storage is acceptable (Apple-matching), or do you
   want a privacy/incognito consideration for v1? (Recommend: match Apple, no toggle.)
7. **Empty-recents fallback:** when there are **no** recents yet (brand-new user),
   show nothing (truly blank) or a single onboarding hint (Option E) until they search?

## Ready for Proposal

**Yes** — pending the user's pick among A / F / (and the open questions above). Once
the user chooses, the next SDD phase is **sdd-propose**, which will define intent,
scope, and a rollback plan, and reconcile the R6 modification with the archived
`bottom-nav-search` spec.
