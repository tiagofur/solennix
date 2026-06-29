# Delta for ios-localization

> Phase 4 (B-4) — the **permanent verification harness**. Adds NEW verification requirements;
> no existing localization behavior is changed. **Fulfills + retires** the canonical Non-Goal
> at `ios-localization/spec.md` L332 (*"B-3/B-4 harness: catalog-coverage-at-scale test, CI
> anti-literal lint, `test` step in `ios-ci.yml`. (B-4, deferred.)"*) on archive — mirroring
> how B-3 retired the "True pluralization" Non-Goal. The `defaultValue` cleanup (B-3c) and
> Android/Web parity Non-Goals REMAIN.

## ADDED Requirements

### Requirement: Catalog Coverage Test

A permanent XCTest SHALL assert that every **symbolic** (dotted) catalog key carries BOTH `en`
and `es`. "Present" = a `stringUnit.value` OR a `variations.plural.{one,other}` block (mirrors
the B-3 plural mechanism). The test MUST iterate the symbolic-key sets of the `SolennixFeatures`,
Widget, and App-Intent catalogs and FAIL the build on any gap. It MUST pass green today (zero
gap) so it guards future drift, not current debt. Orphan/stale prose keys (no dot) are out of
scope (B-5).

#### Scenario: green today

- GIVEN the merged B-1/B-2/B-3 catalog
- WHEN the coverage test runs
- THEN every symbolic key resolves to en+es (0 gap) and the test passes

#### Scenario: fails on a deliberately-missing translation (RED→GREEN fixture)

- GIVEN a symbolic key whose `es` value is removed
- WHEN the coverage test runs
- THEN it FAILS reporting the key + missing locale
- AND restoring the value turns it GREEN

#### Scenario: plural keys count via variations

- GIVEN a count-bearing key with no `stringUnit` but `variations.plural.one`+`other` en+es
- WHEN the coverage test evaluates it
- THEN it is counted as present (parity holds)

### Requirement: Anti-Literal Lint

A lint script at `scripts/l10n/lint_literals.py` SHALL scan `.swift` sources for raw Spanish UI
literals in `Text(...)`, `Button(...)`, `Label(...)`, and `.navigationTitle(...)` positions. A
literal MUST be flagged when it contains an accent char (`áéíóúñü¿¡ÁÉÍÓÚÑÜ`) OR matches the
unambiguous-Spanish-word denylist (`Buscar`, `Actualizar`, `Cancelar`, `Guardar`, `Eliminar`,
`Editar`, `Cerrar`, `Agregar`, `Aceptar`, `Continuar`, `Configuración`, `Listo`, `Volver`,
`Quitar`, `Añadir`, `Seleccionar`, `Ajustes`, `Cuenta`, `Ayuda`, `Soporte`, `Información`).
Cognates (`Error`, `Perfil`, `Normal`, `Radio`, `Visa`) MUST be excluded to keep false positives
~0. The script MUST exit non-zero on the first violation and SHALL be unit-tested with good/bad
fixtures, like the sibling `prune_orphan_keys.py`.

#### Scenario: lint exits 0 after migration

- GIVEN the codebase after the 4 flagged literals are migrated to FeatureL10n
- WHEN `scripts/l10n/lint_literals.py` runs
- THEN it exits 0

#### Scenario: lint flags a new raw Spanish literal

- GIVEN a source file introducing a new `Button("Cancelar")`
- WHEN the lint runs
- THEN it exits non-zero reporting the file, line, and matched token

#### Scenario: cognate stays literal (proof point)

- GIVEN `Button("Error")` (a valid EN/ES cognate)
- WHEN the lint runs
- THEN it is NOT flagged (cognate exclusion)

### Requirement: CI Lint + Test Step

The `ios-ci.yml` `ios-validation` job SHALL run the anti-literal lint AND `xcodebuild test`
(not build-only) on every PR. The job timeout MUST be 60 minutes.

#### Scenario: CI runs both lint and test

- GIVEN a PR opening against the default branch
- WHEN `ios-validation` executes
- THEN it runs the `l10n lint` step AND the `xcodebuild test` step, both gating merge

#### Scenario: lint failure blocks CI

- GIVEN a PR introducing a flagged raw Spanish literal
- WHEN the lint step runs
- THEN the job fails before the test step

### Requirement: Literal Migration

The 4 flagged raw literals SHALL be migrated to `FeatureL10n` keys, each with `en`+`es`:
`Button("Buscar")` (KeyboardShortcuts.swift:91), `Button("Actualizar")` (KeyboardShortcuts.swift:96),
`Button("Cancelar", role:.cancel)` (ConfirmDialog.swift:17), `Text("Listo")` (ViewModifiers.swift:26).
The `Button("Error")` cognate at ToastOverlay.swift:196 MUST stay literal. No
`Buscar/Actualizar/Cancelar/Listo` raw literal MAY remain after migration.

#### Scenario: 4 literals routed through FeatureL10n

- GIVEN the flagged source sites
- WHEN migrated
- THEN each calls `FeatureL10n.text("...")` with a new symbolic key carrying en+es
- AND `Error` stays a literal
