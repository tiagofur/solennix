# Proposal: iOS "Feel" Polish — Springs, A11y Materials, SF Symbols

## Intent

The iOS app's bones are first-party (audit #2899), but motion is the "#1 not-Apple feel tell" (100% easeInOut, zero interaction springs); a11y materials ignore Reduce Transparency (0 hits) and SF Symbol rendering modes are underused (hierarchical on 2 sites). This makes the app **feel** Apple-native — springs on touches, a11y-correct glass, richer symbols. It changes how it feels to touch, **not** what it does.

## Scope

### In Scope
- **Motion (headline):** convert the 14 INTERACTION easeInOut sites → springs per heuristic; add `reduceMotion ? nil : <spring>` at every converted site (8 of 14 currently lack the env read).
- **A11y materials (ship first):** one branch in `AdaptiveGlassModifier` on `accessibilityReduceTransparency` → opaque `SolennixColors.surface` (fixes 22 `.adaptiveGlass` sites).
- **SF Symbols:** `.hierarchical` on `EmptyStateView` (1 edit → ~29 sites) + biometric/auth heroes; `.palette` only on 2+ semantic-layer symbols (KPI, status badges).

### Out of Scope
- Increase Contrast (no leverage point — per-use colors; separate pass).
- The 16 cross-fade/progress easeInOut sites (shimmer, progress arcs, toast dismiss, banner fades — easeInOut/linear is correct there).
- 3 out-of-funnel direct material usages; `.symbolEffect` (9 healthy sites); B-5 orphans; Sprint 3+.
- Android/Web/Backend — iOS-native rendering primitives, no domain/DB/API surface → parity not triggered (see Capabilities).

## Capabilities

### New Capabilities
- `ios-feel-polish`: motion-curve contracts (interaction springs w/ reduce-motion opt-out), a11y material fallback (Reduce Transparency), and SF Symbol rendering-mode rules (hierarchical vs palette boundary) for the iOS app.

### Modified Capabilities
- None. Feel behavior is not spec'd anywhere today (zero `spring`/`symbolRendering`/`reduceTransparency` terms across `openspec/specs/`).

## Approach

- **Leverage points over sprawl:** glass modifier (1 edit → 22 sites) and `EmptyStateView` (1 edit → ~29 sites) first — disproportionate ROI.
- **Motion:** convert the 14 interaction sites per the heuristic in exploration #2996 (`.bouncy`/`.snappy`/`.smooth` by interaction class). **Every converted site MUST add `reduceMotion ? nil : <spring>`** — 8 of 14 lack the read today.
- **Tune on device:** presets are starting points; tune up only where it feels dead.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `GlassSurface.swift` `AdaptiveGlassModifier` | Modified | reduceTransparency branch → opaque surface (22 sites) |
| 14 interaction files (OnboardingView, EventFormView, CalendarGridView, EventListView, ClientPortalShareSheet, EventChecklistView, EventPurchaseChecklistView, AccountDeletionView, Step4PersonnelPanel) | Modified | easeInOut → spring + reduceMotion ternary |
| `EmptyStateView`, BiometricGateView, ContentView, Forgot/Reset/Register/TeamInviteAccept views, SearchView | Modified | hierarchical rendering |
| KPICardView, ProductDetailView, EventDetailHubComponents, CheckLowStockIntent | Modified | palette on 2+ semantic-layer symbols |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Spring over-tuning (jarring/overshoot) | High | start conservative (preset defaults); iPhone pass; tune UP only where dead |
| Reduce-motion regression (8 sites) | High | ternary mandatory at every converted site; verify-phase env snapshot |
| Liquid Glass (iOS 26) × reduceTransparency fight | Med | test iOS 26 + 17; branch falls back opaque, no morph fight |
| Palette breaks brand-gold discipline | Med | palette ONLY on 2+ semantic-layer symbols, never flat brand glyphs |

## Rollback Plan

All changes are additive (springs replace easing in place; rendering modifiers stack; glass branch is additive on an env value). Revert the PR(s) — no schema/data migration, no API contract, no irreversible state. PR1 glass / PR2 motion / PR3 symbols are independent and independently revertible.

## Dependencies

- iOS 17+ target (spring presets, `.symbolRenderingMode`); iOS 26 Liquid Glass for the reduceTransparency test matrix.

## Success Criteria

- [ ] 0 interaction easeInOut sites remain (16 cross-fade/progress untouched — grep-diff verified).
- [ ] Every converted interaction site reads `accessibilityReduceMotion` → `nil` when on.
- [ ] Reduce Transparency ON → glass renders opaque; OFF → unchanged.
- [ ] `EmptyStateView` icon + biometric/auth heroes render hierarchical on device.
- [ ] Real-iPhone tuning pass: no jarring interactions; reviewer signs off it "feels Apple-native".