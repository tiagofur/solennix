# Proposal: iOS System-Language Localization (B-1 Architecture)

## Intent

Switch the iOS app to follow the **system language** (auto), retiring the
`FeatureL10n` runtime `preferredLocale` override that caused all localization
leaks — system-integration targets (Widgets / AppIntents / LiveActivity)
physically cannot honor a runtime override. The app still **reports** its device
language to the backend so emails/notifications stay correct. This is the
architecture unlock that makes B-2 (catalog) and B-3 (test harness) possible.
All decisions locked in `ios-localization/architecture-decision` (Engram #2909);
no outstanding product questions.

## Scope

### In Scope
- Rewrite `FeatureL10n.swift` (44 lines): `languageCode`/`locale` →
  `Locale.autoupdatingCurrent`; `text()` → `Bundle.module.localizedString(...)`.
  ~1,900 call sites UNTOUCHED and behavior-correct.
- Add `en` to `knownRegions` (`project.pbxproj:670-673`) — hard prereq (Xcode
  will not ship `en.lproj` without it).
- Remove in-app language picker: `SettingsView.swift` (`@State selectedLanguage`,
  `@AppStorage("preferredLocale")`, `onChange(of: selectedLanguage)`,
  `persistLanguageChange`, `syncSelectedLanguage`, `normalizedLanguage`) + picker
  labels in `SettingsStrings`.
- Rewire `updatePreferredLanguage` (`SettingsViewModel.swift:211`): call on launch
  + `NSLocale.currentLocaleDidChangeNotification` with `Locale.current` — NOT on
  picker change.
- Rewrite the **13** override-based `*LocalizationTests.swift` → assert
  system-locale resolution (not override). Suite MUST stay green.

### Out of Scope (deferred)
- **B-2 (catalog):** ~445 missing `en` translations, EventosViewModeToggle 4 keys,
  `InfoPlist.xcstrings`, extension catalogs. Until B-2 ships, English users see
  Spanish fallbacks — expected and acceptable for B-1.
- **B-3 (harness):** catalog-coverage test, CI anti-literal lint, `test` step in
  `ios-ci.yml`.

## Capabilities

### New Capabilities
- `ios-localization`: system-language resolution + picker removal + backend
  device-language reporting.

### Modified Capabilities
- None (no existing localization/settings spec in `openspec/specs/`).

## Approach

**Option (a)** — gut override, keep accessors. One file, behavior-correct at all
~1,900 call sites; ~50 `FeatureL10n.locale` formatter sites auto-follow system
locale. Picker removal is a direct consequence (no manual choice exists). Backend
report reuses the existing `updatePreferredLanguage` → `updateProfile(PreferredLanguagePayload)`
path; throttle to report **only when changed vs last-reported** to avoid launch
spam. iOS-first; backend `preferredLanguage` contract unchanged (meaning shifts:
manual choice → device-reported system language). Android/web replicate later
(parity-safe — same backend field).

## Affected Areas

| Area | Impact |
|------|--------|
| `FeatureL10n.swift` | Modified (rewrite) |
| `SettingsView.swift`, `SettingsStrings.swift`, `SettingsViewModel.swift` | Modified (picker removed, report rewired) |
| `SolennixApp.swift` | Modified (launch + locale-change report wiring) |
| `project.pbxproj` | Modified (`en` region) |
| 13 `*LocalizationTests.swift` | Modified (override → system-locale) |
| Backend `preferredLanguage` | Unchanged (contract-compatible) |
| Android / Web | Deferred (same strategy, later execution) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| 13 tests break on override removal | High | Rewrite in this change; suite stays green |
| `en` missing from knownRegions | Certain (confirmed) | Fixed in this change — hard prereq |
| Backend report spam on launch | Medium | Throttle: report only when ≠ last-reported |
| Formatter regression (50+ `FeatureL10n.locale` sites: MXN/dates) | Medium | Verify es-MX formatting preserved in B-1 verify |
| English partial-Spanish pre-B-2 | Certain | Documented, expected |

## Rollback Plan

Revert the `FeatureL10n` rewrite + restore picker. The override key
(`preferredLocale` UserDefaults) and `updatePreferredLanguage` path are unchanged,
so restore is clean and user-state-preserving.

## Dependencies

- Locked decision Engram #2909; leak enumeration Engram #2901.
- Predecessor: `ios-mechanical-polish` (Change A) shipped.

## Success Criteria

- [ ] App UI follows system language; no runtime override.
- [ ] `en` present in `knownRegions`; `en.lproj` ships.
- [ ] No in-app language picker; language changes via iOS Settings.
- [ ] Backend receives device language on launch + on locale change.
- [ ] All 13 localization test files rewritten green; full suite green.
