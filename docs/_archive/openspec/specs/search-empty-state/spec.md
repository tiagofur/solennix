# search-empty-state Specification

> iOS search tab empty-query state. Replaces the original blank surface (R6 from
> `bottom-nav-search`) with **Recent Searches** + onboarding hint. No new
> persistence — reuses existing `SearchViewModel.recentQueries` (UserDefaults,
> dedup'd, capped at 6).

## Non-Goals

- Browsable categories / "browse all" (`GET /api/search?q=` → 400)
- Suggested/trending entities; any backend change
- iCloud sync of recents
- Android / Web parity (separate follow-up deltas)

## Requirements

### Requirement: Search Empty State (R6)

An empty query MUST render Recent Searches when recents exist, and an onboarding
hint when they do not. MUST NOT show browsable categories or trending entities.
Apple's canonical initial-search state (Maps, Mail, Settings, Music, Contacts,
Files).

#### Scenario: Recents shown (1–6 queries exist)

- GIVEN the search tab is active with empty query text
- WHEN `recentQueries` has 1–6 entries
- THEN up to 6 recent queries render in the empty-state view
- AND a "Limpiar" affordance is visible

#### Scenario: Onboarding hint shown (zero recents)

- GIVEN the search tab is active with empty query text
- WHEN `recentQueries` is empty (new user or after clear)
- THEN an onboarding hint renders (e.g. "Buscá clientes, eventos, productos…")
- AND no "Limpiar" affordance is visible

#### Scenario: Tap a recent query

- GIVEN recents are visible in the empty-state view
- WHEN the user taps a recent query
- THEN `applySuggestion` is called with that query
- AND `search()` fires, loading results in-tab

#### Scenario: "Limpiar" clears all recents

- GIVEN recents are visible in the empty-state view
- WHEN the user taps "Limpiar"
- THEN `clearRecentQueries()` executes
- AND the onboarding hint replaces the recents list

#### Scenario: Recents replaced by results after tap

- GIVEN recents are visible in the empty-state view
- WHEN the user taps a recent query
- THEN the empty-state view is replaced by search results

### Requirement: Recent Query Cap

The system MUST persist no more than 6 recent queries. On the 7th save the
oldest entry MUST be evicted.

#### Scenario: Cap enforced at 6

- GIVEN `recentQueries` has 6 entries
- WHEN the user performs a new successful search
- THEN the oldest entry is removed
- AND the new query is prepended
- AND the list length remains 6

#### Scenario: Deduplication on repeat query

- GIVEN `recentQueries` has 3 entries including "martinez"
- WHEN the user searches "martinez" again
- THEN "martinez" moves to position 1
- AND no duplicate is created

### Requirement: Clear Recents on Logout

`clearRecentQueries()` MUST fire during the logout flow. Recents are
device-local (`UserDefaults.standard`) and MUST NOT persist after logout.

#### Scenario: Logout clears recents

- GIVEN the user has 4 recent queries saved
- WHEN the user logs out
- THEN `clearRecentQueries()` is called
- AND no recents are visible on next login

### Requirement: Stale Recents Render Immediately

If recents accumulated from prior sessions exist on launch, they MUST render
immediately in the empty-state view — no grace period or blank flash.

#### Scenario: Prior-session recents load on launch

- GIVEN the user has 3 recents from a previous session
- WHEN the app launches and the user opens the Search tab with empty query
- THEN the 3 recents render immediately
- AND no blank empty-state flash appears

## Test Scenarios (replace SearchTabEmptyStateTests)

| Old assertion | New assertion |
|---------------|---------------|
| `cellCount == 0` | `cellCount == recentQueries.count` (1–6) when recents exist |
| No "Sugerencias" text | "Limpiar" button is hittable when recents exist |
| Blank on empty query | Onboarding hint visible when `recentQueries` is empty |
| — | Tap first recent → `search()` called, results render |
