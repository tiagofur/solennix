# Tasks: ios-catalog-english (B-2)

> iOS catalog inversion to English source. 1,437/1,905 keys already semantic;
> inversion = 2 lines + ~448-orphan prune + ~159 hardcoded-Spanish migrations + catalog completion.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~4,000–5,000 (T1 prune ~2,200 deletions dominates) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 (T1) → PR2 (T2) → PR3 (T3), one per track |
| Delivery strategy | force-chained (chain pre-decided) |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

> Working review budget = 800. T1 prune (~2,200 deletions) and T2 (~1,500+) each
> exceed it alone → one PR per track (not 1 PR). Prune diff is grep-verifiable
> (low cognitive risk); T2 format-string migration is the focused-review slice.

### Suggested Work Units

| Unit | Goal | PR (base) | Verify | Rollback | Commit |
|------|------|-----------|--------|----------|--------|
| T1 | Invert source en + prune ~448 orphans | PR1 (main) | grep `sourceLanguage: en`, `developmentRegion = en`; zero orphans w/ empty locs + live refs; build | `git revert` (restores es + orphans) | `feat(ios/l10n): invert catalog source to English and prune orphan keys` |
| T2 | Migrate ~108 pkg + ~51 ext hardcoded Spanish | PR2 (after PR1→main) | zero `Text("Spanish")` non-brand; positional-arg tests green; build | revert (added keys + call sites independent) | `feat(ios/l10n): migrate hardcoded Spanish to localized keys` |
| T3 | Complete catalogs (toggle, InfoPlist, extensions) | PR3 (after PR2→main) | all new keys en+es; es-AR permission prompt Spanish; build+test 373/373 | revert | `feat(ios/l10n): complete catalogs (toggle, InfoPlist, extensions)` |

## Phase 1: Catalog Inversion + Orphan Prune (T1 → PR1)

- [x] 1.1 **RED**: test asserting prune refuses to remove a key with ≥1 codebase ref (ref-check gate).
- [x] 1.2 **GREEN**: prune transform removes keys whose localizations are all empty AND zero grep hits; retains any with ≥1 ref.
- [x] 1.3 Flip `sourceLanguage` es→en in `Localizable.xcstrings` (L2); `developmentRegion` es→en in `project.pbxproj` (~L676). **+ discovered necessity**: declare `CFBundleLocalizations=[en,es]` in `ios/Solennix/Info.plist` (app ships no catalog → supported langs defaulted to {developmentRegion} only; the flip alone forced English for everyone incl. es-preferring users, breaking spec es→Spanish resolution).
- [x] 1.4 `xcodebuild build -scheme Solennix -destination 'platform=iOS Simulator,name=iPhone 17'`.
- [x] 1.5 Grep gate: `sourceLanguage: en`, `developmentRegion = en`, zero orphan keys remain.

## Phase 2: Hardcoded Spanish Migration (T2 → PR2)

- [x] 2.1 **RED**: test asserting en+es format-string values match positional-arg count/order (`%lld`, `%1$@`).
- [x] 2.2 **GREEN**: migrate ~108 package `Text("es")` → `FeatureL10n.text("semantic.key")` + add keys en+es. Files: `EventShoppingListView`, `EventPhotosDetailView`, `EventPurchaseChecklistView`, `EventChecklistView`, `QuickClientSheet`, `EventEquipmentDetailView` (+ Events/Views: `EventContractPreviewView`, `EventDetailHubComponents`, `Staff/TeamMemberPortalView`, settings discard/keep dialog).
- [x] 2.3 Create `SolennixWidgetExtension` `.xcstrings` (`sourceLanguage: en`); migrate ~31 widget sites via `Text(LocalizedStringKey)` auto-extraction. (Done in T3: created `SolennixWidgetExtension/Localizable.xcstrings` + new `PBXResourcesBuildPhase` in widget target; migrated 4 widget files + 2 widget AppIntents.)
- [x] 2.4 Create `SolennixIntents` `.xcstrings` (`sourceLanguage: en`); migrate ~20 intent sites. **DEVIATION**: there is NO `SolennixIntents` extension target — the intent `.swift` files compile into the **Solennix app target**, and `LocalizedStringResource`/`Text` resolve against `Bundle.main`. So intent strings were placed in a NEW app-target catalog `ios/Solennix/Localizable.xcstrings` (~55 `intent.*` keys, en+es), wired into the app Resources phase. Migrated 6 intent files (title/description/parameter/dialog/snippet Text, pluralization, format strings).
- [x] 2.5 Keep brand literals ("Solennix", "G", Premium/Pro) untranslated — MUST NOT enter catalogs.
- [x] 2.6 Build + run positional-arg tests green.

## Phase 3: Catalog Completion (T3 → PR3)

- [x] 3.1 Add 4 missing `EventosViewModeToggle` keys (en+es) to `Localizable.xcstrings`; wire source. (Added `events.list.view_mode.{lista,calendario,accessibility,accessibility_hint}` to the package catalog; call sites in `EventosViewModeToggle.swift` already reference them.)
- [x] 3.2 Create `ios/Solennix/InfoPlist.xcstrings` (3 permission strings, en+es); wire into Solennix target build resources. (Also flipped the 3 permission values in `Info.plist` to English base.)
- [x] 3.3 Finalize Widget + Intents `.xcstrings`; verify build-phase resource references per target. (Widget: new `PBXResourcesBuildPhase` + catalog; App: InfoPlist + intent catalog in Resources. All file refs placed in their PBXGroup; compiled en/es `.strings` verified in built appex + app.)
- [x] 3.4 Grep gate: every new key carries en+es; brand allow-list respected. ("Solennix"/"G"/tier names untranslated; no raw Spanish `Text()` remains in widget/intent code; no empty `""` key; no xcscheme churn.)

## Phase 4: Verification

- [x] 4.1 `xcodebuild test -scheme Solennix -destination 'platform=iOS Simulator,name=iPhone 17'` green (378/378 = 375 unit + 3 UI; build succeeds incl. widget/intent targets).
- [x] 4.2 Grep gates: `sourceLanguage: en`; zero orphans (empty locs + live refs); Widget + Intents `.xcstrings` exist.
- [ ] 4.3 Manual device: `fr-FR`→en, `es-MX`→es, `en-US`→en.
- [x] 4.4 Discard any `xcscheme` downgrade churn — never commit. (None observed.)

## Phase 5: Docs

- [ ] 5.1 Update `docs/PRD/11_CURRENT_STATUS.md` (B-2 done) — LAST task per `rules.tasks`.
