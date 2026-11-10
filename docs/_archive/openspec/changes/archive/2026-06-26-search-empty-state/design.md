# Design: search-empty-state

## Technical Approach

Flip the existing `SearchView.resultList()` render gate to show recents when `.bottomNavTab` + empty query + `recentQueries` is non-empty. Add a centered onboarding hint when recents are empty. No new persistence — reuse existing `SearchViewModel.recentQueries` (UserDefaults, dedup'd, cap 6). Hook logout cleanup via `AppSignOutDelegate`.

## Architecture Decisions

| Decision | Options | Tradeoff | Choice |
|----------|---------|----------|--------|
| Render gate location | A: New `recentQueriesSection` in `resultList()` / B: Separate view | A minimal, reuses List context; B cleaner separation but more files | A — one method, same List |
| Logout hook | A: Static `SearchViewModel` method via `AppSignOutDelegate` / B: NotificationCenter / C: Call at every logout site | A centralized, B decoupled but adds infra, C scattered | A — already one delegate call site |
| Onboarding hint | A: Inline in `resultList()` / B: Separate component | A simple for 3 lines; B over-engineered | A — inline |

## Data Flow

```
SearchViewModel.recentQueries (@Observable, UserDefaults)
    │
    ▼
SearchView.resultList(vm:scope:)
    │
    ├── query empty + recentQueries non-empty → recentsSection
    │       tap → vm.applySuggestion(q) + vm.search() → results replace recents
    │       "Limpiar" → vm.clearRecentQueries() → onboarding hint
    │
    ├── query empty + recentQueries empty → onboardingHint (centered text)
    │
    └── query non-empty / results exist → existing results flow (unchanged)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `ios/.../Search/Views/SearchView.swift` | Modify | Add `recentsSection(vm:)` + `onboardingHint` in `resultList()` for `.bottomNavTab` empty-query gate |
| `ios/.../Search/ViewModels/SearchViewModel.swift` | Modify | Add `public static func clearRecentQueriesFromStorage()` (UserDefaults only, no instance needed) |
| `ios/Solennix/SolennixApp.swift` | Modify | Call `SearchViewModel.clearRecentQueriesFromStorage()` inside `AppSignOutDelegate.willClearTokens()` |
| `ios/SolennixUITests/SearchTabEmptyStateTests.swift` | Modify | Rewrite: assert recents render when `recentQueries` is populated; assert onboarding hint when empty |

## Interfaces / Contracts

```swift
// SearchViewModel — new static method (no instance required)
public static func clearRecentQueriesFromStorage() {
    UserDefaults.standard.removeObject(forKey: "solennix.search.recentQueries")
}
```

No new types, protocols, or API contracts. All changes are view-layer rendering logic + one static UserDefaults call.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| UI (XCTest) | Recents render when `recentQueries` count 1–6 | Seed UserDefaults before launch, assert `cells.count == expected` |
| UI (XCTest) | Onboarding hint visible when `recentQueries` empty | Clear UserDefaults, assert staticText with hint text exists |
| UI (XCTest) | Tap recent → results render, recents disappear | Tap first cell, assert results appear |
| UI (XCTest) | "Limpiar" → hint replaces recents | Tap Limpiar button, assert hint visible, cells count 0 |
| Unit | `clearRecentQueriesFromStorage()` removes UserDefaults key | Call static method, verify `UserDefaults.standard.stringArray(forKey:) == nil` |
| Manual | Logout clears recents on next login | Log out → log back in → search tab shows hint |

## Migration / Rollout

No migration required. Recents already persist in UserDefaults; this change only adds rendering. Feature is self-contained — no phased rollout needed.

## Open Questions

- None. All locked decisions resolve cleanly against existing code patterns.
