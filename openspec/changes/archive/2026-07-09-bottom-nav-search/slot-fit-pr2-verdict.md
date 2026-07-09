# PR2 Slot-Fit Spike Verdict — bottom-nav-search

> Real on-device validation of the 5-slot bottom-nav fit (PR2 task 2.1).
> The PR1 spike used a reverted REPLICA; this is the REAL app, auth-bypassed.

## Method

The app is auth-gated (tab bar only renders post-login). PR2 added a DEBUG-only
launch-arg gate (`SOLX_UI_TEST_BYPASS_AUTH=1`, compiled out in `#if DEBUG`) that
renders the REAL `CompactTabLayout` directly — no auth, no replica. An XCUITest
(`SolennixUITests/TabBarSlotFitTests`) launches the real app under the gate,
queries `app.tabBars.buttons`, records the count + accessibility labels, and
attaches a screenshot.

- Target: `feat/bottom-nav-search-pr2`
- Device: iPhone 17 Pro Max simulator, iOS 26.5 (Xcode 26.5 / build 17F42)
- Layout under test: 4 regular tabs + 1 search-role tab (`Tab(role: .search)`)
  + `.tabViewSearchActivation(.searchTabSelection)`

## Result — PASS

```
tabBar.buttons.count = 5
labels = ["Inicio", "Eventos", "Clientes", "Más", "Buscar"]
```

Exactly **5 directly-tappable items**, **NO 6th system-overflow item**. The
legitimate app "Más" more-menu tab IS one of the 5 (expected, not an overflow).
The search destination renders as the system "Buscar" search-role tab, pinned
trailing.

## Decision

**Primary** — ship `SwiftUI.Tab(value: AppTab.search, role: .search)` on iOS 26+.
The Fallback (regular 5th magnifier tab) is still used for iOS 17–25
(`legacyTabView`) per design Decision 8, and remains ready if a future iOS
regresses the fit.

## Evidence

- Screenshot: `slot-fit-pr2.png` (XCUITest `XCUIScreen.main.screenshot()` attachment)
- Label list: the recorded `tabBar.buttons` accessibility labels above
- Regression test: `SolennixUITests/TabBarSlotFitTests.testFiveSlotFitProducesNoOverflow`
  (asserts `count == 5` + search present) — re-runs on every CI test pass.

## API symbols verified against the live iOS 26.5 SDK

- `TabRole.search` — `public static var search: TabRole`
- `Tab(value:role:content:)` — selection-bound, system supplies the "Buscar" label
- `.tabViewSearchActivation(.searchTabSelection)` — `TabSearchActivation.searchTabSelection`
  (PR3 `.searchScope($scope)` confirmed present but NOT wired in PR2.)

> Note: the executing agent could not visually parse `slot-fit-pr2.png` (no
> image-input support). The verdict is established from the deterministic,
> machine-queried accessibility label list + count assertion, which is the
> authoritative signal; the screenshot is retained as corroborating evidence.
