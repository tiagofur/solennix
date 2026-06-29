# Proposal: iOS Lifecycle — State Restoration + Launch Experience

## Intent

The app forgets where you were on relaunch (`selectedTab` + all `NavigationPath`s are plain `@State`; zero `@SceneStorage`) and shows a blank launch frame (empty `UILaunchScreen` → spinner → content). Highest-visibility "not-Apple" gap (audit #2899, RED #1 + #3). Changes **whether the app remembers**, not what it does.

## Scope

### In Scope
- **PR-A — Launch (ship first, small):** `Background` colorset (#FFFFFF/#000000); populate `UILaunchScreen` (`UIImageName=SolennixLogoIcon` + `UIColorName=Background`); `SplashView` spinner→logo; `authDrivenContent` `.transition(.opacity)` + `.animation(value: authState)` fade.
- **PR-B — State restoration:** `Route: Hashable, Codable` + round-trip test (RED→GREEN); `@SceneStorage` for `selectedTab` + 5 `NavigationPath`s and `selectedSection` + `contentPath`; `NavigationPath.codable` binding dance; **logout clears SceneStorage keys**; Spotlight deep-link still wins over stale restore.

### Out of Scope
- iPad sidebar beyond `selectedSection` + `contentPath` (expansion detail) — Sprint 4+.
- Multi-window per-scene isolation — deferred.
- Increase Contrast / empty-state migration — other sprints.
- Android/Web/Backend — `@SceneStorage` + `UILaunchScreen` are iOS-native platform concerns with **no domain/DB/API surface → cross-platform parity NOT triggered** (same rationale as `ios-feel-motion` #3008 + `ios-mechanical-polish`).

## Capabilities

### New Capabilities
- `ios-lifecycle`: scene state restoration contracts (`@SceneStorage` tab + codable `NavigationPath`, logout-clear invariant, Spotlight-wins-over-restored) and launch-frame seamlessness (`UILaunchScreen` ↔ first content frame).

### Modified Capabilities
- None. No existing spec mentions `SceneStorage`/`NavigationPath` restoration or `UILaunchScreen` (zero hits across `openspec/specs/`).

## Approach
- **Route Codable is the prerequisite** — write the round-trip test FIRST (RED), add `Codable`, then wire `@SceneStorage`. Auto-synthesis works (all associated values Codable).
- **codable binding dance** — `onChange` writes codable, init restores; verify iOS 26 + legacy branches.
- **Logout-clear is CRITICAL** — hook `performSessionCleanup` (SolennixApp.swift:361) + biometric sign-out so user2 never lands on user1's nav.
- **Auth-gated by construction** — `CompactTabLayout` renders only in `.authenticated`; restoration can't bypass auth.
- **Spotlight wins** — deep-link resets `homePath` before pushing (preserve over stale restore).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `SolennixCore/…/Route.swift` | Modified | add `Codable` (auto-synthesized) |
| `CompactTabLayout.swift` | Modified | `@State`→`@SceneStorage` (tab + 5 paths) + codable dance |
| `SidebarSplitLayout.swift` | Modified | `@State`→`@SceneStorage` (section + contentPath) |
| `SolennixApp.swift` | Modified | clear keys in `performSessionCleanup` |
| `Info.plist`, `Assets.xcassets` | Modified | `UILaunchScreen` + `Background` colorset |
| `ContentView.swift` | Modified | SplashView logo + authState fade |
| `RouteCodableRoundTripTests` | New | RED→GREEN coverage |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `NavigationPath.codable` dance bugs (restore wrong-type) | Med | Route Codable test first; verify iOS 26 + legacy |
| Logout state leakage (user2 sees user1 nav) | High | **clear keys in `performSessionCleanup` + biometric sign-out** |
| Spotlight vs restored path conflict | Med | deep-link resets `homePath` first (preserve) |
| Launch asset color drift / logo sizing | Low | colorset mirrors `SolennixColors.background`; pixel-match frame |

## Rollback Plan

All changes are additive (`@SceneStorage` mirrors `@State`; `UILaunchScreen` dict reversible; Route gains a conformance). Revert PR-A then PR-B — no schema/data/API migration, no irreversible state.

## Dependencies

- iOS 17+ (`@SceneStorage`, `NavigationPath.codable`); iOS 26 `Tab` branch also restores.

## Success Criteria

- [ ] Relaunch restores selected tab + full per-tab nav stacks (iPhone + iPad sidebar).
- [ ] Logout → relaunch lands on default tab, never user1's path.
- [ ] Launch shows logo frame (no blank flash); SplashView fades into content.
- [ ] Spotlight deep-link still wins over a stale restored path.
- [ ] Route Codable round-trip test green; iOS 26 + legacy verified.
