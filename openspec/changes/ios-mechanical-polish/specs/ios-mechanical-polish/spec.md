# Delta for ios-mechanical-polish

> Mechanical iOS foundation change (Sprint 1, Change A): AccentColor asset, structured logging, Dynamic Type. **No product behavior change.** Pure theming/accessibility/logging hygiene that unblocks Change B (`ios-localization`).
> Authoritative file:line scope: exploration `sdd/ios-clean-house/explore` (Engram #2901). Keep-vs-remove tint sites reference that enumeration.

## Non-Goals

- Localization (~192 Spanish sites), `knownRegions: en`, `InfoPlist.xcstrings`, `KPIWidget "+12%"` data bug → all **Change B**.
- Any UI behavior / layout-intent change. Cross-platform parity (Android/Web/Go) — not triggered.
- The ~22 font sites already correct via `@ScaledMetric` — **MUST NOT be touched**.

## ADDED Requirements

### Requirement: Brand AccentColor Asset Inheritance

The system SHALL provide an `AccentColor.colorset` equal to gold `#C4A265` (== `SolennixColors.primary` / `tabBarActive`). Gold `.tint(.primary)` / `.tint(.tabBarActive)` calls (~38 sites) SHALL be removed so controls inherit the asset. **NAMING TRAP (hard rule)**: `SolennixColors.accent` = NAVY `#1B2A4A` — every `.tint(.accent)` call MUST STAY. Semantic tints (`.error`, `.success`, `.warning`, `.info`, `.blue`, `.green`, `.white`, dynamic status colors, loading tints) MUST remain UNCHANGED. AccentColor is glyph/accent only (~1.9:1 on cream) and MUST NOT be used for body text.

#### Scenario: Gold tint removed still renders gold

- GIVEN a view previously used `.tint(.primary)` (gold) with AccentColor asset set to `#C4A265`
- WHEN the tint call is removed
- THEN the control renders the same gold via the inherited AccentColor asset

#### Scenario: Navy and semantic tints preserved

- GIVEN the enumeration's keep-list (`.tint(.accent)` navy + all semantic tints)
- WHEN the change is applied
- THEN a grep-diff over the diff shows ZERO removed `.tint(.accent)` or semantic-tint lines

#### Scenario: AccentColor value is single-source-of-truth

- GIVEN `AccentColor.colorset` and `SolennixColors.primary`
- WHEN both are read
- THEN both resolve to `#C4A265` (no drift)

### Requirement: Structured Logging Replaces print

The system SHALL contain zero `print(` calls in production targets. Logging MUST use `os.Logger` with subsystem `com.solennix.app` and a category per module (reused from `NotificationManager.swift:10`). Critical error paths (model container, push token, spotlight) MUST route to `os.Logger` AND the existing Sentry hook — not be deleted. Debug-leftover prints MUST be deleted. All log strings MUST be English.

#### Scenario: Normal flow is console-silent

- GIVEN the app running a normal user flow
- WHEN no error occurs
- THEN no `print(` output appears (zero `print(` in production targets by grep)

#### Scenario: Critical error reaches Sentry

- GIVEN a critical path (e.g. model container failure)
- WHEN the error occurs
- THEN it is emitted via `os.Logger` AND received by the wired Sentry integration
- AND the message payload is preserved (not lost in migration)

#### Scenario: Log strings are English

- GIVEN any migrated log call (formerly Spanish)
- WHEN inspected
- THEN the string literal is English (code/logs-in-English convention)

### Requirement: Dynamic Type Scaling for Metrics and Capped Glyphs

Meaningful content — revenue/count metrics, counts, badges — MUST scale via `@ScaledMetric` with **no cap** (relative to `.title`/`.largeTitle`). Empty-state icons (40–64) MUST scale with a reasonable cap. Decorative glyphs (splash 96/64, onboarding hero 120) MUST be fixed or high-capped and MUST NOT scale with Dynamic Type. Already-correct `@ScaledMetric` sites (~22) MUST be untouched. Widget/intent target fonts SHOULD be wrapped for consistency (lower priority — system-capped anyway).

#### Scenario: Metrics scale at AX5, decorative does not overflow

- GIVEN Dynamic Type set to Accessibility Extra Extra Extra Large (AX5)
- WHEN a revenue/count metric and a decorative onboarding glyph render
- THEN the metric scales up and remains legible
- AND the decorative glyph does not overflow or break layout

#### Scenario: Correct existing sites untouched

- GIVEN the ~21 actionable fixed-font sites and the ~22 already-correct `@ScaledMetric` sites
- WHEN the change is applied
- THEN only the ~21 fixed-font sites are wrapped; the ~22 are unchanged by diff

## Acceptance & Validation

| Check | Method |
|-------|--------|
| Build compiles | `xcodebuild build` green across app/widget/intent/live-activity targets |
| No `print(` in prod | grep over production targets returns zero |
| No wrong tint removed | grep-diff asserts no removed `.tint(.accent)` or semantic tint |
| Tests pass | `xcodebuild test` green; `./init.sh` green |
| Dynamic Type at AX5 | Device check: metrics scale, decorative glyphs don't overflow |
| Critical paths | Each of the ~10 critical sites reviewed for Logger + Sentry routing |
