# Design: iOS System-Language Localization (B-1 Architecture)

> **Lead with the answer:** B-1 makes the app follow the **system language** by gutting two
> override points — the `FeatureL10n` runtime override AND the SwiftUI
> `.environment(\.locale)` override in `SolennixApp` — pins MXN currency to a fixed
> `es_MX` business locale (reusing the convention `CommonFormatting` already
> established), removes the picker, and re-points language reporting to launch +
> locale-change events. Catalog coverage (B-2) and the test harness (B-4) are out of scope.

## Technical Approach

Option (a) from the proposal: gut the override, keep the accessors. Code reads confirm
the change is far smaller than the "audit 50+ sites" fear — **most `FeatureL10n.locale`
usages are DATE/format-string sites that are *correct* under system locale** and need no
edit. Only the dedicated **currency** formatters must pin to MXN, and one convention
(`CommonFormatting`) already does.

## Architecture Decisions

### Decision: FeatureL10n → system-locale accessor (Option a)

| Choice | Tradeoff | Decision |
|--------|----------|----------|
| `locale = Locale.autoupdatingCurrent` | Region-aware (es-AR, en-US) — **better for dates**, forces MXN decouple | ✅ Adopt |
| `locale = Locale(identifier: languageCode)` | Generic locale — would hide the currency bug | ❌ Reject |
| Keep lproj sub-bundle lookup in `text()` | Override mechanism — contradicts the change | ❌ Remove |

`locale` changes from a *generic* locale to a *region-aware* one — this is the intended
behavior change and the reason currency must be pinned (below).

```swift
public enum FeatureL10n {
    public static var languageCode: String {
        Locale.autoupdatingCurrent.language.languageCode?.identifier ?? "es"
    }
    public static var locale: Locale { Locale.autoupdatingCurrent }
    public static func text(_ key: String, _ defaultValue: String) -> String {
        Bundle.module.localizedString(forKey: key, value: defaultValue, table: "Localizable")
    }
    public static func format(_ key: String, _ defaultValue: String, _ arguments: CVarArg...) -> String {
        String(format: text(key, defaultValue), locale: locale, arguments: arguments)
    }
}
```
Edge case: `format(_:…)` keeps `locale:` bound to system locale → decimal separators/plural
rules for localized templates. Correct.

### Decision: MXN decouple — central formatter, fixed `es_MX`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| (a) Shared formatter pinning `es_MX` (match `CommonFormatting`) | DRY, one place to audit | ✅ Adopt |
| (b) Per-site `Locale(identifier:"es_MX")` injection | Duplicated literals | ❌ Reject |
| (c) New `BusinessLocale` constant | Adds indirection for no extra power | ❌ Defer |

**Currency sites to change (the whole set):**
- `DashboardFormatting.swift:19-31` — `currencyFormatter(locale:)` cache key + `:33,:38`
  defaults change from `FeatureL10n.locale` → fixed `es_MX`. Symbol/grouping now Mexican.
- `ProductListView.swift:496-503, 514-521` — **two duplicate** `formattedPrice` methods
  (DRY violation) → consolidate to one call routed through the shared currency formatter.
- `CommonFormatting.swift:6` — **already** `es_MX`; no change (the reference convention).

**Currency sites left on system locale (judgment calls, flagged):**
- `SubscriptionView.swift:140` (`"%.2f"` of a Stripe amount) — currency code is dynamic and
  prepended as text; locale only sets the decimal separator. Leave as-is.
- Format-string interpolations carrying amounts (`EventPaymentsDetailView:305`, etc.) —
  locale governs separators only, no symbol. Verify in B-4.

**Date sites — no change:** the 30+ `FeatureL10n.locale` date/formattedServerDay sites
(`DashboardFormatting` date methods, `*Grid/ListView` formatters, charts) auto-follow the
system locale. This is the desired behavior.

### Decision: Language report — thin reporter, not the picker's ViewModel

| Choice | Tradeoff | Decision |
|--------|----------|----------|
| `LanguageReporter` calling `authManager.updateProfile` directly | No UI side-effects | ✅ Adopt |
| Reuse `SettingsViewModel.updatePreferredLanguage` | Flashes settings spinner on launch | ❌ Reject |

- Move `PreferredLanguagePayload` (currently private to `SettingsViewModel`) to a shared spot.
- `LanguageReporter.reportIfNeeded(authManager:)`: read `lastReportedLanguage` from
  `UserDefaults`; compare to `Locale.current.language.languageCode?.identifier`
  (`es`/`en` — the language code, NOT the full locale); call `updateProfile` **only when
  changed**; on success persist the new value.
- Reuses the existing `authManager.updateProfile(PreferredLanguagePayload)` backend path
  (locked decision 4). Value shape STAYS language code (`es`/`en`) — IDENTICAL to the old
  picker contract; contract-compatible, zero backend/email-template risk. The fine locale
  (`es-MX`/`en-US`) is used ONLY internally for MXN currency formatting, never sent to the
  backend.

### Decision: Test rewrite — prove the mechanism, defer coverage to B-4

In-process system-locale can't be flipped reliably. Honest B-1 scope:
- **Delete** `_English` and `DynamicSwitching` assertions that depend on the `en` catalog
  (B-2) or override flipping — these become B-4's catalog-coverage harness.
- **Rewrite** `_Spanish` assertions as **resolution-smoke** tests: assert
  `FeatureL10n.text(k, def)` returns a **non-empty, non-default** value for keys present in
  the `es` catalog — proves `Bundle.module` resolution + no-override invariant.
- B-1 proves *resolution mechanism works*; it does **not** prove *en coverage* (B-2/B-4).

## Data Flow

```
iOS Settings language ─▶ Locale.autoupdatingCurrent ─▶ FeatureL10n.locale (system)
       │                          │                          │
       │                          │                   ┌──────┴──────┐
       │                          │              dates/format      currency
       │                          │           (follow system)   (pinned es_MX)
       └── currentLocaleDidChange ─▶ LanguageReporter ─▶ updateProfile (throttled)
launch/auth ─────────────────────────▶ LanguageReporter ─▶ updateProfile (throttled)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `FeatureL10n.swift` | Rewrite | 44→~20 lines; system locale; `text` via `Bundle.module` |
| `SolennixApp.swift` | Modify | Remove `:30` `@AppStorage`, **`:146` `.environment(\.locale)` override**, `:159/:184` `preferredLocale=` writes; add launch + `currentLocaleDidChange` report |
| `DashboardFormatting.swift` | Modify | Pin `currencyFormatter`/`currencyMXN`/`compactCurrencyMXN` to `es_MX` (`:19-47`) |
| `ProductListView.swift` | Modify | Replace 2 duplicate `formattedPrice` with shared formatter (`:496-521`) |
| `SettingsView.swift` | Modify | Remove picker + plumbing (`:31,:34,:63,:67,:69-75,:206-215,:389-392,:540-565`) |
| `SettingsStrings.swift` | Modify | Remove 4 picker keys (`:12-15`) |
| `SettingsViewModel.swift` | Modify | Extract shared `PreferredLanguagePayload`; keep `updatePreferredLanguage` for any non-launch path |
| `project.pbxproj` | Modify | Add `en` to `knownRegions` (`:670-673`) |
| `13 *LocalizationTests.swift` | Rewrite | Resolution-smoke; delete en/dynamic assertions |

## Interfaces / Contracts

- `LanguageReporter.reportIfNeeded(authManager:)` — new; idempotent, throttled.
- `PreferredLanguagePayload` — moved to shared (was private in `SettingsViewModel`).
- Backend `preferredLanguage` field — unchanged; value shape stays `es`/`en` (language code, NOT full locale; identical to the old picker contract).

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `FeatureL10n.text` resolves via `Bundle.module`, no override | Resolution-smoke (13 files) |
| Unit | `LanguageReporter` throttles (only-on-change) | Mock `authManager`; seed `lastReportedLanguage` |
| Unit | `DashboardFormatting.currencyMXN` renders MXN symbol regardless of device locale | Set process locale es-AR/en-US, assert `$`/MXN grouping |
| Integration | Launch + `currentLocaleDidChange` → one report each | App-level test harness |
| E2E (manual) | es-AR/en-US/fr render prices as MXN; es-* shows Spanish | Device/simulator sweeps |

## Migration / Rollout

No data migration. Rollback = revert `FeatureL10n` rewrite + restore `SolennixApp:146`
override + picker. The `preferredLocale` UserDefaults key is left in place (harmless;
FeatureL10n stops reading it) so rollback is clean and user-state-preserving.

## Open Questions

- [x] Does backend treat `preferredLanguage` values as best-effort display language?
  **RESOLVED:** Yes — and the value shape STAYS language code (`es`/`en`), identical to the
  old picker contract. No language-code → locale shift occurs; the question was moot. The
  fine locale (`es-MX`/`en-US`) is used only internally for MXN currency formatting, never
  sent to the backend.
