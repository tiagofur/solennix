# ios-localization Specification

> iOS localization architecture (Sprint 1, Change B, Phase 1 / `ios-system-language` B-1).
> The app follows the **system language** (auto), retiring the `FeatureL10n` runtime
> `preferredLocale` override AND the `SolennixApp` `.environment(\.locale)` override.
> MXN currency is pinned to a fixed `es_MX` business locale; dates follow the system
> locale. The app reports the device **language code** (`es`/`en`) to the backend
> (throttled). **B-1 = ARCHITECTURE migration only** — catalog completion (B-2) and the
> test harness (B-3/B-4) are separate phases. Decisions locked in Engram #2909 / #2910.
> Implemented + merged: PR #623 (squash `407a47b4`), CI green.

## Requirements

### Requirement: System-Locale Resolution

`FeatureL10n` SHALL resolve strings via `Bundle.module` for the **system** locale. A runtime `preferredLocale` override MUST NOT exist in production code; accessors (`languageCode`/`locale`) MUST reflect `Locale.autoupdatingCurrent`.

#### Scenario: es-AR device sees Spanish

- GIVEN device locale `es-AR`
- WHEN `FeatureL10n.text(k)` is called
- THEN it returns the `es` catalog value (never English, never an override)

#### Scenario: general es resolution

- GIVEN any `es-*` variant device locale (`es-MX`, `es-AR`, `es-419`)
- WHEN `FeatureL10n.text(k)` is called
- THEN all resolve to the same `es` catalog value

#### Scenario: pre-B-2 source fallback

- GIVEN device locale `en-US` and a key with no `en` translation
- WHEN `FeatureL10n.text(k)` is called
- THEN it returns the `es` source fallback (expected until B-2)

### Requirement: English Region Ships

The Xcode project MUST list `en` in `knownRegions` and bundle `en.lproj`. Hard prereq — Xcode will not ship `en.lproj` without it.

#### Scenario: en region registered

- GIVEN the built app bundle
- WHEN `knownRegions` is inspected in `project.pbxproj`
- THEN `en` is present alongside `Base` and `es`

### Requirement: In-App Language Picker Removed

The app MUST NOT expose a language selector. Changing the app language SHALL require the iOS Settings app.

#### Scenario: Settings has no picker

- GIVEN `SettingsView` rendered (compact and regular layouts)
- WHEN the user scans all sections
- THEN no language picker, no `@AppStorage("preferredLocale")`, and no picker label is present
- AND `SettingsStrings` contains no picker label keys

### Requirement: Backend Language Reporting

The app SHALL report the system **language code** (derived from `Locale.current.language.languageCode?.identifier`, e.g. `es`/`en`) — NOT the full locale — to the backend on launch and on `NSLocale.currentLocaleDidChangeNotification`. Reports MUST be throttled: emitted only when ≠ last-reported. The backend `preferredLanguage` field MUST remain (meaning shifts: manual choice → device-reported system language); the value shape is IDENTICAL to today (the retired picker sent `es`/`en`), so no backend/email-template change is required.

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

Prices SHALL format as MXN regardless of device locale. MXN is a business currency constant, not a user-locale preference. Date/number formatters MAY follow the system locale.

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

The localization test suite SHALL assert system-locale resolution. No test MAY depend on a `preferredLocale` override.

#### Scenario: 13 files rewritten green

- GIVEN the 13 `*LocalizationTests.swift` files
- WHEN `xcodebuild test` runs
- THEN every test asserts resolution from the system locale and the full suite is green

## Non-Goals

- **B-2 catalog inversion:** Spanish keys → English source; ~445 missing `en` translations; `EventosViewModeToggle` 4 keys; `InfoPlist.xcstrings`; extension (widget/intents/LiveActivity) catalogs.
- **B-3/B-4 harness:** catalog-coverage test, CI anti-literal lint, `test` step in `ios-ci.yml`.
- **Android / Web** replication (deferred; same backend contract).

## Acceptance & Validation

| Check | Method | Status |
|-------|--------|--------|
| Suite green | `xcodebuild test -scheme Solennix` → 373/373 passed, 0 failures | ✅ PR #623 |
| Override gone | grep: zero `preferredLocale` override reads in `FeatureL10n`; zero `.environment(\.locale)` write in `SolennixApp` | ✅ |
| Picker gone | grep: zero picker symbols / label keys in production | ✅ |
| `en` region | `knownRegions` lists `Base`, `es`, `en` in `project.pbxproj` | ✅ |
| MXN pinned | currency CODE `MXN` + `es_MX` grouping regardless of device locale (manual-device check) | pending QA |
| Throttle | `LanguageReporterTests` 5/5 GREEN; relaunch same-lang = no call | ✅ |
| Cross-locale UI | es-AR/en-US/fr prices = MXN; es-* shows Spanish (manual device check) | pending QA |
