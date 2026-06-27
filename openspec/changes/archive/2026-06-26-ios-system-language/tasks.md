# Tasks: iOS System-Language Localization (B-1)

> **Delivery recommendation: 1 PR with work-unit commits** (stacked-to-main ordering). Total ~420–470 changed lines — well under the 800 budget, and slices share files (`SolennixApp` touched by WU3+WU4; `FeatureL10n` is prereq for all) → separate PRs would rebasing-churn. Precedent: ios-mechanical-polish #621 (same shape, worked well). If a slice balloons, promote WUs to separate stacked PRs (each <200 lines).

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~420–470 |
| 800-line budget risk | Low |
| 400-line (std) budget risk | Medium |
| Chained PRs recommended | No (single PR; work-unit commits as stacked units) |
| Suggested split | WU1→WU2→WU3→WU4→WU5 (commits, not separate PRs) |
| Delivery strategy | force-chained (honored at commit level) |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Conventional commit | Start→Finish | Verify | Rollback |
|------|------|---------------------|--------------|--------|----------|
| 1 | `FeatureL10n`→system locale + `en` region | `feat(ios): resolve l10n via system locale` | override present → gone, system locale | build app+pkg; grep no `preferredLocale` read | revert commit |
| 2 | MXN pinned `es_MX` | `fix(ios): pin MXN currency to business locale` | locale-bound → fixed | es-AR/en-US → CODE `MXN`, es_MX grouping | revert commit |
| 3 | Remove picker + `.environment(\.locale)` | `refactor(ios): remove in-app language picker` | picker+`:146` override → gone | grep no picker/prod `preferredLocale` write; launch=device lang | revert commit |
| 4 | LanguageReporter (throttled) | `feat(ios): report system language to backend` | no report → throttled launch+change | throttle unit test GREEN; relaunch no-op | revert commit |
| 5 | Rewrite 13 localization tests | `test(ios): rewrite localization tests to system-locale` | override-based → resolution-smoke | full suite GREEN | revert commit |

**Full rollback:** restore `FeatureL10n` override + `SolennixApp:146` + picker. `preferredLocale` UserDefaults key left in place (FeatureL10n stops reading it) → user-state-preserving.

## Phase 1 — Foundation: System-Locale Resolution (WU1, prereq for all)

- [x] 1.1 Add `en` to `knownRegions` in `project.pbxproj:670-673` (Base, es, **en**); confirm `en.lproj` builds.
- [x] 1.2 Rewrite `FeatureL10n.swift` (44→~20): `locale`=`Locale.autoupdatingCurrent`, `languageCode`=…`.identifier ?? "es"`, `text()` via `Bundle.module.localizedString`, keep `format()` bound to `locale`.
- [x] Verify: build app + `-scheme SolennixFeatures`; grep zero `preferredLocale` read inside `FeatureL10n`.

## Phase 2 — Core: MXN Currency Decouple (WU2, ~3-line fixes)

- [x] 2.1 `DashboardFormatting.swift:19-47`: pin `currencyFormatter` cache key + `currencyMXN`/`compactCurrencyMXN` defaults → `Locale(identifier:"es_MX")` (match `CommonFormatting.swift:6`).
- [x] 2.2 `ProductListView.swift:496-521`: merge the **two duplicate** `formattedPrice` → one call routed through the shared MXN formatter.
- [x] Verify: es-AR + en-US render currency CODE `MXN` + es_MX symbol/grouping, never ARS/USD; dates still follow system locale (untouched). *(in-process: build green, 37 non-loc suites GREEN incl. CoreFormatting/DashboardFormatting/DashboardMetricsModels/ProductListViewModel, only 13 loc suites RED; CODE=MXN via explicit currencyCode; cross-locale es-AR/en-US device check = manual-device per WU1 wall; grep gate met — no currency formatter derives from FeatureL10n.locale)*

## Phase 3 — Core: Picker Removal (WU3 — `:146` is THE critical edit)

- [x] 3.1 `SettingsView.swift`: delete compact picker `:206-215`, regular picker `:389-392`, `@State selectedLanguage :31`, `@AppStorage("preferredLocale") :34`, `onChange :69-75`, `sync/persist/normalized :540-565`.
- [x] 3.2 `SettingsStrings.swift:12-15`: delete the 4 picker label keys.
- [x] 3.3 `SolennixApp.swift`: remove `@AppStorage :30`, **`.environment(\.locale) :146` (removing this is what makes UI follow system — mis-handle = silently stuck on one lang)**, `preferredLocale=` writes `:159,:184`.
- [x] Verify: build; grep zero `preferredLocale` write + zero picker symbol in prod; cold launch → UI = device language. *(BUILD SUCCEEDED; grep gates all 0 — preferredLocale 0 in prod, `.environment(\.locale)` 0, picker symbols 0, label keys 0; 53 suites → 40 GREEN incl. FeatureL10n/DashboardFormatting/CoreFormatting, 13 RED = exactly `*LocalizationTests` = WU5 baseline unchanged; cold-launch=device lang = manual-device check per WU1 wall, code no longer pins it)*

## Phase 4 — Integration: Language Reporting (WU4, TDD on throttle)

- [x] 4.1 **RED:** `LanguageReporterTests` — seed `lastReportedLanguage`; assert `reportIfNeeded` calls `authManager.updateProfile` only when code changes (es→en), zero call when equal.
- [x] 4.2 **GREEN:** new `LanguageReporter.swift` — compare `Locale.current.language.languageCode?.identifier` (`es`/`en`) vs `UserDefaults.lastReportedLanguage`; call `updateProfile` only on change; persist on success. *(4.3 revised: `PreferredLanguagePayload` was replicated into LanguageReporter and the now-DEAD `updatePreferredLanguage` deleted from `SettingsViewModel` — its only caller was the removed picker.)*
- [x] 4.3 *(folded into 4.2)* `PreferredLanguagePayload` extracted to LanguageReporter; dead `updatePreferredLanguage` removed from `SettingsViewModel`.
- [x] 4.4 `SolennixApp.swift`: fire `LanguageReporter.reportIfNeeded` on launch `.task` + `authState` change + `NSLocale.currentLocaleDidChangeNotification`.
- [x] Verify: throttle test GREEN; relaunch same-lang = NO call (no spam); switch = exactly one call. *(Reconciled at archive: apply-progress #2914 marks WU4 LanguageReporter DONE with LanguageReporterTests 5/5 throttle GREEN; full suite 373/373 green; PR #623 merged (squash 407a47b4), CI green. Stale checkbox — mechanical tick per orchestrator-authorized archive-time reconciliation.)*

## Phase 5 — Testing: Rewrite Localization Suite (WU5 — suite stays GREEN)

- [x] 5.1 Rewrite 13 `*LocalizationTests.swift` → resolution-smoke: assert `FeatureL10n.text(k,def)` resolves to the EXPECTED value for the simulator's current system locale (via `FeatureL10n.languageCode`); **delete** `_English` + `DynamicSwitching` + `setLocale`/`preferredLocale` override assertions (B-2/B-4 territory). *(Merged each `_Spanish`/`_English` pair into one `_Resolves` method using `expected(spanish:english:)` helper — same signal the app uses, GREEN on both es/en sims.)*
- [x] 5.2 `xcodebuild test -scheme Solennix -destination 'platform=iOS Simulator,name=iPhone 17'` GREEN — **373/373 passed, 0 failures**. *(NOTE: `-scheme SolennixFeatures` does NOT exist in this project — only `Solennix` + `SolennixWidgetExtension`. Verify via `-scheme Solennix` only.)*
- [x] 5.3 Manual: es-AR/en-US/fr prices = MXN; es-* = Spanish. **Discard any xcscheme downgrade churn → `git checkout`, NEVER commit (recurring #619/#621).** *(No xcscheme churn this run.)*

## TDD honesty note
- **Testable RED→GREEN:** FeatureL10n no-override invariant + `LanguageReporter` throttle (WU4).
- **Mechanical (build+grep+existing tests):** `en` region, MXN pin, picker removal — no new behavior to TDD; verified by build + grep + manual.

## Guardrails (carry every session)
- `SolennixApp:146` override removal is the lynchpin — re-verify in WU3.
- 13 rewrites MUST leave the suite GREEN (replace, don't bare-delete).
- Report MUST NOT spam every launch (throttle is the acceptance gate).
- MXN CODE+grouping = `es_MX`, never user-locale-derived.
- `xcodebuild test` xcscheme downgrade → discard, never commit.
