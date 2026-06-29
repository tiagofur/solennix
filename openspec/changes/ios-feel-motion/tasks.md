# Tasks: ios-feel-motion (Sprint 2 — Feel polish)

iOS "Feel" polish only — interaction springs, a11y material fallback, SF Symbol rendering modes.
**Rendering primitives, no domain/DB/API surface → cross-platform parity NOT triggered.**
Scope (file:line) and heuristic come from exploration Engram `sdd/ios-feel-motion/explore` (#2996).
Design skipped (locked decision #10) — leverage points already identified.

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

| Field | Value |
|-------|-------|
| Strategy | force-chained, stacked-to-main |
| Budget | 800 changed lines total; per-PR target < 200 |
| PR1 (a11y) | ~50–80 LOC — lowest risk, ships first (locks a11y floor) |
| PR2 (motion) | ~120–180 LOC — 14 sites + reduceMotion ternaries; needs device tuning |
| PR3 (symbols) | ~60–100 LOC — EmptyStateView + heroes + palette; additive polish |

### Suggested Work Units

| Unit | Goal | Base | Notes |
|------|------|------|-------|
| PR1 | AdaptiveGlassModifier reduceTransparency fallback (1 edit → 22 sites) | `main` | deterministic, no tuning |
| PR2 | 14 interaction sites → springs + reduceMotion ternaries | PR1 | device gate hard |
| PR3 | EmptyStateView hierarchical + auth heroes + KPI/status palette | PR2 | additive |

---

## Phase 1 — PR1: A11y materials (glass)

- [x] 1.1 In `GlassSurface.swift` `AdaptiveGlassModifier` add `@Environment(\.accessibilityReduceTransparency) private var reduceTransparency`.
- [x] 1.2 In `body(content:)`, branch FIRST: `if reduceTransparency { content.background(shape.fill(SolennixColors.surface)) }` (opaque token, `Colors.swift:163`); else current iOS26/pre-26 logic unchanged.
- [x] 1.3 Verify iOS 26 opaque fallback does NOT fight `glassEffect` morph (opaque fill replaces blur cleanly). — branched before `#available(iOS 26)`, so the opaque path short-circuits glassEffect on every OS.
- [x] 1.4 Build: `xcodebuild build` (app + widget + intent targets). — `xcodebuild test` green (0 failures). Note: a `#Preview` toggling reduceTransparency could NOT be added: `accessibilityReduceTransparency` is a read-only `EnvironmentValues` key (get-only), so `.environment(\.accessibilityReduceTransparency, true)` fails to compile. Verified on device/simulator instead.

**PR1 unit** — start: glass modifier, no a11y branch. finish: opaque fallback on 22 sites. verify: grep `accessibilityReduceTransparency` in GlassSurface + build green + preview toggle. rollback: revert single file. commit: `feat(ios/design): reduce-transparency opaque fallback in AdaptiveGlassModifier`.

## Phase 2 — PR2: Motion (14 interaction sites → springs)

Heuristic (conservative/luxury; presets are STARTING points — tune on device):

| Site (file:line) | Class | Spring |
|---|---|---|
| OnboardingView:135 Next · OnboardingView:313 dismiss · AccountDeletion:210 delete bg · ClientPortalShareSheet:313/318 copy | tap/toggle/feedback | `.bouncy` |
| AccountDeletion:159 checkbox · EventPurchaseChecklist:126 · CalendarGrid:88 cell · EventChecklist:196 toggle · EventListView:933 sort | checkbox/cell/reorder | `.snappy` |
| OnboardingView:114 TabView · OnboardingView:128 page dots · EventFormView:153 step · Step4PersonnelPanel:82 expand | page switch / expand | `.smooth` |

- [x] 2.1 Convert each site's `easeInOut` → its spring preset per table above.
- [x] 2.2 At ALL 14 sites add reduceMotion gate: `reduceMotion ? nil : <spring>`. 9 sites lacked gating today (5 files lacked the read: AccountDeletion, CalendarGrid, EventList, ClientPortalShareSheet, Step4Personnel — added `@Environment(\.accessibilityReduceMotion)`; + 2 calls in already-declaring files ungated: EventPurchaseChecklistView:126, EventChecklistView:196). Reduce-motion fallback = `nil` (instant snap).
- [x] 2.3 DO NOT touch the 16 cross-fade/progress sites (shimmer `repeatForever`, progress arcs, toast dismiss, banner fades) — easeInOut/linear is correct there.

**PR2 unit** — start: 14 easeInOut interaction sites (8 ungated). finish: 14 springs, all gated. verify: grep `easeInOut` shows only the 16 cross-fade sites; grep `reduceMotion ? nil :` at 14 sites; build green; MANUAL iPhone tuning pass (reviewer signs "feels Apple-native, conservative"). rollback: revert the touched files. commit: `feat(ios): spring motion on interactions with reduce-motion respect`.

## Phase 3 — PR3: SF Symbol rendering modes

- [x] 3.1 `EmptyStateView.swift:35` — added `.symbolRenderingMode(.hierarchical)` to the hero icon (1 edit → ~29 call sites get depth). NOTE: implemented UNCONDITIONAL `.hierarchical` (orchestrator refinement of the tasks' conditional `iconColor == nil ? .monochrome : .hierarchical`) — hierarchical is safe on both tinted and neutral icons (opacity layers in the existing tint); consistent depth across all 29 sites.
- [x] 3.2 Biometric/auth hero icons → `.hierarchical`: `BiometricGateView:53`, `ContentView:217` faceid, `AccountDeletion:223`, `ForgotPasswordView:144/197`, `ResetPasswordView:148/206`, `RegisterView:171`, `TeamInviteAcceptView:52/117`, `SearchView:250/273/366` (14 hierarchical sites total incl. EmptyStateView).
- [x] 3.3 `.palette` applied ONLY on confirmed 2-semantic-layer NON-brand-gold symbols: `KPIWidget:127` (`dollarsign.circle.fill` → `.green,.white`), `CheckLowStockIntent:77` (`exclamationmark.triangle.fill` → `.red,.white`). SKIPPED (brand discipline): `KPICardView:38` (dynamic `icon` → palette renders inconsistently across KPIs), `ProductDetailView:571` (flat brand-gold/success glyph — critical rule), `EventDetailHubComponents:132` (flat brand-gold ceremonial seal, already animated), widget calendar/clock heroes (single-layer).

**PR3 unit** — start: flat icons, 2 hierarchical sites. finish: EmptyStateView hierarchical (29 sites) + heroes + multi-layer palette. verify: grep `.symbolRenderingMode` count rises; `EmptyStateView` has `.hierarchical`; no palette on brand-gold glyphs; build green. rollback: revert touched files. commit: `feat(ios/design): hierarchical SF Symbols + palette on multi-layer status badges`.

## Phase 4 — Verification & docs (per PR + final)

- [ ] 4.1 `xcodebuild test` green after each PR (no new failures; animations not unit-testable — covered by build + grep gates + device pass).
- [ ] 4.2 Grep gates (hard): no interaction `easeInOut` left (only 16 cross-fade); 14 sites `spring` + `reduceMotion ? nil :`; GlassSurface reads `accessibilityReduceTransparency`; `EmptyStateView` has `.hierarchical`.
- [ ] 4.3 MANUAL device pass (hard gate, PR2 especially): Reduce Motion ON → instant snap; Reduce Transparency ON → opaque glass; spring feel conservative/elegant.
- [ ] 4.4 Update `docs/PRD/11_CURRENT_STATUS.md` iOS feel-polish status entry (config rule; status-line touch only).
