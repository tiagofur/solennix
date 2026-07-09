# Proposal: Unify Events + Calendar on iOS

## Intent

Today iOS ships **Events** and **Calendar** as two separate tabs rendering the *same* `Event` list two ways (`eventCard` vs `eventRowContent`), backed by two parallel ViewModels hitting the same `Endpoint.events`. That causes duplication, lands the app at the Apple HIG tab-ceiling (5 tabs incl. `More`), and keeps an iCal export that is a **stale snapshot** drifting the moment a user edits an event. Web already resolved this in "REFACTOR FASE 7C"; iOS has not.

This change unifies both into a single **Eventos** screen with a `Lista | Calendario` view toggle, drops the Calendar tab (5 → 4), and replaces the iCal snapshot with **native EventKit sync** to a user-configurable destination calendar, managed from Settings.

## Scope

### In Scope (iOS only)
- Remove `Tab.calendar` / `SidebarSection.calendar` in `Route.swift` → tabs become `home, events, clients, more`.
- Merge Calendario mode into `EventListView` with a `Lista | Calendario` view toggle in the **content header** (Apple Calendar style).
- Delete `CalendarView`, `CalendarViewModel`, and the duplicated `eventRowContent`.
- Reuse `CalendarGridView`, `BlockDateSheet`, `BlockedDatesSheet`; keep `UnavailableDate` domain + `/unavailable-dates` endpoints.
- Free the Events app bar: the `calendar` filter button is removed; status filter stays.
- Calendar interactions: tap day → filter events; long-press day → block date; period chips `Hoy · Esta semana · Este mes · Personalizado`.
- iPad split layout (grid left + events list right) in landscape; iPhone stacks.
- **New `CalendarSyncPreferencesView`** in Settings (replicates `NotificationPreferencesView` pattern): master toggle "Sincronizar con el calendario del sistema" + **binary** destination selector ("Solennix" default / "Personal").
- Master toggle doubles as the EventKit permission re-prompt surface → guides to system Settings when denied.
- **Auto-migration** on destination change: all synced events move old → new (delete + recreate); runs as a background task for large sets.
- **"Solennix" calendar auto-recreation** if deleted from the system while sync is ON.
- **Personal-calendar-deleted** edge case: show error, ask user to re-choose destination.
- **UI transparency notice** when "Personal" is selected (write-only unidirectional).
- Replace `exportCalendarToFile()` (iCal) with EventKit write-only sync.
- First-run onboarding tip; default opens in **Lista** (no persistence).

### Out of Scope
- **Web** — already unified ("REFACTOR FASE 7C"), untouched *(cross-platform precedent)*.
- **Android** — deferred (EventKit is iOS-only; authorized parity exception).
- Bidirectional EventKit sync; CalDAV/.ics subscription backend.

## Key Decisions (locked)

| Decision | Rationale |
|----------|-----------|
| 5 → 4 tabs; Calendar tab removed | HIG ceiling reached at 5 w/ More; toggle is a *view control*, not a feature |
| Toggle in content header, not app bar | Apple Calendar pattern; frees the `calendar` filter button |
| Reuse grid/block sheets; delete the rest | Removes `eventCard`/`eventRowContent` duplication, preserves block-date UX |
| Keep `UnavailableDate` + `/unavailable-dates` | Block-date domain has no replacement |
| EventKit write-only (Solennix → system) | System-side edits do NOT flow back |
| iCal snapshot export removed | Snapshot drifts; EventKit gives live sync |
| iPad split in landscape | Matches current CalendarView iPad behavior |
| Lista default, no persistence | Predictable entry; no hidden state |
| Returning-user onboarding tip | Tells users where Calendar went |
| **Settings sync screen replicates NotificationPreferences pattern** | Consistent UX: `preferenceToggle`, `.tint(SolennixColors.primary)`, `.solennixRow()` + ViewModel `togglePreference`/`inFlightKeys` |
| **Binary destination: "Solennix" (default) / "Personal"** | Isolation by default; power users can opt into their personal calendar |
| **Implicit sync on each CRUD (no "Sync now" button)** | Live, predictable; destination-change auto-migration covers re-sync |
| **Auto-migration on destination switch** | Transparent UX; no stale events left in the old calendar |
| **Recreate "Solennix" calendar if missing** | Resilience against user/system deletion |

## Approach

A single `EventListView` hosts a `viewMode` state (`.lista | .calendario`). In **Lista** it renders the existing rich `eventCard` with status + period filters. In **Calendario** it renders the reused `CalendarGridView` (with status dots) and — below on iPhone, beside on iPad — the filtered list reusing the *same* `eventCard`; `eventRowContent` is deleted. Day tap applies a date filter; long-press opens `BlockDateSheet`; period chips drive a shared date-range filter.

A new `EventKitSyncService` writes create/edit/delete from the events repository into the chosen destination. When the master sync toggle is ON, every CRUD is **implicitly synced** (no "Sync now"). On destination change, the service **migrates** all previously-synced events: deletes them from the old destination and recreates them in the new one (background task for large sets). If "Solennix" is selected and that calendar is gone, it recreates it; if "Personal" is selected and the default system calendar is gone, it surfaces an error and asks the user to re-choose.

A new **`CalendarSyncPreferencesView`** (Settings, new section/link + `Route.calendarSyncPreferences`) replicates `NotificationPreferencesView`: a `preferenceToggle` master switch that also re-prompts EventKit permission (guiding to system Settings when denied), the binary destination selector, and — when "Personal" is chosen — the unidirectional write-only warning. A `@AppStorage` flag drives the one-time onboarding tip.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `ios/Solennix/Navigation/Route.swift` | Modified | Remove `Tab.calendar` + `SidebarSection.calendar`; add `Route.calendarSyncPreferences` |
| `ios/.../Events/Views/EventListView.swift` | Modified | Absorb Calendario mode + view toggle + period chips + day-tap/long-press |
| `ios/.../Events/ViewModels/EventListViewModel.swift` | Modified | Add `viewMode`, month nav, day filter; consolidate loading |
| `ios/.../Calendar/Views/CalendarView.swift` | **Removed** | Eliminated |
| `ios/.../Calendar/ViewModels/CalendarViewModel.swift` | **Removed** | Eliminated |
| `ios/.../Calendar/Views/{CalendarGridView,BlockDateSheet,BlockedDatesSheet}.swift` | Modified/Moved | Reused by Events |
| `eventRowContent` | **Removed** | Duplicate of `eventCard` |
| `EventKitSyncService` | New → Modified | Dedicated calendar, write-only, **+ destination switching + migration + "Solennix" re-creation** |
| `ios/.../Settings/Views/CalendarSyncPreferencesView.swift` | **New** | Master toggle + binary destination selector; replicates `NotificationPreferencesView` |
| `ios/.../Settings/Views/SettingsView.swift` | Modified | New section/link → `Route.calendarSyncPreferences` |
| `SettingsStrings` / new sync strings | **New** | Localization keys for sync toggle, destinations, write-only warning, errors |
| `exportCalendarToFile()` (iCal) | **Removed** | Replaced by EventKit |
| Onboarding tip view | New | First-run on the unified Eventos screen |
| **Web** | None | Already unified (precedent) |
| **Android** | None (debt) | Deferred — separate change |
| **Backend** | None | `/unavailable-dates` + `/events` unchanged |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| User denies EventKit permission | Med | Graceful degradation: visual Calendario still works; master toggle re-prompts and guides to system Settings |
| Toggle discoverability (users used to a Calendar tab) | Med | First-run onboarding tip; prominent header toggle |
| iPad split layout complexity | Med | Reuse current CalendarView iPad split; cover with snapshot tests |
| Solennix ↔ system EventKit identity mapping | Med | Store `calendarItemIdentifier`; idempotent create/update/delete |
| Long-press conflicts with day-tap navigation | Low | Dedicated `onLongPressGesture` with minimum duration |
| Deleting events from the chosen *personal* calendar | Med | UI transparency warning (write-only); user explicitly opts into "Personal" |
| Migration latency with many events | Med | Run as a background task; surface progress, never block UI |
| Destination calendar deleted mid-run | Low | "Solennix" → recreate; "Personal" → error + re-choose |

**Resolved questions** (previously open):
1. ✅ "Solennix" calendar deleted from the system while running → **auto-recreate** when sync is ON.
2. ✅ Manual "Sync now" vs implicit → **implicit on each CRUD** (no Sync now button); destination-change migration covers re-sync.

## Rollback Plan

`git revert`. The deleted `CalendarView` / `CalendarViewModel` / `eventRowContent` and `Tab.calendar` entry are restored from `main`. EventKit writes are additive — no data migration needed. Users who already have a "Solennix" calendar can delete it manually; migrated events can be recreated by switching the destination back.

## Dependencies

- EventKit framework (iOS only).
- Existing `UnavailableDate` + `/unavailable-dates` and `/events` endpoints (unchanged).
- `NotificationPreferencesView` pattern (`preferenceToggle`, `togglePreference`, `inFlightKeys`).

## Success Criteria

- [ ] App launches with **4 tabs**; no Calendar tab in compact or sidebar layouts.
- [ ] Eventos toggles between Lista and Calendario; both render the **same** events from one ViewModel.
- [ ] `CalendarView`, `CalendarViewModel`, and `eventRowContent` no longer exist.
- [ ] Block/long-press, day-tap filter, period chips, and iPad split all work.
- [ ] EventKit sync writes to the chosen destination; create/edit/delete in Solennix reflect in the system calendar; system edits do NOT flow back.
- [ ] **Master sync toggle works and re-prompts permission** (guides to system Settings when denied).
- [ ] **Binary destination selector works** (Solennix default / Personal).
- [ ] **Auto-migration on destination change** moves all synced events old → new.
- [ ] **"Solennix" calendar recreated** if missing while sync is ON.
- [ ] **"Personal" calendar missing** → error shown + user asked to re-choose.
- [ ] Permission denial degrades gracefully (visual Calendario mode still usable).
- [ ] Returning users see the onboarding tip once; default entry is Lista.
- [ ] `xcodebuild` tests pass (Strict TDD).
