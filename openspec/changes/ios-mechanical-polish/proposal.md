# Proposal: iOS Mechanical Polish (AccentColor, Structured Logging, Dynamic Type)

## Intent
Lay three mechanical foundations before the larger localization change (Change B): add an `AccentColor` asset so system controls inherit brand gold for free; replace 25 `print()` calls with structured `os.Logger` output; wrap ~21 fixed-size fonts in `@ScaledMetric` so text honors Dynamic Type. Debt cleanup + accessibility + theming hygiene — **no product behavior change**.

## Scope

### In Scope
- **Track 2 — AccentColor**: create `AccentColor.colorset` (gold `#C4A265`); remove ~38 `.tint(.primary)`/`.tint(.tabBarActive)` accent sites (inherit the asset).
- **Track 3 — Logging**: replace 25 `print()` with `os.Logger` (`.subsystem = "com.solennix.app"`, category per module); route critical paths to Logger/Sentry; delete debug leftovers; English-ize Spanish log strings.
- **Track 4 — Dynamic Type**: wrap ~21 fixed `.font(.system(size:))` sites in `@ScaledMetric(relativeTo:)`.

### Out of Scope
- **Localization (~192 Spanish sites)** → Change B `ios-localization`.
- `knownRegions: en`, `InfoPlist.xcstrings`, `KPIWidget "+12%"` data bug (all Change B).
- Track 1. Any UI behavior change.
- The ~22 font sites already correct via `@ScaledMetric` — **do not touch**.

## Capabilities
### New Capabilities
None — mechanical/debt change; no new product capability.

### Modified Capabilities
None — no existing `openspec/specs/` capability covers iOS theming/logging/accessibility. Spec phase will capture three behavioral acceptance sets (AccentColor inheritance, Dynamic Type scaling, `os.Logger` usage) as delta scenarios.

## Approach
- **AccentColor** = `#C4A265` (accent/glyph only — ~1.9:1 on cream, **not** for text). **NAMING TRAP**: `SolennixColors.accent` = NAVY `#1B2A4A` → those `.tint(.accent)` sites **MUST STAY**. Only GOLD `(.primary)`/`(.tabBarActive)` tints are removable. Keep all semantic tints (`.error/.success/.warning/.info/.blue/.green/.white`, dynamic status colors).
- **Logging**: single `os.Logger` subsystem, category-per-module; critical paths keep message payload + Sentry hook; debug leftovers deleted.
- **Dynamic Type**: icons → `relativeTo: .body` (or capped metric); revenue/count metrics → MUST scale (`relativeTo: .title`/`.largeTitle`); decorative glyphs (splash 96/64, onboarding 120) MAY cap with a max. Widget/intent target fonts wrapped for consistency (lower priority — system-capped).

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `Assets.xcassets/AccentColor.colorset` | New | Brand gold accent asset |
| ~38 `.tint(...)` sites | Removed | Gold tints inherit AccentColor |
| 25 `print(...)` sites (`LiveActivityManager.swift`=15) | Modified | → `os.Logger` / deleted |
| ~21 `.font(.system(size:))` sites | Modified | → `@ScaledMetric` |

**Cross-platform parity**: N/A — iOS-only presentation/infra polish; no domain/DB/API change (AGENTS.md parity trigger not met). Android/Web keep native theming/log/font-scale.

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Stripping a NAVY `.tint(.accent)` by mistake → broken status UI | Med | Use enumeration's exact keep/remove list; grep-diff asserts no `.accent` removal |
| Logger migration loses error context on critical paths | Med | Keep message payload; route critical → Sentry; review each of the 10 critical sites |
| `@ScaledMetric` breaks layout at AX sizes | Med | Device check at AX5; cap decorative glyphs |
| AccentColor value drifts from `primary` | Low | Single source-of-truth constant |

## Rollback Plan
Pure code/asset change, no data migration. `git revert` the change commits; removed `.tint(...)` calls recoverable from diff. No user data affected.

## Dependencies
- Exploration enumeration `sdd/ios-clean-house/explore` (memory #2901) — exact file:line targets.
- Existing Sentry wiring for critical error-path routing.

## Success Criteria
- [ ] `AccentColor.colorset` = `#C4A265`; gold tints removed render identically; navy `.accent` & semantic tints untouched.
- [ ] Zero `print(` in production targets; critical paths logged via `os.Logger` (+Sentry).
- [ ] All previously-fixed fonts scale with Dynamic Type at AX sizes without layout breakage.
- [ ] `./init.sh` green; no new test regressions.
