# Proposal: search-empty-state (iOS)

## Intent

The global Search tab renders a **blank** surface on empty query (`bottom-nav-search` R6). This **reverses R6**: show **Recent Searches** instead — Apple's canonical initial-search state (Maps/Mail/Settings/Music/Contacts/Files). Recents are ~90% built and already persist on every successful search; only the `.bottomNavTab` render is gated off. Activates dormant value at near-zero infra cost.

## Scope

### In Scope
- Render `recentQueries` in the `.bottomNavTab` empty-query state (flip the render gate in `SearchView`).
- Tap a recent → `applySuggestion` + `search()` (re-run; both methods exist).
- "Limpiar" affordance (`clearRecentQueries()`).
- **Onboarding hint** when `recentQueries` is empty (e.g., "Buscá clientes, eventos, productos…"); recents replace it once ≥1 exists.
- **Clear recents on logout** — hook `clearRecentQueries()` into the logout flow (privacy).
- Update `bottom-nav-search` **R6** ("blank" → "recents + hint") as a MODIFIED delta.
- Rewrite `SearchTabEmptyStateTests` (was `cellCount == 0`, no "Sugerencias").

### Out of Scope
- Browsable categories / "browse all" (`GET /api/search?q=` 400s on empty q — no real browse).
- Suggested/trending entities; any backend change; recents sync to backend/iCloud.
- Android / Web parity (separate follow-up deltas).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `bottom-nav-search` — **R6 (Search Empty State)** reversed: blank surface → Recent Searches (cap 6, `clock.arrow.circlepath` icon, "Limpiar"). Note: `bottom-nav-search` is not yet archived to `openspec/specs/`; sdd-spec reconciles R6 against the in-flight change spec.

## Approach

Reuse the existing recents data layer — **no new persistence**. `SearchViewModel` already loads `recentQueries` from `UserDefaults` (`solennix.search.recentQueries`) on init, saves on every successful `search()` (dedup'd, cap 6), and exposes `clearRecentQueries()` / `applySuggestion(_:)` / `querySuggestions`. Flip the render gate so the recents section shows for `.bottomNavTab` (it already does for `.pushed`). **Decision:** unify both contexts to recents for consistency.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `ios/.../Search/Views/SearchView.swift` | Modified | Render recents in `.bottomNavTab` empty-query state |
| `ios/.../Search/ViewModels/SearchViewModel.swift` | Modified (minimal) | Logic exists; maybe a tap-rerun helper |
| `ios/SolennixUITests/SearchTabEmptyStateTests.swift` | Modified | Assert recents render (was `cellCount == 0`) |
| `bottom-nav-search` spec R6 | Modified | Blank → recents (MODIFIED delta) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| R6 + UITest breakage (hard dependency) | High | Modify R6 delta + rewrite test in this same change |
| Stale-recents surprise on first launch | Med | Recents already accumulate → render immediately; flag for QA |
| Privacy (raw query text, device-local) | Low | `UserDefaults.standard`, not iCloud/backend; matches Apple; note for business app |
| Tap-rerun re-hits backend | Low | Expected Apple behavior; same cost as typing |

## Rollback Plan

Revert the `SearchView` render gate to `.pushed`-only; restore R6's "blank" wording and the original `SearchTabEmptyStateTests`. No data migration (recents stay dormant, no schema change).

## Dependencies

- `bottom-nav-search` change (merged) — provides the search tab + R6 being reversed.

## Success Criteria

- [ ] Search tab with empty query shows up to 6 recents (or blank if none — see Open Decisions).
- [ ] Tapping a recent loads the query and returns its results.
- [ ] "Limpiar" clears recents immediately.
- [ ] `SearchTabEmptyStateTests` passes asserting recents render; R6 delta documents the reversal.

## Locked Decisions (review round — RESOLVED)

1. **Recent cap:** keep `maxRecentQueries = 6`.
2. **Persist across launches:** yes (already true).
3. **Clear-on-logout:** **YES** — recents cleared when the user logs out (privacy for a business app; recents are device-local, not user-scoped). Requires hooking `clearRecentQueries()` into the logout flow.
4. **No-recents-yet (new user):** **ONBOARDING HINT** — a brief hint (e.g., "Buscá clientes, eventos, productos…") until the user has at least one recent; then recents replace it.
