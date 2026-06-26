# Tasks: iOS Mechanical Polish (AccentColor, Structured Logging, Dynamic Type)

> Change `ios-mechanical-polish` — Sprint 1, Change A. Three independent iOS tracks; NO product behavior change. Authoritative scope: exploration `sdd/ios-clean-house/explore` (Engram #2901). **Counts below are code-verified** (override earlier estimates).
> **TDD note (honest):** print→Logger swaps, asset add, tint removal, `@ScaledMetric` wraps are mechanical — covered by build + grep assertions + UI/device checks, NOT new unit tests (`os.Logger` output is not capturable). RED→GREEN applies only if a testable helper (e.g. `LogCategory` enum) is introduced.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~235–320 (T3 ~90 / T2 ~85 / T4 ~110 + docs) |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | PR1 T3 → PR2 T2 → PR3 T4 |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

> Total is under the 400-line single-PR budget, but `delivery_strategy: force-chained` is locked → ship **3 stacked PRs, one per track** (each ~80–120 lines) to keep review diffs focused.

### Suggested Work Units (1 PR per track)

| Unit | Goal | PR | Base | Finish/Verify |
|------|------|----|------|---------------|
| T3 | print → `os.Logger`, zero console noise | PR1 | `main` | grep `print(` = 0 in prod |
| T2 | AccentColor asset + gold tint removal | PR2 | PR1 | navy/semantic tints preserved (grep-diff) |
| T4 | `@ScaledMetric` for fixed fonts | PR3 | PR2 | ~22 correct sites untouched; AX5 device check |

## Phase 1: Track 3 — Structured Logging (PR 1)

- [x] 1.1 Add file-level `Logger(subsystem: "com.solennix.app", category:)` (reuse `NotificationManager.swift:10` pattern) to: `LiveActivityManager`, `SpotlightIndexer`, `SolennixModelContainer`, `WidgetDataSync`, `WidgetModels`, `QuickClientSheet`, `ConfirmDialog`.
- [x] 1.2 CRITICAL paths → `logger.error()` + existing Sentry hook, preserve payload: `SolennixModelContainer.swift:35`, `SpotlightIndexer.swift:103,116`, `LiveActivityManager.swift:143,157,170` (push-token/spotlight). *(Spec: "Critical error reaches Sentry".)*
- [x] 1.3 Migrate remaining prints → `logger.info/.error`: `LiveActivityManager` (10 others), `WidgetDataSync:47,61`, `WidgetModels:147,156`, `NotificationManager:112`.
- [x] 1.4 DELETE debug leftovers: `ConfirmDialog.swift:65`, `QuickClientSheet.swift:161`.
- [x] 1.5 Translate ALL Spanish log strings → English (`SolennixModelContainer:35`, `SpotlightIndexer`, `LiveActivityManager`). *(Spec: "Log strings are English".)*
- [x] 1.6 Verify: `rg 'print\(' ios -g '!*Tests*' -g '!*UITests*'` = 0; `xcodebuild build` + `test` green; review each critical site.

Commit: `refactor(ios): replace print with structured os.Logger logging` ✅ e56401a5

## Phase 2: Track 2 — AccentColor Asset (PR 2)

- [x] 2.1 Create `ios/Solennix/Assets.xcassets/AccentColor.colorset/Contents.json` = `#C4A265` (universal sRGB; == `SolennixColors.primary`/`tabBarActive`). *(Spec: "AccentColor value is single-source-of-truth".)*
- [x] 2.2 REMOVE all 35 `.tint(SolennixColors.primary)` (`EventListView`×6, `CalendarSyncPreferencesView`×3, `SearchView`×2, `Step1/Step3`×2 each, `DashboardView`×2, + `ContentView`, `ViewModifiers`, 12 others — see exploration list).
- [x] 2.3 REMOVE 2 `.tint(SolennixColors.tabBarActive)` in `CompactTabLayout.swift`; verify tab-bar active still renders gold via asset. *(Spec: "Gold tint removed still renders gold".)*
- [x] 2.4 EDGE CASE: `PricingView.swift` ternary `.tint(isPrimary ? onPrimary : primary)` — keep dynamic ternary OR replace `primary` branch with `Color.accentColor` (per exploration list).
- [x] 2.5 Verify KEEP untouched (grep-diff = 0 removed): `.tint(SolennixColors.accent)` navy (6 sites) + semantic (`.error/.success/.warning/.info/.green/.blue/.white`, `statusColor(...)`). *(Spec: "Navy and semantic tints preserved".)*
- [x] 2.6 Fix `CalendarSyncPreferencesViewTests.swift` (asserts `.tint(.primary)` → update expectation); `xcodebuild test` + build green.

Commit: `feat(ios): add AccentColor asset and inherit gold via asset` ✅ dcbf9c9a

## Phase 3: Track 4 — Dynamic Type (PR 3)

- [ ] 3.1 Wrap ~21 direct `.font(.system(size:))` in `@ScaledMetric(relativeTo:)`. Metrics/scores (`SearchView`×3, `EventDetailHubComponents`×3, counts/badges) → `.title/.largeTitle`, NO cap. *(Spec: "Metrics scale at AX5".)*
- [ ] 3.2 Empty-state icons `EmptyStateView.swift` (40–64) → `@ScaledMetric` with reasonable cap.
- [ ] 3.3 Decorative glyphs FIXED/capped (MUST NOT scale): onboarding hero 120 (`OnboardingView`/`OnboardingPageView`), splash 96/64.
- [ ] 3.4 Widget/intent fonts (`KPIWidget`, `LockScreenWidget`×2, `EventCountIntent`, `ShowMonthlyRevenueIntent`, `ShowTodayEventsIntent`) → wrap for consistency (lower priority; system-capped).
- [ ] 3.5 Verify ~22 already-correct `@ScaledMetric` sites unchanged by diff. *(Spec: "Correct existing sites untouched".)*
- [ ] 3.6 DEVICE check at AX5: metrics scale legibly, decorative glyphs don't overflow; `xcodebuild test` green.

Commit: `feat(ios): scale fixed fonts with Dynamic Type via @ScaledMetric`

## Phase 4: Docs & Close

- [ ] 4.1 Update `progress/current.md` (AGENTS.md session lifecycle); run `./init.sh` → green.
- [ ] 4.2 Update `docs/PRD/11_CURRENT_STATUS.md` (openspec config rule: PRD update is always the last task).
