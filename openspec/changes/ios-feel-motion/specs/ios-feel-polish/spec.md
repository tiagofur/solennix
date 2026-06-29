# ios-feel-polish Specification

> iOS "Feel" polish (Sprint 2): interaction springs, a11y material fallback, SF
> Symbol rendering modes. Changes how the app FEELS to touch, not what it does.
> iOS-only rendering primitives — cross-platform parity NOT triggered (no
> domain/DB/API surface).

## Motion Interaction→Spring Heuristic

| Class | Preset |
|---|---|
| Button tap / toggle / page advance | `.bouncy` |
| Checkbox / cell | `.snappy` |
| Page/step switch, expand-collapse | `.smooth` |
| List reorder | `.snappy`/`.spring` |

Springs are CONSERVATIVE (luxury restraint). Presets are starting points — tune
toward "alive but contained", never playful bounce. File:line scope: exploration
`sdd/ios-feel-motion/explore` (Engram #2996).

## Requirements

### Requirement: Spring Motion on Interactions

The 14 INTERACTION easeInOut sites SHALL become spring presets per the heuristic
above. The 16 cross-fade/progress sites (shimmer, progress arcs, toast dismiss,
banner fades) MUST remain easeInOut/linear — they are appearance-class, not
interaction-class.

#### Scenario: Button tap → bouncy

- GIVEN an interaction driving a state toggle/page advance (e.g. onboarding Next)
- WHEN the user taps
- THEN the change animates with `.bouncy` (slight overshoot, responsive)

#### Scenario: Checkbox toggle → snappy

- GIVEN a checkbox/cell selection (e.g. checklist item, calendar date)
- WHEN toggled
- THEN it animates with `.snappy` (tight, faster than bouncy)

#### Scenario: Page switch → smooth, no overshoot

- GIVEN a page/step transition (onboarding TabView, event form step)
- WHEN the page advances
- THEN it animates `.smooth` (critically damped, no overshoot → no seasickness)

#### Scenario: Cross-fade sites untouched

- GIVEN the 16 cross-fade/progress sites
- WHEN the change is applied
- THEN a grep-diff shows them unchanged (still easeInOut/linear/repeatForever)

### Requirement: Reduce-Motion Respect

Every converted spring site MUST read `@Environment(\.accessibilityReduceMotion)`
and gate the spring: `reduceMotion ? nil : <spring>`. When Reduce Motion is ON,
the animation SHALL collapse to an instant snap (nil — Apple default); no spring
is forced on an opted-out user. 8 of 14 sites currently lack the read — they
MUST add it (converting without it regresses reduce-motion users).

#### Scenario: Reduce Motion ON → instant snap

- GIVEN Reduce Motion enabled in system settings
- WHEN the user interacts at any of the 14 sites
- THEN the state change snaps instantly with no spring animation

#### Scenario: Reduce Motion OFF → spring

- GIVEN Reduce Motion disabled
- WHEN the user interacts
- THEN the spring preset animates as specified

### Requirement: Accessible Materials

`AdaptiveGlassModifier` SHALL branch on
`@Environment(\.accessibilityReduceTransparency)`: when ON, it MUST collapse to
opaque `SolennixColors.surface`; when OFF, behavior is unchanged. This single
leverage edit covers all 22 `.adaptiveGlass` sites. On iOS 26+ the opaque
fallback MUST NOT fight Liquid Glass morphing (opaque fill replaces blur cleanly).

#### Scenario: Reduce Transparency ON → opaque

- GIVEN Reduce Transparency enabled
- WHEN any `.adaptiveGlass` surface renders
- THEN it draws opaque (`SolennixColors.surface`), with no blur/translucency

#### Scenario: Reduce Transparency OFF → unchanged

- GIVEN Reduce Transparency disabled
- WHEN the surface renders
- THEN the glass blur is identical to current behavior

### Requirement: SF Symbol Rendering

`EmptyStateView` icon and biometric/auth hero icons SHALL render `.hierarchical`
for depth. `.palette` MUST be applied ONLY to symbols with 2+ semantic layers
(KPI/status badges) — NEVER on flat single-color brand glyphs (preserves gold
brand-color discipline).

#### Scenario: EmptyStateView → hierarchical

- GIVEN an EmptyStateView with an icon
- WHEN rendered
- THEN the icon uses hierarchical rendering (secondary-layer depth) — propagating to ~29 call sites

#### Scenario: KPI badge → palette (2 colors)

- GIVEN a KPI/status symbol with 2 semantic layers (e.g. dollarsign.circle)
- WHEN rendered
- THEN palette renders distinct semantic colors per layer

#### Scenario: Brand glyph stays monochrome

- GIVEN a flat single-color brand-gold glyph
- WHEN rendered
- THEN it stays monochrome/hierarchical (no palette forced)

## Non-Goals

- Increase Contrast (no leverage point — per-use colors; separate pass).
- The 16 cross-fade/progress easeInOut sites.
- 3 out-of-funnel direct material usages; `.symbolEffect` (9 healthy sites);
  B-5 orphans; Sprint 3+.
- Android/Web/Go parity — iOS-native rendering primitives only.

## Validation

| Check | Method |
|---|---|
| Build + tests green | `xcodebuild build` (app/widget/intent); `xcodebuild test` |
| 14 sites use springs | grep: no interaction `easeInOut` left; spring presets at 14 sites |
| Reduce-motion gate | grep: each converted site has `reduceMotion ? nil :` ternary |
| Glass fallback | grep: `AdaptiveGlassModifier` reads `accessibilityReduceTransparency` |
| Symbols | grep: `EmptyStateView` has `.hierarchical` |
| Spring tuning | MANUAL iPhone pass — not unit-testable; reviewer signs off "feels Apple-native" |
