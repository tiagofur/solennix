# Tasks: ios-l10n-harness (B-4)

> Permanent iOS localization verification harness (coverage test + anti-literal lint +
> CI test step + 4-literal migration). **Single PR, stacked-to-main.**
> Base: `docs/ios-l10n-polish-archive` @ `15cc449b`. Spec: `sdd/ios-l10n-harness/spec`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~420–520 |
| 400-line budget risk | Medium (comfortably under session 800) |
| Chained PRs recommended | No |
| Suggested split | Single PR · 4 work-unit commits stacked-to-main |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main (single slice lands on main) |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Medium

> `Decision needed before apply: Yes` is driven by the **catalog/bundle contingency**
> below (Unit 3), NOT by the size budget (well within 800).

### Suggested Work Units

| Unit | Goal | Commit (conventional) | Depends on |
|------|------|-----------------------|------------|
| 1 | Coverage test RED→GREEN | `test(ios/l10n): add symbolic-key en+es catalog coverage guard` | — |
| 2 | Anti-literal lint + unit test | `feat(l10n): add anti-literal lint (accent ∪ denylist, cognate-excluded)` | — |
| 3 | Migrate 4 literals + add 4 keys | `feat(ios/l10n): route 4 raw Spanish literals through localized keys` | **Decision** + U2 |
| 4 | CI lint + test step | `ci(ios): add l10n lint and xcodebuild test to ios-validation` | U1,U2,U3 |

## ⚠️ Decision required before Unit 3 (architectural)

Locked decision says "→ FeatureL10n keys," but **`FeatureL10n` lives in `SolennixFeatures`
(`Bundle.module` = Features catalog)** and **2 of the 4 sites are in `SolennixDesign`** —
a leaf package that `SolennixFeatures` depends *on*, so it **cannot import `FeatureL10n`**
(circular). Catalogs in tree:

| Catalog | Bundle |
|---------|--------|
| `ios/Packages/SolennixFeatures/.../Localizable.xcstrings` | Features module |
| `ios/Solennix/Localizable.xcstrings` | **App main** |
| `ios/SolennixWidgetExtension/Localizable.xcstrings` | Widget |
| `ios/Solennix/InfoPlist.xcstrings` | App metadata — **EXCLUDE** from coverage |

Sites: KeyboardShortcuts `Buscar`/`Actualizar` (L91/L96) = **app target**; ConfirmDialog
`Cancelar` (L17) + ViewModifiers `Listo` (L26) = **Design leaf** → `LocalizedStringKey`
resolves against the **main bundle** (see `ViewModifiers.swift:22` comment).

- **Option A (recommended):** all 4 keys → **app catalog** (`ios/Solennix/Localizable.xcstrings`),
  SwiftUI symbolic `Text/Button("key")` against main bundle. No API change; consistent for app
  + Design sites. Deviates from literal "FeatureL10n" wording.
- **Option B:** keys → **Features catalog** + `FeatureL10n`; Design components gain an injected
  `cancelTitle`/`doneTitle` param supplied by the Features caller. Honors wording, changes 2
  Design public APIs.

**Pick A or B before Unit 3.** Coverage test catalog-set (U1) is valid either way.

## Phase 1: Foundations (TDD RED)

- [x] 1.1 Create `ios/SolennixTests/L10nCatalogCoverageTests.swift`; mirror `CatalogFormatStringTests`
      bundle-lookup; iterate symbolic (dotted) keys of **Features + App + Widget** catalogs; assert
      en+es present = `stringUnit.value` ∪ `variations.plural.{one,other}`. EXCLUDE `InfoPlist.xcstrings`.
- [x] 1.2 RED→GREEN: drop `es` from one symbolic key → FAILS reporting key+locale; restore → GREEN (0 gap today).
- [ ] 1.3 Create `scripts/l10n/lint_literals.py`: pure `classify(line)` + CLI; flag when a literal in a
      `Text/Button/Label/.navigationTitle` position contains accent `[áéíóúñü¿¡ÁÉÍÓÚÑÜ]` OR matches denylist
      (Buscar, Actualizar, Cancelar, Guardar, Eliminar, Editar, Cerrar, Agregar, Aceptar, Continuar,
      Configuración, Listo, Volver, Quitar, Añadir, Seleccionar, Ajustes, Cuenta, Ayuda, Soporte,
      Información); EXCLUDE cognates (Error, Perfil, Normal, Radio, Visa). Exit non-zero on first hit.
- [ ] 1.4 Create `scripts/l10n/test_lint_literals.py` mirroring `test_prune_orphan_keys.py`: good/bad
      fixtures, cognate-not-flagged case; `python3 -m pytest scripts/l10n/` green.

## Phase 2: Literal Migration

- [ ] 2.1 Add 4 symbolic keys (en+es) to the catalog chosen above (Option A → `ios/Solennix/Localizable.xcstrings`).
- [ ] 2.2 `KeyboardShortcuts.swift:91` `Button("Buscar")` and `:96` `Button("Actualizar")` → symbolic keys.
- [ ] 2.3 `ConfirmDialog.swift:17` `Button("Cancelar", role: .cancel)` → symbolic key (or injected param, Option B).
- [ ] 2.4 `ViewModifiers.swift:26` `Text("Listo")` → symbolic key (or injected param, Option B).
- [ ] 2.5 Leave `ToastOverlay.swift:196` `Button("Error")` literal (cognate proof point). Leave
      `shortcutRow(... description: "Buscar"/"Actualizar")` L224/225 as-is (helper arg → out of lint
      position-scope; log as **follow-up**, not a regression).

## Phase 3: CI Wiring

- [ ] 3.1 `.github/workflows/ios-ci.yml`: add `L10n lint` step (`working-directory: .`,
      `python3 scripts/l10n/lint_literals.py`) **before** Build, fast-fail.
- [ ] 3.2 Change Build step `build` → `test` (reuse existing simulator lookup + flags);
      bump `timeout-minutes: 45 → 60` (L23).

## Phase 4: Verification Gate

- [ ] 4.1 `xcodebuild test -scheme Solennix -destination 'platform=iOS Simulator,...'` green
      (coverage test + full 515+ suite).
- [ ] 4.2 `python3 scripts/l10n/lint_literals.py` exits 0; `python3 -m pytest scripts/l10n/` green.
- [ ] 4.3 Grep gate: zero `Button/Text("Buscar"|"Actualizar"|"Cancelar"|"Listo")` literals; `Error` still literal.
- [ ] 4.4 `actionlint .github/workflows/ios-ci.yml` (or `gh workflow view`) validates the YAML.

## Rollback

Fully additive: revert the single PR. New test + lint + CI steps and the 4 migrated literals
(restore raw literals, drop 4 keys) remove cleanly. No schema, migration, or shared state.
