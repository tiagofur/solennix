# bottom-nav-search Specification

> New `bottom-nav-search` capability, iOS (SwiftUI) only this change. Android/Web
> satisfy the same capability later via separate delta specs. No backend change.

## Purpose

Make global search a first-class Apple-native bottom-nav destination on iPhone
(compact size class), preserving existing in-list local filtering. iOS 26+ uses
`Tab(role: .search)`; iOS 17–25 uses a regular 5th tab. `GET /api/search?q=`
already covers clients, events, products, and inventory.

## Non-Goals

Android, Web, iPad/regular-size-class changes; Products/Inventory as tabs;
search history/recents/suggested entities.

## Requirements

### Requirement: Global Search Tab Presence

The nav MUST expose one search destination — `Tab(role: .search)` on iOS 26+,
a 5th magnifier tab on iOS 17–25 — presenting `SearchView` in-tab (not a push).

#### Scenario: Search tab present (iOS 26)

- GIVEN an iPhone in compact size class running iOS 26+
- WHEN the tab bar renders
- THEN a search-role tab sits alongside the 4 regular tabs (home, events, clients, more)

#### Scenario: Search tab present (iOS 17–25)

- GIVEN a device running iOS 17–25
- WHEN the tab bar renders
- THEN a regular 5th tab with a magnifier icon is present

### Requirement: No Overflow Tab

4 regular tabs + 1 search-role (5 total) MUST NOT spawn a "Más"/overflow tab.
The fit is UNVERIFIED on device (a prior 5+1=6 layout overflowed iOS 26.5), so
design MUST validate it via a spike before implementation.

#### Scenario: Five-slot fit produces no overflow

- GIVEN the 4 regular tabs plus 1 search-role tab
- WHEN the tab bar renders on an iPhone
- THEN no "Más"/overflow tab appears
- AND every tab, including search, is directly tappable

### Requirement: Search Activation and Dismissal

Selecting search MUST activate it; dismissing MUST return the user to the prior
tab with its navigation stack restored, not reset.

#### Scenario: Dismiss restores previous tab and nav state

- GIVEN the user was on the Events tab deep in a pushed detail, then selected search
- WHEN the user dismisses search
- THEN the Events tab is re-selected
- AND the Events navigation stack is restored to the prior detail

### Requirement: Global Search Results

The search tab MUST render results in-tab across clients, events, products, and
inventory (from `GET /api/search?q=`); selecting a result MUST open its detail.

#### Scenario: Query returns all entity types

- GIVEN the search tab is active
- WHEN the user types a query matching clients, events, products, and inventory
- THEN results for all four entity types render in the search tab
- AND selecting a result navigates to that entity's detail

### Requirement: Entity Type Filtering

A `.searchScope` control (all, clients, events, products, inventory) MUST narrow
results to the selected scope.

#### Scenario: Scope narrows results to one entity

- GIVEN a query returned clients, events, products, and inventory
- WHEN the user selects the "clients" scope
- THEN only client results render

### Requirement: Search Empty State (R6)

An empty query MUST render Recent Searches when recents exist, and an onboarding
hint when they do not. MUST NOT show browsable categories or trending entities.
Apple's canonical initial-search state (Maps, Mail, Settings, Music, Contacts,
Files).

(Previously: "An empty query MUST render a blank surface, MUST NOT show
recents/suggestions/history." — MODIFIED by `search-empty-state` delta.)

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

### Requirement: Search Text Lifecycle

`SearchView` MUST own its text; the nav field MAY seed an initial query only.
Text MUST clear on tab exit (Apple restore-to-previous). Per-list ViewModel filter
state MUST NOT be hoisted into the nav.

#### Scenario: Text clears on tab exit

- GIVEN the search tab holds a query and rendered results
- WHEN the user dismisses search or switches to another tab
- THEN the search text is reset to empty

### Requirement: Local List Filtering Preservation

The `.searchable` in `EventListView`/`ClientListView` MUST stay unchanged and
filter the loaded list in place without a backend call.

#### Scenario: Local filter still filters in place

- GIVEN the user is on the Events list tab with a loaded list
- WHEN the user types into the local Events search field
- THEN the list filters client-side in place
- AND no backend search call is made

### Requirement: Same-Tab Re-Tap Pop-to-Root Coexistence

Pop-to-root-on-same-tab-re-tap MUST keep working for the 4 regular tabs and MUST
NOT interfere with search dismiss-restore.

#### Scenario: Re-tap active tab still pops to root

- GIVEN the user is on the Events tab with a pushed detail
- WHEN the user taps the Events tab again
- THEN the Events stack pops to its root
- AND search dismiss-restore behavior remains intact

### Requirement: iPad Sidebar Search Regression Guard

The regular-size-class `SidebarSplitLayout` `.searchable` MUST stay unchanged;
this change MUST NOT alter regular-size-class search.

#### Scenario: iPad sidebar search unaffected

- GIVEN an iPad in regular size class
- WHEN the user uses the sidebar search
- THEN existing global `.searchable` → `Route.search` behavior is preserved
