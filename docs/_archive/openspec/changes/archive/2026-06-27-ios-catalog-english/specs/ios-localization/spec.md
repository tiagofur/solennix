# Delta for ios-localization

> B-2 MODIFIES ios-localization (B-1): English catalog source, orphan prune,
> hardcoded-Spanish migration, catalog completion. Inversion = 2 lines (1,437 keys
> already semantic + en/es).

## MODIFIED Requirements

### Requirement: System-Locale Resolution

`FeatureL10n` SHALL resolve via `Bundle.module` for the **system** locale. No runtime `preferredLocale` override; accessors MUST reflect `Locale.autoupdatingCurrent`. Source is now **English**; unmatched locales resolve to English.

(Previously: B-1's `es` source fallback for keys lacking `en`, flagged "until B-2".)

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

## ADDED Requirements

### Requirement: English Catalog Source Language

`Localizable.xcstrings` MUST declare `"sourceLanguage": "en"` (L2); `project.pbxproj` MUST set `developmentRegion = en` (~L676). Semantic keys carry English forward unchanged — zero call-site changes (Option S).

#### Scenario: inversion applied

- GIVEN the merged B-2 commit
- WHEN the catalog + project are inspected
- THEN `sourceLanguage` and `developmentRegion` are both `en`, no key renamed

### Requirement: Orphan Key Pruning

A key whose localizations are all empty AND has zero codebase refs SHALL be removed. No live key MAY be pruned — a pre-deletion ref check is MANDATORY; zero grep hits suffice.

#### Scenario: dead orphans removed

- GIVEN a key with empty `en`+`es` and zero grep hits
- WHEN the prune transform runs
- THEN the key is removed

#### Scenario: live key protected (ref-check gate)

- GIVEN a key with ≥1 codebase reference
- WHEN the prune transform runs
- THEN the key is retained

### Requirement: Hardcoded Spanish Migration

Spanish literals SHALL move to keys: package sites (~108) via `FeatureL10n.text("semantic.key")`; extension sites (Widget ~31, Intents ~20) via per-target `.xcstrings` (`sourceLanguage: en`) with `Text(LocalizedStringKey)` auto-extraction (separate bundles can't use `FeatureL10n`). Format strings MUST preserve positional arg indices identically across `en`+`es`.

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

Catalog SHALL be complete: 4 `EventosViewModeToggle` keys; `InfoPlist.xcstrings` (3 permission strings wired to `Solennix`); Widget + Intents `.xcstrings`. Each added key MUST carry `en`+`es`.

#### Scenario: toggle + InfoPlist keys present

- GIVEN the merged catalog
- WHEN the 4 toggle + 3 InfoPlist keys are queried
- THEN all exist with `en`+`es`

#### Scenario: permission prompt localized

- GIVEN a system permission prompt for `Solennix`
- WHEN the device locale is `es-AR`
- THEN it renders Spanish from `InfoPlist.xcstrings`

### Requirement: Brand String Allow-List

Brand strings — "Solennix", "G", plan/tier names (Premium, Pro) — SHALL stay untranslated literals and MUST NOT enter any catalog.

#### Scenario: brand stays literal

- GIVEN `Text("Solennix")` or `Text("Premium")`
- WHEN migration runs
- THEN the site stays a literal

## Non-Goals

- **True pluralization** (`.xcstrings` variations) — format-string retained; deferred to B-3.
- **defaultValue cleanup** (~1,865 Spanish 2nd-args) — keys resolve; defaults never fire.
- **Catalog-at-scale** + CI harness — B-3/B-4.
- **Android / Web** replication — deferred.

## Validation

- `xcodebuild test -scheme Solennix` green (373/373).
- Grep gates: zero orphan keys; `sourceLanguage: en`; `developmentRegion: en`; Widget + Intents `.xcstrings` exist.
- Manual device: `fr-FR`→en, `es-MX`→es, `en-US`→en.
