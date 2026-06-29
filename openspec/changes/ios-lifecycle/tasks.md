# Tasks: ios-lifecycle (Sprint 3)

State restoration (`@SceneStorage`) + seamless launch for the iOS app. Two
force-chained PRs: **PR-A Launch** (small, ships first) → **PR-B Restoration**.
Worktree `/Users/tiagofur/dev/solennix-ios`, branch `sdd/ios-lifecycle`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR-A ~50; PR-B ~400–550; combined ~450–600 |
| Review budget | 800 lines / PR (custom) — both PRs land under budget |
| 400-line budget risk | Medium (combined > 400 → forced split) |
| Chained PRs recommended | Yes |
| Suggested split | PR-A Launch → PR-B Restoration |
| Delivery strategy | force-chained (auto-chain semantics) |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | PR | Base boundary |
|------|------|----|---------------|
| A1 | Seamless launch (colorset + UILaunchScreen + splash logo/fade) | PR-A | `origin/main` |
| B1 | Route Codable + round-trip test (GATE) | PR-B | PR-A branch → rebase main after A lands |
| B2 | CompactTabLayout: 6 `@SceneStorage` + 5 codable-path bridges | PR-B | ↑ |
| B3 | SidebarSplitLayout: `selectedSection` + `contentPath` | PR-B | ↑ |
| B4 | Logout-clear (CRITICAL) — both sign-out hooks | PR-B | ↑ |
| B5 | Spotlight-preserve + stale-entity pop + PRD | PR-B | ↑ |

### Work-Unit Contract

| Unit | Files | Verify | Rollback |
|------|-------|--------|----------|
| A1 | `Assets.xcassets/Background.colorset`(new), `Info.plist:30`, `ContentView.swift:133,184-198` | Manual: cold launch shows logo on brand bg, no blank flash; fade to content | revert asset+plist+splash |
| B1 | `SolennixCore/.../Route.swift:6`, `SolennixCoreTests/RouteCodableRoundTripTests.swift`(new) | `swift test` round-trip green (RED→GREEN) | drop `Codable` + test |
| B2 | `CompactTabLayout.swift:23-28` | Manual: relaunch restores tab+paths; Spotlight still wins | restore 6 `@State` |
| B3 | `SidebarSplitLayout.swift:28-29` | Manual: iPad relaunch restores section+path | restore `@State` |
| B4 | `SolennixApp.swift:361`, `ContentView.swift:248,280` | Unit: reset-signal fires; manual: logout→user2 lands fresh | remove clear step |
| B5 | detail views, `CompactTabLayout.swift:106,168`, `docs/PRD/11_CURRENT_STATUS.md` | Manual: deleted entity→root; Spotlight→home+push | revert pop guard |

---

## PR-A — Launch Experience (ship first, base `origin/main`)

### Phase 1A: Launch assets & splash

- [x] A1.1 Add `Assets.xcassets/Background.colorset` (`Contents.json`: #FFFFFF light / #000000 dark).
- [x] A1.2 Populate `Info.plist:30` `UILaunchScreen` dict: `UIImageName=SolennixLogoIcon`, `UIColorName=Background`.
- [x] A1.3 `ContentView.swift:184-198` SplashView: swap `ProgressView()`+text for `Image("SolennixLogoIcon")`.
- [x] A1.4 `ContentView.swift:133` apply `.transition(.opacity)` + `.animation(_, value: authManager.authState)` so splash fades on `.unknown`→resolved (gated on authState, NOT a timer).
- [x] A1.5 Commit: `feat(ios): seamless launch with brand colorset and splash fade`.
- [ ] A1.6 Verify (manual device): cold launch = logo on bg, no blank frame, smooth fade to auth/content. _(PR-A impl verified via `xcodebuild test` green; cold-launch device check pending human/device.)_

**PR-A merges to `main` first.** No code dependency on PR-B.

---

## PR-B — State Restoration (base: PR-A branch → rebase main after A lands)

### Phase 1B: Foundation (GATE — must be GREEN before any SceneStorage)

- [ ] B1.1 RED: add `SolennixCoreTests/RouteCodableRoundTripTests.swift` — encode/decode every `Route` case, assert equality; assert malformed payload degrades (R1).
- [ ] B1.2 GREEN: make `Route: Hashable, Codable` at `SolennixCore/.../Route.swift:6`. Confirm auto-synthesis covers all associated values (String/Int/Date?); add custom `init(from:)` only if malformed test needs it.
- [ ] B1.3 Commit: `feat(core): make Route Codable with round-trip tests`. Gate: `swift test` green.

### Phase 2B: Compact restoration

- [ ] B2.1 `CompactTabLayout.swift:23` — `selectedTab` → `@SceneStorage` (`Tab` is `Int`-raw → plist-ok).
- [ ] B2.2 `CompactTabLayout.swift:24-28` — 5 NavigationPaths: add `@SceneStorage Data?` backing + computed codable bridge (encode `path.codable`→Data; restore `NavigationPath(codable)`). This is the NavigationPath.codable binding dance.
- [ ] B2.3 Commit: `feat(ios): restore compact tab navigation paths via SceneStorage`.

### Phase 3B: iPad sidebar restoration

- [ ] B3.1 `SidebarSplitLayout.swift:28` `selectedSection` → `@SceneStorage` (`SidebarSection` is `String`-raw).
- [ ] B3.2 `SidebarSplitLayout.swift:29` `contentPath` → codable bridge (same dance as B2).
- [ ] B3.3 Commit: `feat(ios): restore sidebar section and content path via SceneStorage`.

### Phase 4B: Logout-clear (CRITICAL — cross-user leakage guard)

- [ ] B4.1 Add reset-signal (e.g. `@AppStorage("sessionEpoch")`) incremented in `SolennixApp.swift:361` `performSessionCleanup`; layouts reset their SceneStorage keys when epoch differs on appear.
- [ ] B4.2 Confirm BOTH sign-out hooks reach cleanup: `ContentView.swift:248` (biometric failure) + `ContentView.swift:280` (biometric re-login) → `AuthManager.signOut()` → cleanup.
- [ ] B4.3 RED→GREEN unit test: `performSessionCleanup` increments signal / returns cleared keys; assert empty.
- [ ] B4.4 Commit: `fix(ios): clear scene-storage state on logout and biometric sign-out`.

### Phase 5B: Spotlight-preserve + stale-entity recovery

- [ ] B5.1 Verify `CompactTabLayout.swift:106` (ios26) + `:168` (legacy) `homePath = NavigationPath()` reset-first still wins over restored path after B2 wiring; preserve ordering.
- [ ] B5.2 Stale-entity pop (R5): restored detail route (eventDetail/clientDetail/etc.) whose entity is gone → pop silently to root (no crash/dead-end). Add not-found→pop guard on restored detail views.
- [ ] B5.3 Commit: `fix(ios): pop to root when restored route targets deleted entity`.

### Phase 6B: Testing & Docs

- [ ] B6.1 `xcodebuild test` green across `SolennixCoreTests` + app target.
- [ ] B6.2 Manual device matrix: relaunch restores (iPhone+iPad); logout→user2 fresh; Spotlight wins; no blank flash on launch.
- [ ] B6.3 Update `docs/PRD/11_CURRENT_STATUS.md` (last task per `rules.tasks`). Commit: `docs(prd): record ios-lifecycle sprint status`.

---

## Risks Encoded

- **NavigationPath codable dance** (B2, B3) — bridge on BOTH branches; round-trip test is the gate.
- **Logout leakage (CRITICAL)** — both hooks (ContentView:248, :280) MUST reach `performSessionCleanup`; reset-signal cleared on next appear.
- **Spotlight ordering** — reset-first (`CompactTabLayout:106,168`) must survive SceneStorage wiring.
- **Launch asset drift** — `Background` colorset values must match `SolennixColors.background` in code.
- **Stale-entity detection** — pop silently; verify on deleted event/client/product.

## Skill Resolutions

- **force-chained** delivery → `Decision needed before apply: No` (auto-chain semantics); orchestrator proceeds with PR-A.
- TDD honored only where unit-testable: Route Codable round-trip (RED→GREEN, B1) + logout-clear signal (B4). SceneStorage restore + Spotlight + stale-entity + launch are manual-device-verified (cannot simulate cold-launch in unit test) — stated honestly.
- Cross-platform parity NOT triggered (iOS-native `@SceneStorage`/`UILaunchScreen`; no domain/DB/API surface) — per proposal #3031.
- Custom `rules.tasks` honored: hierarchical numbering, session-sized tasks, PRD update is final task.
