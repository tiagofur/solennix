# Proposal: ios-catalog-english (B-2)

## Intent

Make **English the catalog source language** — universal fallback + scalability to
future languages with zero architecture change. This is the **architecture unlock**
for B-3/B-4.

> Premise CORRECTED (Engram `sdd/ios-catalog-english/explore`): not 1,905 Spanish
> literals — 1,437/1,905 keys are already semantic, fully translated en+es. Inversion
> is 2 lines; real work = prune + migration + missing catalogs.

## Scope

### In Scope
- **T1 — Inversion + prune.** `sourceLanguage` es→en (`Localizable.xcstrings` L2);
  `developmentRegion` es→en (`project.pbxproj` ~L676); prune ~448 orphan keys via
  scriptable JSON transform. Zero call-site changes.
- **T2 — Hardcoded Spanish migration.** ~108 `Text("Spanish")` in `SolennixFeatures`
  (Events/Views) → `FeatureL10n.text("new.semantic.key", …)` + add keys en+es; ~31
  widget + ~20 intents sites → new per-target `.xcstrings` (separate bundles, can't
  share `FeatureL10n`). Brand literals stay literal.
- **T3 — Catalog completion.** 4 `EventosViewModeToggle` keys; `InfoPlist.xcstrings`
  (3 permission strings, wired into Solennix target); Widget + Intents catalogs.

### Out of Scope
- **defaultValue flip** (~1,865 cosmetic Spanish 2nd-args) — keys resolve via
  `Bundle.module` after prune, defaults never fire → deferred follow-up.
- **B-3** catalog-coverage-at-scale; **B-4** CI test/lint step in `ios-ci.yml`.
- **Android/Web** replication (deferred; same backend contract).

## Capabilities

> Contract for sdd-spec. Research `openspec/specs/` done.

### New Capabilities
None.

### Modified Capabilities
- `ios-localization`: B-1's `"pre-B-2 source fallback"` scenario is **superseded** —
  source becomes `en` (universal fallback). Adds requirements for inversion, orphan
  prune, hardcoded-string migration, per-target extension catalogs, and
  InfoPlist + EventosViewModeToggle completion.

## Approach

| Decision | Choice | Rationale |
|---|---|---|
| Key strategy | **Option S (semantic keys)** | Codebase already uses it. Option L = rename 1,437 keys + rewrite ~1,865 call sites = destructive negative-value churn |
| Inversion | 2-line flip (`sourceLanguage` + `developmentRegion`) | 1,437 semantic keys resolve `en` unchanged |
| Orphans | Scriptable JSON prune | Safe — `FeatureL10n` isn't auto-extracted, won't regenerate |
| Extensions | Per-target `.xcstrings` per bundle | Separate bundles can't share `FeatureL10n`; use `Text(LocalizedStringKey)` auto-extraction |
| Brand literals | Non-translatable | "Solennix", "G" stay literal |
| defaultValue flip | Deferred | Keys resolve via `Bundle.module` → defaults never fire → cosmetic only |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `Localizable.xcstrings` | Modified | `sourceLanguage` es→en; ~448 orphan keys removed |
| `project.pbxproj` | Modified | `developmentRegion` es→en (~L676) |
| `SolennixFeatures/.../Events/Views` (~14 files) | Modified | ~108 hardcoded Spanish → semantic keys |
| `SolennixWidgetExtension/` | New+Modified | New Widget `.xcstrings`; ~31 sites migrated |
| `SolennixIntents/` | New+Modified | New Intents `.xcstrings`; ~20 sites migrated |
| `ios/Solennix/InfoPlist.xcstrings` | New | 3 permission strings (en+es); wired to Solennix target |
| `EventosViewModeToggle` | Modified | 4 missing keys added (en+es) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Orphan prune removes a live key | Low | Script verifies zero codebase refs before deletion; `git revert` restores |
| Interpolated format-string positional args (`%1$@`) break | Medium | Preserve positional indices in en+es values; per-key format unit test |
| Extension catalog build-phase wiring | Medium | Verify each target references its own `.xcstrings` in build resources |
| Xcode "stale key" warning | Low | Only affects literal orphans being pruned; non-blocking |

## Rollback Plan

`git revert` of all 3 work-unit commits (T1→T2→T3). Restores `sourceLanguage: es`,
`developmentRegion: es`, and the ~448 pruned orphan keys. Hardcoded-string migration
reverts cleanly (added keys + call-site reverts are independent).

## Dependencies

- B-1 (`ios-system-language`, PR #623) — merged; `en` already in `knownRegions`.

## Success Criteria

- [ ] `sourceLanguage: en` + `developmentRegion: en`; `en-US` device resolves every
      live key to English (no `es` fallback in production paths).
- [ ] ~448 orphan keys removed; catalog = 1,437 live keys, each with `en`+`es`.
- [ ] Zero `Text("Spanish-literal")` in `SolennixFeatures`/Widget/Intents
      (except brand literals + a documented allow-list).
- [ ] `InfoPlist.xcstrings` + Widget/Intents catalogs exist, `sourceLanguage: en`.
- [ ] `xcodebuild test -scheme Solennix` green (373/373).
