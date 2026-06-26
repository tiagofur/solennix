# Tasks: Search Empty State

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 90–140 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation + core rendering + logout hook | PR 1 | All production code; base = main |
| 2 | Tests (UI + unit) | PR 1 | Tests stay with their code per work-unit-commits |

> **Note**: At ~90–140 changed lines, this is well under the 800-line budget. Single PR is appropriate. The `force-chained` delivery strategy activates only if the estimate grows during implementation.

## Phase 1: Foundation — Static Clear Method

- [x] 1.1 Add `public static func clearRecentQueriesFromStorage()` to `ios/.../Search/ViewModels/SearchViewModel.swift` — removes UserDefaults key `"solennix.search.recentQueries"`. ~3–5 lines.

## Phase 2: Core Implementation — View Rendering

- [x] 2.1 Add `recentsSection(vm:)` builder in `ios/.../Search/Views/SearchView.swift` — renders up to 6 recent queries in a List section with tap → `vm.applySuggestion(q)` + `vm.search()`. ~15–20 lines.
- [x] 2.2 Add `onboardingHint` builder — centered Text with "Buscá clientes, eventos, productos…" style. ~5–8 lines.
- [x] 2.3 Modify `resultList()` render gate: when `.bottomNavTab` + query empty + `recentQueries` non-empty → show `recentsSection`; when empty → show `onboardingHint`; otherwise → existing results flow. ~5–10 lines.

## Phase 3: Integration — Logout Hook

- [x] 3.1 Call `SearchViewModel.clearRecentQueriesFromStorage()` inside `AppSignOutDelegate.willClearTokens()` in `ios/Solennix/SolennixApp.swift`. ~2–3 lines.

## Phase 4: Testing

- [x] 4.1 Rewrite `ios/SolennixUITests/SearchTabEmptyStateTests.swift`: seed UserDefaults with 1–6 recents, assert `cellCount == recentQueries.count`. ~15–20 lines.
- [x] 4.2 Add UI test: clear UserDefaults, assert onboarding hint staticText is hittable. ~10–12 lines.
- [x] 4.3 Add UI test: tap first recent cell → `search()` called, results replace recents. ~12–15 lines.
- [x] 4.4 Add UI test: tap "Limpiar" button → hint replaces recents list. ~10–12 lines.
- [x] 4.5 Add unit test: call `clearRecentQueriesFromStorage()`, verify `UserDefaults.standard.stringArray(forKey:) == nil`. ~8–10 lines.

## Phase 5: Verification

- [x] 5.1 Run `xcodebuild test` for SolennixUITests target — all 5 tests green.
- [x] 5.2 Manual smoke: launch app → Search tab with recents → tap one → results load → logout → login → hint visible.
