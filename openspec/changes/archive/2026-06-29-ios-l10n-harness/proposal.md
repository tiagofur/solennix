# Proposal: ios-l10n-harness (B-4)

> The **permanent verification harness** that GUARANTEES iOS localization completeness and
> blocks future Spanish-literal regressions — the "certainty" required after B-1/B-2/B-3
> shipped. Sprint 1, Change B, Phase 4. **Single PR.**

## Intent

After B-1/B-2/B-3 the catalog is functionally complete but **nothing enforces it stays
that way.** This change adds three guarantees that survive every future commit:

1. **Coverage test** — every **symbolic** (dotted) catalog key MUST carry `en`+`es`
   (`stringUnit` OR `variations.plural`). Build fails on drift.
2. **Anti-literal lint** — CI step flagging raw Spanish UI literals (the gap B-2 closed by hand).
3. **CI `test` step** — `ios-validation` runs `xcodebuild test`, not just build.

## Scope

| In Scope | Out of Scope |
|----------|--------------|
| Coverage test `L10nCatalogCoverageTests.swift` (symbolic keys, en+es) | 467 orphan/stale keys (B-5 / follow-up) |
| Anti-literal lint `scripts/l10n/lint_literals.py` + CI step | `sourceLanguage:en` vs `defaultLocalization:es` mismatch (follow-up) |
| `test` step in `ios-ci.yml`; bump timeout 45→60 min | B-3c `defaultValue` cleanup (~1,865 keys) |
| Migrate the 4 flagged literals → FeatureL10n keys | Android/Web parity (mechanism not portable — tracked Non-Goal) |

**Symbolic-only:** the package catalog has 1577 symbolic keys, all en+es complete (zero gap
→ green today). The other 467 are pre-B-2 prose residue; asserting them forces B-5 into B-4.

## Capabilities

> CONTRACT for sdd-spec.

- **Modified:** `ios-localization` — B-1/B-2/B-3 built the localization behavior; B-4 adds
  the **verification/harness requirement** (coverage + lint + CI test) and **retires the
  "B-3/B-4 harness" Non-Goal** at canonical spec L332.
- **New:** None. The harness verifies an existing capability; no new product behavior.

## Approach & Key Decisions

| Decision | Rationale |
|----------|-----------|
| Assert **symbolic keys only** | Orphan cleanup is separate B-5; avoids 467-key scope creep |
| "Present" = `stringUnit.value` ∪ `variations.plural.{one,other}` | Mirrors B-3 plural mechanism; both shapes count |
| **Compiled-bundle strategy** (recommended) | Read `SolennixFeatures` bundle via `@testable import` (like `CatalogFormatStringTests`); orphans naturally excluded. Source-JSON (`JSONSerialization` over `strings`) is the documented fallback |
| Lint = accent set `[áéíóúñü¿¡ÁÉÍÓÚÑÜ]` ∪ unambiguous-word denylist | Accent-only missed 5 accentless literals |
| Denylist EXCLUDES cognates (Error, Perfil, Normal, Radio, Visa) | FP ~0; `Button("Error")` ToastOverlay.swift:196 stays literal as the cognate proof point |
| Lint in `scripts/l10n/` (not root) | Repo convention — beside `prune_orphan_keys.py` |
| Single PR, `force-chained`, ≤800 review lines | B-4 is small + cohesive |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `ios/SolennixTests/L10nCatalogCoverageTests.swift` | **New** | Symbolic-key en+es coverage; mirrors widget/app catalogs via their bundles |
| `scripts/l10n/lint_literals.py` (+ `test_lint_literals.py`) | **New** | Accent + denylist scanner; unit-tested like `prune_orphan_keys.py` |
| `.github/workflows/ios-ci.yml` (`ios-validation`) | **Modified** | Add `l10n lint` + `xcodebuild test`; timeout 45→60 min |
| `ios/Solennix/Keyboard/KeyboardShortcuts.swift` | Modified | `Button("Buscar")` L91, `Button("Actualizar")` L96 → FeatureL10n keys |
| `…/SolennixDesign/Components/ConfirmDialog.swift` | Modified | `Button("Cancelar", role:.cancel)` L17 → FeatureL10n key |
| `…/SolennixDesign/ViewModifiers.swift` | Modified | `Text("Listo")` L26 → FeatureL10n key |
| Package `.xcstrings` (3 catalogs) | Modified | 4 new symbolic keys (en+es) |
| `openspec/specs/ios-localization/spec.md` | Modified (archive) | Retire "B-3/B-4 harness" Non-Goal (L332) |

> **Cross-platform:** iOS verification infra only — `.xcstrings`/XCTest/xcodebuild isn't
> portable to Android `plurals.xml`/web i18next (tracked Non-Goal, canonical L333). No
> domain/DB/API change, so the cross-platform parity rule is not triggered.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Orphan-scope creep pulls 467 keys into B-4 | Medium | Symbolic-only; orphans are B-5 |
| Lint false positives block PRs | Low | Cognate exclusion; unit-test against good/bad fixtures |
| CI time over budget | Medium | Timeout 45→60 min; reuse existing simulator lookup |
| `sourceLanguage`/`defaultLocalization` contradiction misleads | Low | Flagged; explicitly out of scope (follow-up) |
| Compiled-bundle lookup fragile across SPM versions | Low | Source-JSON fallback documented in design |

## Rollback Plan

Fully additive: revert the single PR. New test/lint/CI steps + the 4 migrated literals
(restore raw literals, drop 4 new keys) remove cleanly. No schema, migration, or shared state.

## Dependencies

- Base: `docs/ios-l10n-polish-archive` @ `15cc449b` (B-3 merged into canonical).
- Reuses `FeatureL10n` (B-1/B-2) + `variations.plural` (B-3). No new external dependency.

## Success Criteria

- [x] `xcodebuild test -scheme Solennix` green; coverage test passes (0 symbolic gap)
- [x] `scripts/l10n/lint_literals.py` exits 0 on the migrated codebase
- [x] `ios-ci.yml` `ios-validation` runs BOTH `l10n lint` and `xcodebuild test` on PRs
- [x] Zero `Button/Text("Buscar|Actualizar|Cancelar|Listo")` literals remain (grep gate)
- [x] "B-3/B-4 harness" Non-Goal retired from canonical spec on archive
- [x] CI time within the 60-min budget

## Non-Goal Fulfillment (for archive)

> Mirrors how B-3 retired the "True pluralization" Non-Goal.

Archive fulfills + removes canonical Non-Goal (`openspec/specs/ios-localization/spec.md` L332):
*"B-3/B-4 harness: catalog-coverage-at-scale test, CI anti-literal lint, `test` step in
`ios-ci.yml`. (B-4, deferred.)"* The `defaultValue cleanup` (B-3c) and Android/Web parity
Non-Goals remain.
