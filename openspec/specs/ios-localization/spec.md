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
> Decisions locked in Engram #2909 / #2910 (B-1), #2920–#2924 (B-2).

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

## Non-Goals

- **True pluralization** (`.xcstrings` variations) — format-string approach retained; deferred to B-3.
- **defaultValue cleanup** (~1,865 cosmetic Spanish 2nd-args) — keys resolve via `Bundle.module`; defaults never fire.
- **B-3/B-4 harness:** catalog-coverage-at-scale test, CI anti-literal lint, `test` step in `ios-ci.yml`.
- **Android / Web** replication (deferred; same backend contract).

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
