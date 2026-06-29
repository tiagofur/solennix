# ios-localization Specification

> iOS localization architecture.
>
> **Phase 1 (B-1, `ios-system-language`):** the app follows the **system language**
> (auto), retiring the `FeatureL10n` runtime `preferredLocale` override AND the
> `SolennixApp` `.environment(\.locale)` override. MXN currency is pinned to a fixed
> `es_MX` business locale; dates follow the system locale. The app reports the device
> **language code** (`es`/`en`) to the backend (throttled). Implemented + merged: PR #623,
> CI green.
>
> **Phase 2 (B-2, `ios-catalog-english`):** **English is the catalog source language**
> (universal fallback). Hardcoded Spanish migrated to semantic keys; orphan keys pruned;
> Widget/Intents/InfoPlist catalogs completed. Implemented + merged: PRs #625 / #627 / #631,
> CI green (378/378 tests). Audit trail: `openspec/changes/archive/2026-06-27-ios-catalog-english/`.
>
> **Phase 3 (B-3, `ios-l10n-polish`):** **True CLDR pluralization** via `.xcstrings`
> `variations.plural` (`one`/`other`, en+es). New `FeatureL10n.plural(_:defaultValue:count:)`
> helper routes through `String.localizedStringWithFormat`; 38 count-bearing keys varied
> (31 package + 6 Widget + 1 App-Intent); ~40 call sites migrated; 2 double-plural keys
> split into 4 flat siblings each (Xcode rejects nested plural variations). Retires the
> "True pluralization" Non-Goal from B-2. Implemented + merged: PRs #635 / #639 / #641,
> CI green (387/387 tests, 1 skipped locale-guard). B-3c (defaultValue cleanup) stays deferred.
>
> **Phase 4 (B-4, `ios-l10n-harness`):** **Permanent verification harness.** An XCTest
> (`L10nCatalogCoverageTests`) asserts every **symbolic** (dotted) catalog key carries
> `en`+`es` (1674 keys, 0 gap, GREEN today). An anti-literal lint
> (`scripts/l10n/lint_literals.py` — accent ∪ denylist minus cognates, `#Preview`-skipped,
> 28 fixtures) gates raw Spanish UI literals. `ios-ci.yml` `ios-validation` runs the lint
> AND `xcodebuild test` (not build-only) on every PR (timeout 60 min). 7 user-facing
> literals migrated to `LocalizedStringKey` against the app-target catalog (Option A:
> `SolennixDesign` is a leaf that cannot import `FeatureL10n` — circular). The new CI
> `test` step surfaced 4 locale-fragile tests, fixed to branch on
> `FeatureL10n.languageCode`. Retires the "B-3/B-4 harness" Non-Goal. Implemented +
> merged: PR #653 (Closes #652), CI green (398/398 tests, 0 skipped, en-US).
>
> Decisions locked in Engram #2909 / #2910 (B-1), #2920–#2924 (B-2), #2946–#2949 (B-3),
> #2981 / #2983 / #2985 (B-4).

## Requirements

### Requirement: System-Locale Resolution

`FeatureL10n` SHALL resolve via `Bundle.module` for the **system** locale. No runtime
`preferredLocale` override; accessors MUST reflect `Locale.autoupdatingCurrent`. Source is
now **English**; unmatched locales resolve to English.

> Previously (B-1, pre-B-2): unmatched locales fell back to the `es` source for keys
> lacking `en`. That scenario is **superseded** — B-2 made `en` the source.

#### Scenario: es-AR device sees Spanish

- GIVEN device locale `es-AR` and a key with an `es` value
- WHEN `FeatureL10n.text(k)` is called
- THEN it returns the `es` catalog value

#### Scenario: general es resolution

- GIVEN any `es-*` locale (`es-MX`, `es-AR`, `es-419`)
- WHEN `FeatureL10n.text(k)` is called
- THEN all resolve to the same `es` value

#### Scenario: universal English fallback (supersedes B-1 pre-B-2 fallback)

- GIVEN a non-en/non-es locale (e.g. `fr-FR`) or `en-US`
- WHEN `FeatureL10n.text(k)` is called for a live key
- THEN it returns the English source value, never Spanish

### Requirement: English Catalog Source Language

`Localizable.xcstrings` MUST declare `"sourceLanguage": "en"` (L2); `project.pbxproj` MUST
set `developmentRegion = en` (~L676). Because the app ships no bundled catalog (resolved via
`Bundle.module`), `Info.plist` MUST also declare `CFBundleLocalizations = [en, es]` so the
supported languages are not reduced to `{developmentRegion}` alone. Semantic keys carry
English forward unchanged — zero call-site changes (Option S).

#### Scenario: inversion applied

- GIVEN the merged B-2 commit
- WHEN the catalog + project are inspected
- THEN `sourceLanguage` and `developmentRegion` are both `en`, `CFBundleLocalizations` lists
  `en` + `es`, and no key is renamed

### Requirement: Orphan Key Pruning

A key whose localizations are all empty AND has zero codebase refs SHALL be removed. No live
key MAY be pruned — a pre-deletion ref check is MANDATORY; zero grep hits suffice.

#### Scenario: dead orphans removed

- GIVEN a key with empty `en`+`es` and zero grep hits
- WHEN the prune transform runs
- THEN the key is removed

#### Scenario: live key protected (ref-check gate)

- GIVEN a key with ≥1 codebase reference
- WHEN the prune transform runs
- THEN the key is retained

### Requirement: Hardcoded Spanish Migration

Spanish literals SHALL move to keys: package sites via `FeatureL10n.text("semantic.key")`;
widget sites via per-target `.xcstrings` (`sourceLanguage: en`) with
`Text(LocalizedStringKey)` auto-extraction (separate bundles can't use `FeatureL10n`).
App-Intent sites resolve against `Bundle.main` (the intent `.swift` files compile into the
**Solennix app target**, not a separate extension) and therefore share the app-target
`Localizable.xcstrings`. Format strings MUST preserve positional arg indices identically
across `en`+`es`. Brand literals (see Brand String Allow-List) stay untranslated.

#### Scenario: package literal → semantic key

- GIVEN a `Text("Eventos")` in `SolennixFeatures`
- WHEN migrated
- THEN it calls `FeatureL10n.text("events.title")` with `en`+`es`

#### Scenario: format-string positional args preserved

- GIVEN `"\(n) eventos"` migrated to a format key
- WHEN `en`+`es` values are authored
- THEN positional args (`%lld`, `%1$@`) match in count/order

#### Scenario: extension site → per-target catalog

- GIVEN a Widget `Text("…")` site
- WHEN migrated
- THEN it resolves from the Widget's own `.xcstrings`, not `FeatureL10n`

### Requirement: Catalog Completion

Catalog SHALL be complete: the `EventosViewModeToggle` keys; `InfoPlist.xcstrings` (3
permission strings wired to `Solennix`); Widget + Intents `.xcstrings`. Each added key MUST
carry `en`+`es`.

#### Scenario: toggle + InfoPlist keys present

- GIVEN the merged catalog
- WHEN the toggle + 3 InfoPlist keys are queried
- THEN all exist with `en`+`es`

#### Scenario: permission prompt localized

- GIVEN a system permission prompt for `Solennix`
- WHEN the device locale is `es-AR`
- THEN it renders Spanish from `InfoPlist.xcstrings`

### Requirement: Brand String Allow-List

Brand strings — "Solennix", "G", plan/tier names (Premium, Pro) — SHALL stay untranslated
literals and MUST NOT enter any catalog.

#### Scenario: brand stays literal

- GIVEN `Text("Solennix")` or `Text("Premium")`
- WHEN migration runs
- THEN the site stays a literal

### Requirement: English Region Ships

The Xcode project MUST list `en` in `knownRegions` and bundle `en.lproj`. Hard prereq — Xcode
will not ship `en.lproj` without it.

#### Scenario: en region registered

- GIVEN the built app bundle
- WHEN `knownRegions` is inspected in `project.pbxproj`
- THEN `en` is present alongside `Base` and `es`

### Requirement: In-App Language Picker Removed

The app MUST NOT expose a language selector. Changing the app language SHALL require the iOS
Settings app.

#### Scenario: Settings has no picker

- GIVEN `SettingsView` rendered (compact and regular layouts)
- WHEN the user scans all sections
- THEN no language picker, no `@AppStorage("preferredLocale")`, and no picker label is present
- AND `SettingsStrings` contains no picker label keys

### Requirement: Backend Language Reporting

The app SHALL report the system **language code** (derived from
`Locale.current.language.languageCode?.identifier`, e.g. `es`/`en`) — NOT the full locale —
to the backend on launch and on `NSLocale.currentLocaleDidChangeNotification`. Reports MUST be
throttled: emitted only when ≠ last-reported. The backend `preferredLanguage` field MUST
remain (meaning shifts: manual choice → device-reported system language); the value shape is
IDENTICAL to today (the retired picker sent `es`/`en`), so no backend/email-template change is
required.

#### Scenario: report fires once on launch

- GIVEN app launches with device locale `es-MX` and last-reported is unset
- WHEN launch completes
- THEN the backend receives `preferredLanguage=es` exactly once

#### Scenario: throttled on subsequent changes

- GIVEN last-reported `es` and the user switches the device locale to `en-US`
- WHEN `currentLocaleDidChangeNotification` fires
- THEN the backend receives `preferredLanguage=en`
- AND a no-op notification emits nothing

### Requirement: MXN Currency Decoupled from Locale

Prices SHALL format as MXN regardless of device locale. MXN is a business currency constant,
not a user-locale preference. Date/number formatters MAY follow the system locale.

#### Scenario: es-AR sees MXN, not ARS

- GIVEN device locale `es-AR` and a price of `150.00` MXN
- WHEN the price is formatted
- THEN it renders with MXN currency formatting, never ARS

#### Scenario: en-US sees MXN, not USD

- GIVEN device locale `en-US` and a price of `150.00` MXN
- WHEN the price is formatted
- THEN it renders with MXN currency formatting, never USD

#### Scenario: dates follow locale

- GIVEN any device locale and a date value
- WHEN the date is formatted
- THEN it MAY follow the system locale

### Requirement: Localization Tests Override-Independent

The localization test suite SHALL assert system-locale resolution. No test MAY depend on a
`preferredLocale` override.

#### Scenario: localization files rewritten green

- GIVEN the `*LocalizationTests.swift` files
- WHEN `xcodebuild test` runs
- THEN every test asserts resolution from the system locale and the full suite is green

### Requirement: Plural-Aware String Resolution

A count-bearing string SHALL be resolved through `FeatureL10n.plural(_:defaultValue:count:)`, which loads the
template from `Bundle.module` and formats it via `String.localizedStringWithFormat`. Plain `String(format:)`
MUST NOT be used for plural-eligible templates — it **silently ignores** `variations.plural` and renders the
`other` form unconditionally (root cause of the historical "1 eventos"/"1 events" bug). `count` is both the
CLDR plural-discriminator (selects `one`/`other`) and the value substituted into the template's `%lld` slot.

> Note: keys with MORE than one interpolated count (nested double-plurals, see *Nested Double-Plural Keys*) are
> formatted via direct `String.localizedStringWithFormat(template, countA, countB)` because
> `FeatureL10n.plural` carries a single count.

#### Scenario: count=1 renders the one-form

- GIVEN a count-bearing key with `variations.plural.one` + `variations.plural.other` in en+es
- WHEN `FeatureL10n.plural(k, default, count: 1)` is called
- THEN it returns the `one` form (e.g. "1 evento"/"1 event"), never the `other` form

#### Scenario: plain String(format:) is the anti-pattern (RED)

- GIVEN a plural-eligible template loaded via `FeatureL10n.text(k)`
- WHEN it is formatted with plain `String(format: template, 1)`
- THEN the `other` form is returned regardless of count (bug) — hence `plural` MUST route through
  `String.localizedStringWithFormat`

#### Scenario: en+es share the CLDR one/other rule (no zero variant)

- GIVEN any count-bearing key and count `0`
- WHEN `FeatureL10n.plural(k, default, count: 0)` is called
- THEN it returns the `other` form — en+es have no CLDR `zero`/`many`/`few` variants

### Requirement: Plural Variation Catalog

Every count-bearing catalog key SHALL declare `variations.plural.one` + `variations.plural.other` in BOTH
`en` and `es`. Single-count call sites resolve via `FeatureL10n.plural`; separate-bundle sites (Widget
extension, App-Intent target — no `FeatureL10n` access) resolve via native
`String.localizedStringWithFormat(String(localized:), count)` against their own `.xcstrings`. The catalog
contains 38 varied keys total: 31 package + 6 Widget + 1 App-Intent.

#### Scenario: count=1 gate per migrated key

- GIVEN every count-bearing key migrated in B-3
- WHEN the sweep test asserts `FeatureL10n.plural(k, count: 1)` against the `one` catalog value
- THEN each key passes (19 inflecting keys in the strict sweep)

#### Scenario: multi-positional-arg key uses native format

- GIVEN a key with two positional args (e.g. `events.detail.paid_partial_a11y` with `%1$lld`/`%2$@`)
- WHEN rendered
- THEN it is formatted via `String.localizedStringWithFormat(template, pct, balance)`, not
  `FeatureL10n.plural` (single-count only)

#### Scenario: locale-invariant key excluded from strict sweep

- GIVEN `events.detail.equipment.assigned_count` (inflects ONLY in es: `equipo`/`equipos`; en invariant
  `equipment`/`equipment`)
- WHEN the locale-agnostic inflecting sweep runs
- THEN it is excluded from the strict sweep (covered by call-site migration only)

### Requirement: Nested Double-Plural Keys

A key whose template interpolates TWO counts that BOTH inflect (e.g. "X units for Y people") SHALL be split
into four flat sibling keys — `<base>.one_one`, `<base>.one_other`, `<base>.other_one`,
`<base>.other_other` — each resolved via `FeatureL10n.plural`/`String.localizedStringWithFormat`. Xcode
REJECTS nested `variations.plural` blocks, so the flat-sibling pattern is the only valid mechanism. Applies
to `products.quantity_for_people` and `products.demand_summary.*`.

#### Scenario: four siblings cover the count×count matrix

- GIVEN the four `products.quantity_for_people.*` sibling keys
- WHEN rendered for (count_a, count_b) ∈ {(1,1), (1,5), (5,1), (5,5)}
- THEN each tuple resolves to its dedicated sibling (one_one / one_other / other_one / other_other)

#### Scenario: nested variations.plural rejected by Xcode

- GIVEN an attempt to nest `variations.plural` inside `variations.plural` in one key
- WHEN Xcode compiles the catalog
- THEN it is rejected — hence the flat-sibling split is MANDATORY for double-plurals

### Requirement: Translation Consistency Pass

The B-3 migration SHALL apply LIGHT terminology consistency (NOT full translator review) across the affected
keys, in parallel en+es values: package "collaborators"→"staff"; package "uds"→"unidades"; the literal
percent word → `%`; inter-token spacing normalized; ALL-CAPS preserved where stylistically intended. The
Widget catalog KEEPS the abbreviated "uds" form (space-constrained surface).

#### Scenario: collaborators normalized to staff in package catalog

- GIVEN `staff.assigned_count` (previously "colaboradores")
- WHEN migrated
- THEN the es value reads "staff"/"personal" consistent with the rest of the package, in both en+es

#### Scenario: widget keeps uds abbreviation

- GIVEN a space-constrained Widget count-bearing key
- WHEN migrated
- THEN the es `other` value keeps "uds" (not "unidades"), while package equivalents expand to "unidades"

#### Scenario: ALL-CAPS preserved

- GIVEN a value authored in ALL-CAPS for stylistic intent (e.g. KPI chip)
- WHEN the consistency pass runs
- THEN the casing is preserved in en+es

### Requirement: Catalog Coverage Test

A permanent XCTest (`ios/SolennixTests/L10nCatalogCoverageTests.swift`) SHALL assert that
every **symbolic** (dotted, regex `^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$`) catalog key
carries BOTH `en` and `es`. "Present" = a `stringUnit.value` OR a
`variations.plural.{one,other}` block (mirrors the B-3 plural mechanism). The test MUST
iterate the symbolic-key sets of the `SolennixFeatures`, Widget, and App-Intent catalogs
and FAIL the build on any gap. It MUST pass green today (zero gap) so it guards future
drift, not current debt. Orphan/stale prose keys (no dot) are out of scope (B-5). Today:
1674 symbolic keys, 0 gap, GREEN.

#### Scenario: green today

- GIVEN the merged B-1/B-2/B-3/B-4 catalog
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

A lint script at `scripts/l10n/lint_literals.py` SHALL scan `.swift` sources for raw Spanish
UI literals in `Text(...)`, `Button(...)`, `Label(...)`, and `.navigationTitle(...)`
positions. A literal MUST be flagged when it contains an accent char
(`áéíóúñü¿¡ÁÉÍÓÚÑÜ`) OR matches the unambiguous-Spanish-word denylist (`Buscar`,
`Actualizar`, `Cancelar`, `Guardar`, `Eliminar`, `Editar`, `Cerrar`, `Agregar`, `Aceptar`,
`Continuar`, `Configuración`, `Listo`, `Volver`, `Quitar`, `Añadir`, `Seleccionar`,
`Ajustes`, `Cuenta`, `Ayuda`, `Soporte`, `Información`). Cognates (`Error`, `Perfil`,
`Normal`, `Radio`, `Visa`) MUST be excluded to keep false positives ~0. The script MUST
skip `#Preview` macro bodies (brace-depth tracking from the `#Preview` line) and test
sources, MUST exit non-zero on the first violation, and SHALL be unit-tested with good/bad
fixtures (`scripts/l10n/test_lint_literals.py`, 28 fixtures) like the sibling
`prune_orphan_keys.py`.

#### Scenario: lint exits 0 after migration

- GIVEN the codebase after the flagged literals are migrated
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
(not build-only) on every PR. The lint step runs at repo root (`.`) before the build; the
build step is renamed "Build and test" and invokes `xcodebuild test`. The job timeout MUST
be 60 minutes.

#### Scenario: CI runs both lint and test

- GIVEN a PR opening against the default branch
- WHEN `ios-validation` executes
- THEN it runs the `l10n lint` step AND the `xcodebuild test` step, both gating merge

#### Scenario: lint failure blocks CI

- GIVEN a PR introducing a flagged raw Spanish literal
- WHEN the lint step runs
- THEN the job fails before the test step

### Requirement: Literal Migration

Flagged raw Spanish UI literals SHALL migrate to `LocalizedStringKey` resolved against the
app-target catalog (`ios/Solennix/Localizable.xcstrings`), each carrying `en`+`es` (Option
A from the B-4 design: `SolennixDesign` is a leaf package that `SolennixFeatures` depends
on, so it cannot import `FeatureL10n` without a cycle — therefore `LocalizedStringKey`
against the main bundle, not `FeatureL10n`). Delivered keys: `auth.unlock.prompt`,
`common.action.cancel`, `common.action.done`, `keyboard.menu.help`,
`keyboard.menu.refresh`, `keyboard.menu.search`, `keyboard.menu.settings`. Sites:
`KeyboardShortcuts.swift` (4), `ConfirmDialog.swift:17`, `ViewModifiers.swift:26`,
`ContentView:225`. The `Button("Error")` cognate at `ToastOverlay.swift:196` MUST stay
literal as the cognate proof point. `#Preview` macro bodies are skipped by the lint and NOT
migrated. No raw `Buscar`/`Actualizar`/`Cancelar`/`Listo` literal MAY remain in production
sources after migration.

#### Scenario: flagged literals routed through LocalizedStringKey

- GIVEN the flagged source sites
- WHEN migrated
- THEN each renders via a `LocalizedStringKey` with a symbolic key carrying en+es
- AND `Error` stays a literal
- AND `#Preview` bodies are untouched

## Non-Goals

- **defaultValue cleanup** (~1,865 cosmetic Spanish 2nd-args) — keys resolve via `Bundle.module`; defaults never fire. (B-3c, deferred.)
- **Android / Web** replication (deferred; the `.xcstrings` mechanism is not portable to Android `plurals.xml`/web i18next — concept tracked, impl deferred).

## Acceptance & Validation

| Check | Method | Status |
|-------|--------|--------|
| B-1 suite green | `xcodebuild test -scheme Solennix` → 373/373, 0 failures | ✅ PR #623 |
| B-1 override gone | grep: zero `preferredLocale` override reads in `FeatureL10n`; zero `.environment(\.locale)` write in `SolennixApp` | ✅ |
| B-1 picker gone | grep: zero picker symbols / label keys in production | ✅ |
| B-1 `en` region | `knownRegions` lists `Base`, `es`, `en` in `project.pbxproj` | ✅ |
| B-1 MXN pinned | currency CODE `MXN` + `es_MX` grouping regardless of device locale (manual-device check) | pending QA |
| B-1 throttle | `LanguageReporterTests` 5/5 GREEN; relaunch same-lang = no call | ✅ |
| B-2 source inversion | `sourceLanguage: en` (L2) + `developmentRegion: en` (~L676) + `CFBundleLocalizations=[en,es]` | ✅ PR #625 |
| B-2 orphan prune | ref-check gate enforced; dead orphans removed, live keys retained | ✅ PR #625 |
| B-2 hardcoded migration | zero `Text("Spanish")` non-brand; positional-arg tests green | ✅ PR #627 |
| B-2 extension catalogs | Widget `.xcstrings` (new `PBXResourcesBuildPhase`) + app-target intent catalog exist, `sourceLanguage: en` | ✅ PR #631 |
| B-2 InfoPlist + toggle | `InfoPlist.xcstrings` (3 permissions) + `EventosViewModeToggle` keys, all en+es | ✅ PR #631 |
| B-2 suite green | `xcodebuild test -scheme Solennix` → 378/378 (375 unit + 3 UI) | ✅ PR #631 |
| B-2 cross-locale manual device | `fr-FR`→en, `es-MX`→es, `en-US`→en | pending QA (task 4.3) |
| B-3 plural helper | `FeatureL10n.plural` routes via `String.localizedStringWithFormat`; count=1 RED→GREEN gate | ✅ PR #635 |
| B-3 catalog variations | 38 keys carry `variations.plural.one`+`other` en+es (31 pkg + 6 widget + 1 app) | ✅ PR #639 |
| B-3 call-site migration | ~40 sites on `FeatureL10n.plural`; widget/intent on native `localizedStringWithFormat`; zero varied keys on `format`/`trf` | ✅ PR #641 |
| B-3 double-plural siblings | `products.quantity_for_people` split into 4 siblings; flat key removed | ✅ PR #641 |
| B-3 consistency pass | collaborators→staff, package uds→unidades, widget keeps uds, percent→%, ALL-CAPS preserved | ✅ PR #639 |
| B-3 suite green | `xcodebuild test -scheme Solennix` → 387 executed, 1 skipped, 0 failures | ✅ PR #641 |
| B-4 coverage test | `L10nCatalogCoverageTests` symbolic-key en+es guard; 1674 keys, 0 gap, GREEN | ✅ PR #653 |
| B-4 anti-literal lint | `scripts/l10n/lint_literals.py` (accent ∪ denylist minus cognates, `#Preview`-skip); `test_lint_literals.py` 28/28 green; lint exit 0 | ✅ PR #653 |
| B-4 CI lint + test | `ios-ci.yml` `ios-validation` runs `l10n lint` + `xcodebuild test`; timeout 60 | ✅ PR #653 |
| B-4 literal migration | 7 user-facing literals → `LocalizedStringKey` (app catalog); `Error` stays literal; `#Preview` skipped | ✅ PR #653 |
| B-4 locale-fragile fix | 4 test files branched on `FeatureL10n.languageCode` (surfaced by the new CI `test` step) | ✅ PR #653 |
| B-4 suite green | `xcodebuild test -scheme Solennix` → 398 executed, 0 failures, 0 skipped (en-US) | ✅ PR #653 |
